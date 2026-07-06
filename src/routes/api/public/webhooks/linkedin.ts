import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Inbound Webhook — /api/public/webhooks/linkedin
 *
 * The external Automation Engine POSTs LinkedIn events here whenever
 * something happens on a prospect's account. Requires shared-secret auth
 * via the `x-automation-secret` header (see AUTOMATION_WEBHOOK_SECRET).
 *
 * On `reply_received`, an AI_REPLY action is enqueued automatically so the
 * next worker tick generates and sends the follow-up.
 */

const EventInput = z.object({
  user_id: z.string().uuid(),
  lead_id: z.string().uuid().optional(),
  event_type: z.enum(["connection_accepted", "reply_received", "connection_ignored", "meeting_booked"]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const Route = createFileRoute("/api/public/webhooks/linkedin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.AUTOMATION_WEBHOOK_SECRET;
        if (!secret) return new Response("Server not configured", { status: 500 });

        const provided = request.headers.get("x-automation-secret") ?? "";
        if (provided.length !== secret.length) return new Response("Unauthorized", { status: 401 });
        let ok = 0;
        for (let i = 0; i < secret.length; i++) ok |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
        if (ok !== 0) return new Response("Unauthorized", { status: 401 });

        let raw: unknown;
        try { raw = await request.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
        const parsed = EventInput.safeParse(raw);
        if (!parsed.success) return Response.json({ error: parsed.error.issues }, { status: 400 });
        const evt = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Persist the raw event
        await supabaseAdmin.from("webhook_events").insert({
          user_id: evt.user_id,
          lead_id: evt.lead_id ?? null,
          event_type: evt.event_type,
          payload: evt.payload ?? {},
          processed: false,
        });

        // Apply side effects based on event type
        if (evt.lead_id) {
          if (evt.event_type === "connection_accepted") {
            await supabaseAdmin.from("leads").update({
              status: "connected", last_activity_at: new Date().toISOString(),
            }).eq("id", evt.lead_id);
            await supabaseAdmin.from("activity_log").insert({
              user_id: evt.user_id, kind: "connection", lead_id: evt.lead_id,
              title: "Connection accepted",
            });
          }

          if (evt.event_type === "connection_ignored") {
            await supabaseAdmin.from("leads").update({
              status: "not_interested", last_activity_at: new Date().toISOString(),
            }).eq("id", evt.lead_id);
          }

          if (evt.event_type === "meeting_booked") {
            await supabaseAdmin.from("leads").update({
              status: "meeting", last_activity_at: new Date().toISOString(),
            }).eq("id", evt.lead_id);
            await supabaseAdmin.from("activity_log").insert({
              user_id: evt.user_id, kind: "meeting", lead_id: evt.lead_id,
              title: "Meeting booked", detail: String((evt.payload?.when as string | undefined) ?? ""),
            });
          }

          if (evt.event_type === "reply_received") {
            const body = String((evt.payload?.body as string | undefined) ?? "");
            // ensure conversation
            const { data: convo } = await supabaseAdmin.from("conversations")
              .upsert(
                { user_id: evt.user_id, lead_id: evt.lead_id, last_message_at: new Date().toISOString() },
                { onConflict: "user_id,lead_id" },
              )
              .select().single();
            if (convo && body) {
              await supabaseAdmin.from("messages").insert({
                user_id: evt.user_id, conversation_id: convo.id,
                direction: "inbound", author: "lead", body, kind: "reply",
              });
            }
            // Enqueue AI_REPLY for the worker to process
            if (convo) {
              await supabaseAdmin.from("action_queue").insert({
                user_id: evt.user_id, lead_id: evt.lead_id, conversation_id: convo.id,
                action_type: "AI_REPLY",
                payload: { conversation_id: convo.id },
              });
            }
          }
        }

        await supabaseAdmin.from("webhook_events").update({ processed: true })
          .eq("user_id", evt.user_id).eq("event_type", evt.event_type)
          .order("created_at", { ascending: false }).limit(1);

        return Response.json({ ok: true });
      },
    },
  },
});
