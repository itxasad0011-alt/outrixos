import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * n8n → app callback.
 * n8n POSTs { event_type, campaign_id, lead_id, step_id?, payload }.
 * Auth: HMAC-SHA256 over the raw body using AUTOMATION_WEBHOOK_SECRET
 * in the `x-signature` header (hex). Falls back to matching the
 * shared secret in `x-automation-secret` if signature is absent.
 */
export const Route = createFileRoute("/api/public/webhooks/n8n-events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.AUTOMATION_WEBHOOK_SECRET;
        if (!secret) return new Response("Server not configured", { status: 500 });

        const raw = await request.text();
        const sig = request.headers.get("x-signature");
        const shared = request.headers.get("x-automation-secret");

        let authed = false;
        if (sig) {
          const expected = createHmac("sha256", secret).update(raw).digest("hex");
          const a = Buffer.from(sig);
          const b = Buffer.from(expected);
          if (a.length === b.length && timingSafeEqual(a, b)) authed = true;
        } else if (shared && shared === secret) {
          authed = true;
        }
        if (!authed) return new Response("Unauthorized", { status: 401 });

        let payload: any;
        try { payload = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }

        const { event_type, campaign_id, lead_id, step_id, user_id } = payload ?? {};
        if (!event_type || !campaign_id || !user_id) return new Response("Missing fields", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // record event
        await supabaseAdmin.from("campaign_events").insert({
          campaign_id, lead_id: lead_id ?? null, step_id: step_id ?? null,
          user_id, event_type, payload: payload.data ?? {},
        });

        // update campaign_leads state
        if (lead_id) {
          const patch: any = { last_activity_at: new Date().toISOString() };
          if (event_type === "invite_sent") patch.status = "running";
          if (event_type === "invite_accepted") patch.status = "connected";
          if (event_type === "replied") patch.status = "replied";
          if (event_type === "meeting_booked") patch.status = "meeting_booked";
          if (event_type === "not_interested") patch.status = "not_interested";
          if (event_type === "sequence_completed") patch.status = "completed";
          if (typeof payload.current_step === "number") patch.current_step = payload.current_step;
          await supabaseAdmin.from("campaign_leads")
            .update(patch).eq("campaign_id", campaign_id).eq("lead_id", lead_id);

          // sync lead-level status for CRM pipeline pages
          const leadPatch: any = { last_activity_at: new Date().toISOString() };
          if (event_type === "invite_accepted") leadPatch.status = "connected";
          if (event_type === "replied") leadPatch.status = "replied";
          if (event_type === "meeting_booked") leadPatch.status = "meeting";
          if (event_type === "not_interested") leadPatch.status = "not_interested";
          if (Object.keys(leadPatch).length > 1) {
            await supabaseAdmin.from("leads").update(leadPatch).eq("id", lead_id);
          }

          // On reply, open a conversation row (if not already)
          if (event_type === "replied") {
            const { data: existing } = await supabaseAdmin
              .from("conversations").select("id").eq("lead_id", lead_id).maybeSingle();
            if (!existing) {
              await supabaseAdmin.from("conversations").insert({
                user_id, lead_id, unread: true, last_message_at: new Date().toISOString(),
              });
            }
          }
        }

        // bump campaign activity
        await supabaseAdmin.from("campaigns")
          .update({ last_activity_at: new Date().toISOString() })
          .eq("id", campaign_id);

        return Response.json({ ok: true });
      },
      GET: async () => Response.json({ ok: true, hint: "POST events here" }),
    },
  },
});
