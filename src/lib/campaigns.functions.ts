import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createGateway, CHAT_MODEL } from "@/lib/ai/gateway.server";
import { generateText } from "ai";

/* ---------------- Campaigns CRUD ---------------- */

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: campaigns, error } = await supabase
      .from("campaigns").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (campaigns ?? []).map((c) => c.id);
    if (ids.length === 0) return [];
    const { data: cls } = await supabase
      .from("campaign_leads").select("campaign_id,status").in("campaign_id", ids);
    const counts: Record<string, { total: number; completed: number; replied: number }> = {};
    for (const cl of cls ?? []) {
      const c = (counts[cl.campaign_id] ??= { total: 0, completed: 0, replied: 0 });
      c.total++;
      if (cl.status === "completed") c.completed++;
      if (cl.status === "replied" || cl.status === "meeting_booked") c.replied++;
    }
    return (campaigns ?? []).map((c) => ({
      ...c,
      total_leads: counts[c.id]?.total ?? 0,
      completed_leads: counts[c.id]?.completed ?? 0,
      replied_leads: counts[c.id]?.replied ?? 0,
    }));
  });

export const getCampaign = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: campaign, error } = await supabase
      .from("campaigns").select("*").eq("id", data.id).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!campaign) throw new Error("Campaign not found");
    const [{ data: steps }, { data: leads }] = await Promise.all([
      supabase.from("sequence_steps").select("*").eq("campaign_id", data.id).order("step_order"),
      supabase.from("campaign_leads")
        .select("*, lead:leads(*)")
        .eq("campaign_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    return { campaign, steps: steps ?? [], leads: leads ?? [] };
  });

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  sender_account: z.string().max(200).optional(),
  daily_limit: z.number().int().min(1).max(200).default(20),
  working_days: z.array(z.string()).default(["mon","tue","wed","thu","fri"]),
  working_hours_start: z.string().default("09:00"),
  working_hours_end: z.string().default("17:00"),
  timezone: z.string().default("UTC"),
});

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: c, error } = await supabase.from("campaigns")
      .insert({ ...data, user_id: userId }).select("*").single();
    if (error) throw new Error(error.message);
    // seed default 3-step sequence
    await supabase.from("sequence_steps").insert([
      { campaign_id: c.id, user_id: userId, step_order: 1, type: "visit_profile", delay_hours: 0, config: { human_delay: true } },
      { campaign_id: c.id, user_id: userId, step_order: 2, type: "connection_request", delay_hours: 12, config: { note: "" } },
      { campaign_id: c.id, user_id: userId, step_order: 3, type: "message", delay_hours: 48, config: { name: "Intro", body: "" } },
    ]);
    return c;
  });

export const updateCampaignStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["draft","running","paused","completed","archived"]),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("campaigns")
      .update({ status: data.status }).eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  sender_account: z.string().max(200).nullable().optional(),
  daily_limit: z.number().int().min(1).max(200).optional(),
  working_days: z.array(z.string()).optional(),
  working_hours_start: z.string().optional(),
  working_hours_end: z.string().optional(),
  timezone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  favorite: z.boolean().optional(),
});

export const updateCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => updateSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...patch } = data;
    const { error } = await supabase.from("campaigns")
      .update(patch).eq("id", id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("campaigns").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: src } = await supabase.from("campaigns").select("*").eq("id", data.id).eq("user_id", userId).single();
    if (!src) throw new Error("Not found");
    const { data: copy } = await supabase.from("campaigns").insert({
      user_id: userId, name: `${src.name} (Copy)`, description: src.description,
      sender_account: src.sender_account, daily_limit: src.daily_limit,
      working_days: src.working_days, working_hours_start: src.working_hours_start,
      working_hours_end: src.working_hours_end, timezone: src.timezone, status: "draft",
    }).select("*").single();
    const { data: steps } = await supabase.from("sequence_steps").select("*").eq("campaign_id", data.id).order("step_order");
    if (copy && steps?.length) {
      await supabase.from("sequence_steps").insert(steps.map((s) => ({
        campaign_id: copy.id, user_id: userId, step_order: s.step_order,
        type: s.type, delay_hours: s.delay_hours, config: s.config,
      })));
    }
    return copy;
  });

/* ---------------- Sequence ---------------- */

const stepSchema = z.object({
  id: z.string().uuid().optional(),
  step_order: z.number().int(),
  type: z.enum(["visit_profile","connection_request","message"]),
  delay_hours: z.number().int().min(0).max(24 * 30),
  config: z.record(z.string(), z.any()).default({}),
});

export const saveSequence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    campaign_id: z.string().uuid(),
    steps: z.array(stepSchema).min(1).max(20),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("sequence_steps").delete().eq("campaign_id", data.campaign_id).eq("user_id", userId);
    const { error } = await supabase.from("sequence_steps").insert(
      data.steps.map((s) => ({
        campaign_id: data.campaign_id, user_id: userId,
        step_order: s.step_order, type: s.type, delay_hours: s.delay_hours, config: s.config,
      })),
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- AI Message Generation ---------------- */

async function buildBrainContext(supabase: any, userId: string): Promise<string> {
  const [{ data: brain }, { data: docs }] = await Promise.all([
    supabase.from("sales_brain").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("knowledge_docs").select("title,kind,content").eq("user_id", userId).limit(10),
  ]);
  const parts: string[] = [];
  if (brain) {
    if (brain.icp) parts.push(`Ideal customer profile: ${JSON.stringify(brain.icp)}`);
    if (brain.messaging_strategy) parts.push(`Messaging strategy: ${JSON.stringify(brain.messaging_strategy)}`);
    if (brain.tone) parts.push(`Tone: ${brain.tone}`);
    if (brain.dos) parts.push(`Do's: ${JSON.stringify(brain.dos)}`);
    if (brain.donts) parts.push(`Don'ts: ${JSON.stringify(brain.donts)}`);
    if (brain.custom_instructions) parts.push(`Custom instructions: ${brain.custom_instructions}`);
    if (brain.website) parts.push(`Website: ${brain.website}`);
  }
  if (docs?.length) parts.push(`Knowledge:\n${docs.map((d: any) => `- [${d.kind}] ${d.title}: ${(d.content ?? "").slice(0, 200)}`).join("\n")}`);
  return parts.join("\n");
}

export const generateConnectionNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    campaign_id: z.string().uuid(),
    hint: z.string().max(500).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const brain = await buildBrainContext(supabase, userId);
    const gateway = createGateway();
    const { text } = await generateText({
      model: gateway(CHAT_MODEL),
      system: "You write short, human LinkedIn connection notes. Under 280 characters. No emojis. No fluff. Reference the recipient's name/company naturally. Do not include a signature.",
      prompt: `${brain}\n\nWrite a connection note with variables {{first_name}}, {{company}}, {{job_title}} used naturally. ${data.hint ?? ""}`,
    });
    return { text: text.trim().slice(0, 300) };
  });

export const generateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    campaign_id: z.string().uuid(),
    step_order: z.number().int(),
    hint: z.string().max(500).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const brain = await buildBrainContext(supabase, userId);
    const gateway = createGateway();
    const { text } = await generateText({
      model: gateway(CHAT_MODEL),
      system: "You write personal LinkedIn follow-up messages. Warm, brief (60-120 words), one clear ask. No emojis. Use variables like {{first_name}}, {{company}}, {{role}}, {{industry}}, {{headline}} naturally.",
      prompt: `${brain}\n\nWrite message #${data.step_order - 1} of the follow-up sequence. ${data.hint ?? ""}`,
    });
    return { text: text.trim() };
  });

/* ---------------- Lead Import ---------------- */

const leadInputSchema = z.object({
  full_name: z.string().min(1),
  linkedin_url: z.string().url().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  industry: z.string().optional(),
  headline: z.string().optional(),
  country: z.string().optional(),
  company_size: z.string().optional(),
  avatar_url: z.string().url().optional(),
});

export const importLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    campaign_id: z.string().uuid(),
    leads: z.array(leadInputSchema).min(1).max(500),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows = data.leads.map((l) => ({ ...l, user_id: userId, source: "manual_import", status: "new" }));
    const { data: inserted, error } = await supabase.from("leads").insert(rows).select("id");
    if (error) throw new Error(error.message);
    const enrollments = (inserted ?? []).map((l) => ({
      campaign_id: data.campaign_id, lead_id: l.id, user_id: userId, status: "pending",
    }));
    if (enrollments.length) {
      await supabase.from("campaign_leads").insert(enrollments);
    }
    return { count: inserted?.length ?? 0 };
  });

export const importLeadsFromUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    campaign_id: z.string().uuid(),
    urls: z.array(z.string().url()).min(1).max(500),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows = data.urls.map((url) => {
      const slug = url.split("/in/").pop()?.replace(/\/$/, "") ?? "lead";
      const guessName = slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
      return {
        user_id: userId, source: "manual_import", status: "new",
        full_name: guessName, linkedin_url: url,
      };
    });
    const { data: inserted, error } = await supabase.from("leads").insert(rows).select("id");
    if (error) throw new Error(error.message);
    const enrollments = (inserted ?? []).map((l) => ({
      campaign_id: data.campaign_id, lead_id: l.id, user_id: userId, status: "pending",
    }));
    if (enrollments.length) await supabase.from("campaign_leads").insert(enrollments);
    return { count: inserted?.length ?? 0 };
  });

export const removeCampaignLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("campaign_leads").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCampaignLeadPaused = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), paused: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("campaign_leads")
      .update({ paused: data.paused }).eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Launch ---------------- */

export const launchCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: campaign, error } = await supabase.from("campaigns")
      .update({ status: "running", launched_at: new Date().toISOString() })
      .eq("id", data.id).eq("user_id", userId).select("*").single();
    if (error) throw new Error(error.message);

    // Move pending leads to running
    await supabase.from("campaign_leads")
      .update({ status: "running", next_action_at: new Date().toISOString() })
      .eq("campaign_id", data.id).eq("status", "pending");

    // Trigger n8n if configured
    const url = process.env.N8N_TRIGGER_URL;
    if (url) {
      try {
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Automation-Secret": process.env.AUTOMATION_WEBHOOK_SECRET ?? "",
          },
          body: JSON.stringify({ event: "campaign.launched", campaign_id: data.id, user_id: userId }),
        });
      } catch (e) {
        console.error("[n8n] trigger failed", e);
      }
    }
    return { ok: true, campaign, n8n_configured: Boolean(url) };
  });

/* ---------------- Performance ---------------- */

export const getCampaignPerformance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: events }, { data: cls }] = await Promise.all([
      supabase.from("campaign_events").select("event_type,occurred_at")
        .eq("campaign_id", data.id).eq("user_id", userId).order("occurred_at"),
      supabase.from("campaign_leads").select("status,paused").eq("campaign_id", data.id).eq("user_id", userId),
    ]);
    const funnel = { visited: 0, invited: 0, connected: 0, messaged: 0, replied: 0, meetings: 0 };
    const daily: Record<string, number> = {};
    for (const e of events ?? []) {
      const t = e.event_type as string;
      if (t === "visited") funnel.visited++;
      else if (t === "invite_sent") funnel.invited++;
      else if (t === "invite_accepted") funnel.connected++;
      else if (t === "message_sent") funnel.messaged++;
      else if (t === "replied") funnel.replied++;
      else if (t === "meeting_booked") funnel.meetings++;
      const day = (e.occurred_at as string).slice(0, 10);
      daily[day] = (daily[day] ?? 0) + 1;
    }
    const total = cls?.length ?? 0;
    return {
      funnel,
      totals: {
        total,
        acceptance_rate: funnel.invited ? funnel.connected / funnel.invited : 0,
        reply_rate: funnel.messaged ? funnel.replied / funnel.messaged : 0,
        conversion_rate: total ? funnel.meetings / total : 0,
      },
      daily: Object.entries(daily).map(([date, count]) => ({ date, count })),
    };
  });
