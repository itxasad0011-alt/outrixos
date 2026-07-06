import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createGateway, CHAT_MODEL } from "@/lib/ai/gateway.server";

/**
 * Automation Layer
 * ----------------
 * AI Sales Brain never executes LinkedIn actions itself. Every decision is
 * emitted as a structured command in `action_queue`. An external Automation
 * Engine (or the built-in Simulated Worker below) picks up pending rows,
 * performs the LinkedIn action, and reports results back through the queue
 * or via /api/public/webhooks/linkedin.
 */

export type ActionType =
  | "SEND_CONNECTION_REQUEST"
  | "SEND_MESSAGE"
  | "SEND_FOLLOW_UP"
  | "AI_REPLY"
  | "UPDATE_LEAD_STATUS";

// ---------- helpers ----------
function parseJsonLoose<T>(text: string): T | null {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

async function callJson<T>(prompt: string, system?: string): Promise<T | null> {
  const gateway = createGateway();
  const { text } = await generateText({
    model: gateway(CHAT_MODEL),
    system: system ?? "You output only valid JSON. No markdown fences, no commentary.",
    prompt,
  });
  return parseJsonLoose<T>(text);
}

// ============================================================
// 1. Enqueue a full outreach sequence for one lead
// ============================================================
const EnqueueOutreachInput = z.object({ lead_id: z.string().uuid() });

export const enqueueOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EnqueueOutreachInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: lead } = await supabase.from("leads").select("id, full_name, company").eq("id", data.lead_id).eq("user_id", userId).maybeSingle();
    if (!lead) throw new Error("Lead not found");

    const rows = [
      { user_id: userId, lead_id: lead.id, action_type: "SEND_CONNECTION_REQUEST" as ActionType, payload: { note: null } },
      { user_id: userId, lead_id: lead.id, action_type: "SEND_MESSAGE" as ActionType, payload: { kind: "intro" } },
    ];
    const { error } = await supabase.from("action_queue" as never).insert(rows as never);
    if (error) throw error;

    await supabase.from("activity_log").insert({
      user_id: userId, kind: "system", lead_id: lead.id,
      title: `Queued outreach for ${lead.full_name}`,
      detail: "2 actions queued for automation layer",
    });

    return { ok: true, enqueued: rows.length };
  });

// ============================================================
// 2. Enqueue a follow-up for a stalled conversation
// ============================================================
const FollowUpInput = z.object({ lead_id: z.string().uuid(), step: z.number().int().min(1).max(4).default(1) });

export const enqueueFollowUp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FollowUpInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("action_queue" as never).insert({
      user_id: userId, lead_id: data.lead_id,
      action_type: "SEND_FOLLOW_UP" as ActionType,
      payload: { step: data.step },
    } as never);
    if (error) throw error;
    return { ok: true };
  });

// ============================================================
// 3. Simulated Worker — executes N pending actions
// ============================================================
const RunWorkerInput = z.object({ limit: z.number().int().min(1).max(20).default(5) });

type QueueRow = {
  id: string;
  user_id: string;
  lead_id: string | null;
  conversation_id: string | null;
  action_type: ActionType;
  payload: Record<string, unknown>;
};

export const runWorker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RunWorkerInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: pending } = await supabase
      .from("action_queue" as never)
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at")
      .limit(data.limit);

    const rows = (pending ?? []) as unknown as QueueRow[];
    const results: { id: string; ok: boolean; error?: string }[] = [];

    for (const row of rows) {
      try {
        await supabase.from("action_queue" as never).update({ status: "executing" } as never).eq("id", row.id);
        const result = await executeAction(supabase, userId, row);
        await supabase.from("action_queue" as never).update({
          status: "done", result, executed_at: new Date().toISOString(),
        } as never).eq("id", row.id);
        results.push({ id: row.id, ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await supabase.from("action_queue" as never).update({
          status: "failed", error: message, executed_at: new Date().toISOString(),
        } as never).eq("id", row.id);
        results.push({ id: row.id, ok: false, error: message });
      }
    }

    return { ok: true, processed: results.length, results };
  });

// ---------- executor per action type ----------
async function executeAction(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  row: QueueRow,
): Promise<Record<string, unknown>> {
  const [{ data: profile }, { data: brain }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("sales_brain").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  const { data: lead } = row.lead_id
    ? await supabase.from("leads").select("*").eq("id", row.lead_id).maybeSingle()
    : { data: null };

  switch (row.action_type) {
    // ---------- SEND CONNECTION REQUEST ----------
    case "SEND_CONNECTION_REQUEST": {
      if (!lead) throw new Error("Lead missing");
      const prompt = `Write a LinkedIn connection note under 280 characters for ${lead.full_name} (${lead.headline ?? "professional"} at ${lead.company ?? "their company"}).
Tone: ${brain?.tone ?? "professional"}. Sender value prop: ${profile?.value_proposition ?? ""}.
Return JSON: { "note": "..." }`;
      const out = await callJson<{ note: string }>(prompt);
      if (!out) throw new Error("AI failed to draft connection note");

      await supabase.from("leads").update({ status: "connect_sent", last_activity_at: new Date().toISOString() }).eq("id", lead.id);
      await supabase.from("activity_log").insert({
        user_id: userId, kind: "connection", lead_id: lead.id,
        title: `Sent connection request to ${lead.full_name}`,
        detail: out.note,
      });
      return { note: out.note, simulated: true };
    }

    // ---------- SEND INTRO MESSAGE ----------
    case "SEND_MESSAGE": {
      if (!lead) throw new Error("Lead missing");
      const prompt = `Write a first personalized LinkedIn intro message (2-4 short sentences, no hard selling) to ${lead.full_name} (${lead.headline ?? ""} at ${lead.company ?? ""}).
Tone: ${brain?.tone ?? "professional"}. Sender: ${profile?.full_name} — ${profile?.value_proposition ?? ""}. Rules: ${brain?.conversation_rules ?? ""}.
Return JSON: { "message": "..." }`;
      const out = await callJson<{ message: string }>(prompt);
      if (!out) throw new Error("AI failed to draft intro");

      const { data: convo } = await supabase.from("conversations")
        .upsert({ user_id: userId, lead_id: lead.id, last_message_at: new Date().toISOString() }, { onConflict: "user_id,lead_id" })
        .select().single();

      await supabase.from("messages").insert({
        user_id: userId, conversation_id: convo!.id,
        direction: "outbound", author: "ai", body: out.message, kind: "intro",
      });
      await supabase.from("leads").update({ status: "messaged", last_activity_at: new Date().toISOString() }).eq("id", lead.id);
      await supabase.from("activity_log").insert({
        user_id: userId, kind: "message", lead_id: lead.id,
        title: `Sent intro to ${lead.full_name}`, detail: out.message.slice(0, 120),
      });
      return { message: out.message, conversation_id: convo!.id };
    }

    // ---------- SEND FOLLOW-UP ----------
    case "SEND_FOLLOW_UP": {
      if (!lead) throw new Error("Lead missing");
      const step = Number((row.payload as { step?: number }).step ?? 1);
      const { data: convo } = await supabase.from("conversations")
        .select("id").eq("lead_id", lead.id).eq("user_id", userId).maybeSingle();

      const prompt = `Write LinkedIn follow-up #${step} of 4 to ${lead.full_name}. No pressure, add a light value nudge. 2 sentences.
Tone: ${brain?.tone ?? "professional"}. Value prop: ${profile?.value_proposition ?? ""}.
Return JSON: { "message": "..." }`;
      const out = await callJson<{ message: string }>(prompt);
      if (!out) throw new Error("AI failed to draft follow-up");

      if (convo) {
        await supabase.from("messages").insert({
          user_id: userId, conversation_id: convo.id,
          direction: "outbound", author: "ai", body: out.message, kind: "follow_up",
        });
      }
      const nextStatus = step >= 4 ? "not_interested" : "followup_sent";
      await supabase.from("leads").update({ status: nextStatus, last_activity_at: new Date().toISOString() }).eq("id", lead.id);
      await supabase.from("activity_log").insert({
        user_id: userId, kind: "message", lead_id: lead.id,
        title: `Follow-up #${step} sent to ${lead.full_name}`,
        detail: step >= 4 ? "Final follow-up — moved to Not Interested" : undefined,
      });
      return { step, message: out.message };
    }

    // ---------- AI REPLY (triggered by inbound webhook) ----------
    case "AI_REPLY": {
      if (!lead) throw new Error("Lead missing");
      const conversationId = (row.payload as { conversation_id?: string }).conversation_id ?? row.conversation_id;
      if (!conversationId) throw new Error("Conversation missing for AI_REPLY");

      const [{ data: convo }, { data: msgs }] = await Promise.all([
        supabase.from("conversations").select("*").eq("id", conversationId).maybeSingle(),
        supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at"),
      ]);
      if (!convo) throw new Error("Conversation missing");
      const history = (msgs ?? []).map((m) => `${m.author === "lead" ? lead.full_name : "You"}: ${m.body}`).join("\n");
      const calendly = profile?.calendly_url ?? null;

      const prompt = `You are ${profile?.full_name}'s AI sales agent handling a live LinkedIn thread.
Prospect: ${lead.full_name} (${lead.headline ?? ""})
Tone: ${brain?.tone ?? "professional"}. Rules: ${brain?.conversation_rules ?? ""}.
Reply strategy: ${brain?.reply_strategy ?? ""}.
Value prop: ${profile?.value_proposition ?? ""}.
${calendly ? `If pricing is asked or intent is high, invite to book: ${calendly}` : "If pricing is asked, ask to schedule a quick call."}

Conversation so far:
${history}

Return JSON:
{ "reply": "1-3 sentences", "intent": "interested | asking | not_interested | neutral", "ai_summary": "one-line thread summary" }`;

      const out = await callJson<{ reply: string; intent: string; ai_summary: string }>(prompt);
      if (!out) throw new Error("AI failed to draft reply");

      await supabase.from("messages").insert({
        user_id: userId, conversation_id: conversationId,
        direction: "outbound", author: "ai", body: out.reply, kind: "reply",
      });
      await supabase.from("conversations").update({
        intent: out.intent, ai_summary: out.ai_summary, last_message_at: new Date().toISOString(),
      }).eq("id", conversationId);

      const next = out.intent === "interested" ? "interested" : out.intent === "not_interested" ? "not_interested" : "replied";
      await supabase.from("leads").update({ status: next, last_activity_at: new Date().toISOString() }).eq("id", lead.id);

      // Save winning message pattern to AI memory when intent is interested
      if (out.intent === "interested") {
        await supabase.from("ai_memory").insert({
          user_id: userId, category: "winning_message",
          title: `Reply that landed with ${lead.company ?? lead.full_name}`,
          detail: out.reply, weight: 2,
        });
      }
      await supabase.from("activity_log").insert({
        user_id: userId, kind: "reply", lead_id: lead.id,
        title: `AI replied to ${lead.full_name} · ${out.intent}`,
        detail: out.ai_summary,
      });
      return { reply: out.reply, intent: out.intent };
    }

    // ---------- UPDATE LEAD STATUS ----------
    case "UPDATE_LEAD_STATUS": {
      if (!lead) throw new Error("Lead missing");
      const status = String((row.payload as { status?: string }).status ?? "");
      if (!status) throw new Error("status missing");
      await supabase.from("leads").update({ status, last_activity_at: new Date().toISOString() }).eq("id", lead.id);
      return { status };
    }

    default:
      throw new Error(`Unknown action type: ${row.action_type}`);
  }
}

// tiny helper to type the supabase param
type SupabaseCtx = Awaited<ReturnType<typeof getSupabase>>;
function getSupabase() {
  return null as unknown as import("@/integrations/supabase/auth-middleware").AuthedContext["supabase"];
}
void ({} as SupabaseCtx);

// ============================================================
// 4. Simulate inbound reply (dev helper — same effect as webhook)
// ============================================================
const SimulateReplyInput = z.object({ lead_id: z.string().uuid(), body: z.string().optional() });

export const simulateInboundReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SimulateReplyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: lead } = await supabase.from("leads").select("id, full_name").eq("id", data.lead_id).eq("user_id", userId).maybeSingle();
    if (!lead) throw new Error("Lead not found");

    // ensure conversation
    const { data: convo } = await supabase.from("conversations")
      .upsert({ user_id: userId, lead_id: lead.id, last_message_at: new Date().toISOString() }, { onConflict: "user_id,lead_id" })
      .select().single();

    const replyBody = data.body ?? `Interesting — tell me more about how you'd work with ${lead.full_name}'s team.`;
    await supabase.from("messages").insert({
      user_id: userId, conversation_id: convo!.id,
      direction: "inbound", author: "lead", body: replyBody, kind: "reply",
    });

    // log webhook event
    await supabase.from("webhook_events" as never).insert({
      user_id: userId, lead_id: lead.id,
      event_type: "reply_received",
      payload: { body: replyBody, source: "simulated" },
      processed: true,
    } as never);

    // enqueue AI_REPLY
    await supabase.from("action_queue" as never).insert({
      user_id: userId, lead_id: lead.id, conversation_id: convo!.id,
      action_type: "AI_REPLY" as ActionType,
      payload: { conversation_id: convo!.id },
    } as never);

    return { ok: true, conversation_id: convo!.id };
  });
