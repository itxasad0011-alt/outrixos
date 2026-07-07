import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createGateway, CHAT_MODEL } from "./gateway.server";

function parseJsonLoose<T>(text: string): T | null {
  try { return JSON.parse(text); } catch {}
  const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

async function callJson<T>(prompt: string): Promise<T | null> {
  const gateway = createGateway();
  const { text } = await generateText({
    model: gateway(CHAT_MODEL),
    system: "You output only valid JSON. No markdown fences, no commentary.",
    prompt,
  });
  return parseJsonLoose<T>(text);
}

const IdInput = z.object({ lead_id: z.string().uuid() });
const SendConnectionInput = z.object({ lead_id: z.string().uuid(), note: z.string().min(1).max(300) });
const SendIntroInput = z.object({ lead_id: z.string().uuid(), message: z.string().min(1).max(2000) });

// ---------- draft AI connection note ----------
export const draftConnectionNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: lead }, { data: profile }, { data: brain }] = await Promise.all([
      supabase.from("leads").select("*").eq("id", data.lead_id).eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("sales_brain").select("tone,conversation_rules,messaging_strategy").eq("user_id", userId).maybeSingle(),
    ]);
    if (!lead) throw new Error("Lead not found");
    const prompt = `Write a LinkedIn connection request note under 280 characters for ${lead.full_name} (${lead.headline ?? lead.role ?? "professional"} at ${lead.company ?? "their company"}).
Sender: ${profile?.full_name ?? ""} — ${profile?.value_proposition ?? ""}
Tone: ${brain?.tone ?? "professional"}. Rules: ${brain?.conversation_rules ?? ""}.
Warm, human, no hard selling, mention a specific reason to connect.
Return JSON: { "note": "..." }`;
    const out = await callJson<{ note: string }>(prompt);
    if (!out?.note) throw new Error("AI failed to draft note");
    return { note: out.note.slice(0, 280) };
  });

// ---------- draft AI intro message ----------
export const draftIntroMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: lead }, { data: profile }, { data: brain }] = await Promise.all([
      supabase.from("leads").select("*").eq("id", data.lead_id).eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("sales_brain").select("tone,conversation_rules,messaging_strategy,reply_strategy").eq("user_id", userId).maybeSingle(),
    ]);
    if (!lead) throw new Error("Lead not found");
    const prompt = `Write a first personalized LinkedIn intro message (2-4 short sentences, no hard selling) to ${lead.full_name} (${lead.headline ?? ""} at ${lead.company ?? ""}).
Sender: ${profile?.full_name ?? ""} — ${profile?.value_proposition ?? ""}
Tone: ${brain?.tone ?? "professional"}. Strategy: ${brain?.messaging_strategy ?? ""}. Rules: ${brain?.conversation_rules ?? ""}.
Return JSON: { "message": "..." }`;
    const out = await callJson<{ message: string }>(prompt);
    if (!out?.message) throw new Error("AI failed to draft message");
    return { message: out.message };
  });

// ---------- send connection request (queues + records) ----------
export const sendConnectionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendConnectionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: lead } = await supabase.from("leads").select("id, full_name, company").eq("id", data.lead_id).eq("user_id", userId).maybeSingle();
    if (!lead) throw new Error("Lead not found");

    // 1) Queue action for automation layer
    await supabase.from("action_queue" as never).insert({
      user_id: userId, lead_id: lead.id,
      action_type: "SEND_CONNECTION_REQUEST",
      payload: { note: data.note, override: true },
      status: "done",
      result: { note: data.note, source: "user_confirmed" },
      executed_at: new Date().toISOString(),
    } as never);

    // 2) Update lead status
    await supabase.from("leads").update({
      status: "connect_sent",
      last_activity_at: new Date().toISOString(),
    }).eq("id", lead.id);

    // 3) Activity log
    await supabase.from("activity_log").insert({
      user_id: userId, kind: "connection", lead_id: lead.id,
      title: `Sent connection request to ${lead.full_name}`,
      detail: data.note,
    });

    return { ok: true };
  });

// ---------- send intro message (creates conversation + queues) ----------
export const sendIntroMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SendIntroInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: lead } = await supabase.from("leads").select("id, full_name, company").eq("id", data.lead_id).eq("user_id", userId).maybeSingle();
    if (!lead) throw new Error("Lead not found");

    // 1) Ensure conversation
    const { data: convo, error: cErr } = await supabase.from("conversations")
      .upsert({ user_id: userId, lead_id: lead.id, last_message_at: new Date().toISOString() }, { onConflict: "user_id,lead_id" })
      .select().single();
    if (cErr) throw cErr;

    // 2) Insert outbound message
    await supabase.from("messages").insert({
      user_id: userId,
      conversation_id: convo.id,
      direction: "outbound",
      author: "ai",
      body: data.message,
      kind: "intro",
    });

    // 3) Log to action queue as done (user-confirmed send)
    await supabase.from("action_queue" as never).insert({
      user_id: userId, lead_id: lead.id, conversation_id: convo.id,
      action_type: "SEND_MESSAGE",
      payload: { kind: "intro", override: true, message: data.message },
      status: "done",
      result: { message: data.message, source: "user_confirmed" },
      executed_at: new Date().toISOString(),
    } as never);

    // 4) Update lead status
    await supabase.from("leads").update({
      status: "messaged",
      last_activity_at: new Date().toISOString(),
    }).eq("id", lead.id);

    // 5) Activity log
    await supabase.from("activity_log").insert({
      user_id: userId, kind: "message", lead_id: lead.id,
      title: `Sent intro to ${lead.full_name}`,
      detail: data.message.slice(0, 140),
    });

    return { ok: true, conversation_id: convo.id };
  });
