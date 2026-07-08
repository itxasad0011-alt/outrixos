import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { createGateway, CHAT_MODEL } from "./gateway.server";

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

// ---------- 1. Analyze LinkedIn profile ----------
const AnalyzeInput = z.object({
  linkedin_url: z.string().url().optional(),
  full_name: z.string().optional(),
  headline: z.string().optional(),
  about: z.string().optional(),
});

export const analyzeProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AnalyzeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const prompt = `Analyze this professional's LinkedIn profile and extract deep sales-relevant intelligence.

Name: ${data.full_name ?? "Unknown"}
Headline: ${data.headline ?? ""}
About: ${data.about ?? ""}
URL: ${data.linkedin_url ?? ""}

Return ONLY valid JSON with fields:
{
  "industry": "primary industry, 2-4 words",
  "services": ["service 1", "service 2", "service 3"],
  "target_audience": "one sentence describing ideal customer",
  "value_proposition": "one clear sentence, first person",
  "experience_years": <integer estimate>,
  "skills": ["skill 1", "skill 2", "skill 3", "skill 4", "skill 5"],
  "niche": "specific niche, 3-6 words",
  "offers": ["offer 1", "offer 2"],
  "positioning": "one-sentence market positioning",
  "communication_style": "how this person communicates (e.g. direct, story-driven, data-driven)",
  "outreach_tone": "one of: professional, founder, friendly, consultant, expert",
  "expertise": ["expertise area 1", "expertise area 2", "expertise area 3"],
  "company_summary": "2-3 sentence summary of the company/business",
  "personal_brand_summary": "2-3 sentence personal brand summary",
  "icp": {
    "roles": ["target job titles"],
    "industries": ["target industries"],
    "company_size": "e.g. 10-200",
    "signals": ["buying signals to look for"]
  },
  "messaging_strategy": "3-5 sentences on how to approach prospects",
  "conversation_rules": "bullet list as single string, one rule per line",
  "reply_strategy": "how to handle replies, objections, pricing (push meeting)",
  "followup_logic": "cadence: FU1 after 3d, FU2 after 5d, FU3 after 7d, final after 10d"
}`;

    const result = await callJson<{
      industry: string;
      services: string[];
      target_audience: string;
      value_proposition: string;
      experience_years: number;
      skills: string[];
      niche: string;
      offers: string[];
      positioning: string;
      communication_style: string;
      outreach_tone: string;
      expertise: string[];
      company_summary: string;
      personal_brand_summary: string;
      icp: Record<string, unknown>;
      messaging_strategy: string;
      conversation_rules: string;
      reply_strategy: string;
      followup_logic: string;
    }>(prompt);

    if (!result) throw new Error("AI could not analyze the profile. Try again.");

    const profilePatch = {
      linkedin_url: data.linkedin_url ?? null,
      full_name: data.full_name ?? null,
      headline: data.headline ?? null,
      about: data.about ?? null,
      industry: result.industry,
      services: result.services,
      target_audience: result.target_audience,
      value_proposition: result.value_proposition,
      experience_years: result.experience_years ?? null,
      skills: result.skills ?? null,
      linkedin_connected: true,
    };
    const { error: pErr } = await supabase.from("profiles").update(profilePatch).eq("id", userId);
    if (pErr) throw pErr;

    const brainUpsert = {
      user_id: userId,
      tone: result.outreach_tone || "professional",
      messaging_strategy: result.messaging_strategy,
      icp: result.icp as never,
      conversation_rules: result.conversation_rules,
      reply_strategy: result.reply_strategy,
      followup_logic: result.followup_logic,
      positioning: result.positioning,
      communication_style: result.communication_style,
      outreach_tone: result.outreach_tone,
      expertise: result.expertise,
      skills: result.skills,
      offers: result.offers,
      niche: result.niche,
      company_summary: result.company_summary,
      personal_brand_summary: result.personal_brand_summary,
      generated_at: new Date().toISOString(),
    };
    const { error: bErr } = await supabase
      .from("sales_brain").upsert(brainUpsert, { onConflict: "user_id" });
    if (bErr) throw bErr;

    await supabase.from("profiles").update({ onboarding_complete: true }).eq("id", userId);

    await supabase.from("activity_log").insert({
      user_id: userId,
      kind: "system",
      title: "LinkedIn profile analyzed",
      detail: `AI Sales Brain built · ${result.industry}`,
    });

    return { ok: true };
  });

const PersonalDetailsInput = z.object({
  full_name: z.string().optional(),
  headline: z.string().optional(),
  about: z.string().optional(),
  gender: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

export const savePersonalDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PersonalDetailsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").update(data).eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });


// ---------- 2. Generate Sales Brain ----------
export const generateSalesBrain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: brain }, { data: kb }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("sales_brain").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("knowledge_docs").select("title,content,kind").eq("user_id", userId).limit(20),
    ]);
    if (!profile) throw new Error("Complete your profile first.");

    const prompt = `You are a senior B2B sales strategist. Build a Sales Brain for an AI LinkedIn sales agent representing this user.

USER PROFILE
- Name: ${profile.full_name}
- Industry: ${profile.industry}
- Services: ${(profile.services ?? []).join(", ")}
- Target audience: ${profile.target_audience}
- Value proposition: ${profile.value_proposition}

USER PREFERENCES
- Tone: ${brain?.tone ?? "professional"}
- Website: ${brain?.website ?? "n/a"}
- Custom instructions: ${brain?.custom_instructions ?? "none"}
- Do's: ${(brain?.dos ?? []).join("; ") || "n/a"}
- Don'ts: ${(brain?.donts ?? []).join("; ") || "n/a"}

KNOWLEDGE BASE (${kb?.length ?? 0} items)
${(kb ?? []).map((k) => `- [${k.kind}] ${k.title}`).join("\n") || "empty"}

Return JSON:
{
  "messaging_strategy": "3-5 sentence approach",
  "icp": {
    "roles": ["target job titles"],
    "industries": ["target industries"],
    "company_size": "e.g. 10-200",
    "signals": ["buying signals to look for"]
  },
  "conversation_rules": "bullet list as a single string, one rule per line",
  "reply_strategy": "how to handle replies, objections, pricing questions (push meeting)",
  "followup_logic": "cadence: FU1 after 3d, FU2 after 5d, FU3 after 7d, final after 10d, then move to not_interested"
}`;

    const result = await callJson<{
      messaging_strategy: string;
      icp: Record<string, unknown>;
      conversation_rules: string;
      reply_strategy: string;
      followup_logic: string;
    }>(prompt);
    if (!result) throw new Error("AI could not generate Sales Brain.");

    const upsert = {
      user_id: userId,
      messaging_strategy: result.messaging_strategy,
      icp: result.icp as never,
      conversation_rules: result.conversation_rules,
      reply_strategy: result.reply_strategy,
      followup_logic: result.followup_logic,
      generated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("sales_brain").upsert(upsert, { onConflict: "user_id" });
    if (error) throw error;

    await supabase.from("profiles").update({ onboarding_complete: true }).eq("id", userId);
    await supabase.from("activity_log").insert({
      user_id: userId, kind: "learning",
      title: "Sales Brain generated",
      detail: "Messaging, ICP, conversation rules, follow-up logic ready.",
    });

    return { ok: true };
  });

// ---------- 3. Discover leads (simulated via AI) ----------
const DiscoverInput = z.object({ count: z.number().int().min(1).max(15).default(8) });

type LeadDraft = {
  full_name: string;
  headline: string;
  company: string;
  role: string;
  industry: string;
  icp_score: number;
};

export const discoverLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DiscoverInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: brain }] = await Promise.all([
      supabase.from("profiles").select("industry,target_audience,value_proposition,services").eq("id", userId).maybeSingle(),
      supabase.from("sales_brain").select("icp").eq("user_id", userId).maybeSingle(),
    ]);
    if (!profile?.industry) throw new Error("Analyze your profile first.");

    const prompt = `Generate ${data.count} realistic-looking B2B LinkedIn prospects that match this ICP.

Seller sells: ${(profile.services ?? []).join(", ")} in ${profile.industry}
Target audience: ${profile.target_audience}
ICP: ${JSON.stringify(brain?.icp ?? {})}

Return a JSON array. Each object:
{ "full_name": "First Last", "headline": "Role at Company", "company": "Company", "role": "Job Title", "industry": "Industry", "icp_score": <int 40-98> }

Diverse names, plausible mid-market companies, mostly decision-makers (Head of, Director, VP, Founder, CEO).`;

    const leads = await callJson<LeadDraft[]>(prompt);
    if (!Array.isArray(leads) || leads.length === 0) throw new Error("AI returned no leads.");

    const rows = leads.slice(0, data.count).map((l) => ({
      user_id: userId,
      full_name: l.full_name,
      headline: l.headline,
      company: l.company,
      role: l.role,
      industry: l.industry,
      icp_score: Math.max(0, Math.min(100, Math.round(l.icp_score ?? 60))),
      source: "ai_discovery",
      status: (l.icp_score ?? 60) >= 65 ? "qualified" : "skipped",
      status_reason: (l.icp_score ?? 60) >= 65 ? null : "Low ICP score",
    }));

    const { data: inserted, error } = await supabase.from("leads").insert(rows).select();
    if (error) throw error;

    await supabase.from("activity_log").insert({
      user_id: userId, kind: "discovery",
      title: `Discovered ${inserted?.length ?? 0} new leads`,
      detail: `Avg score ${Math.round(rows.reduce((s, r) => s + r.icp_score, 0) / rows.length)}`,
    });

    return { ok: true, count: inserted?.length ?? 0 };
  });

// ---------- 4. Send first message (creates conversation + connection note + intro) ----------
const OutreachInput = z.object({ lead_id: z.string().uuid() });

export const runOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OutreachInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: lead }, { data: profile }, { data: brain }] = await Promise.all([
      supabase.from("leads").select("*").eq("id", data.lead_id).eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("sales_brain").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    if (!lead) throw new Error("Lead not found");
    if (!profile) throw new Error("Profile missing");

    const prompt = `You are the AI sales agent for ${profile.full_name} (${profile.headline}).
Write a LinkedIn connection note (<=280 chars) AND a first personalized intro message (2-4 short sentences, no hard selling) to this prospect.

PROSPECT: ${lead.full_name} — ${lead.headline} at ${lead.company}
TONE: ${brain?.tone ?? "professional"}
VALUE PROP: ${profile.value_proposition}
STRATEGY: ${brain?.messaging_strategy ?? ""}
RULES: ${brain?.conversation_rules ?? ""}

Return JSON:
{ "connection_note": "...", "intro_message": "..." }`;

    const result = await callJson<{ connection_note: string; intro_message: string }>(prompt);
    if (!result) throw new Error("AI failed to draft messages.");

    const { data: convo, error: cErr } = await supabase
      .from("conversations")
      .upsert({ user_id: userId, lead_id: lead.id, last_message_at: new Date().toISOString() }, { onConflict: "user_id,lead_id" })
      .select().single();
    if (cErr) throw cErr;

    await supabase.from("messages").insert([
      { user_id: userId, conversation_id: convo.id, direction: "outbound", author: "ai", body: result.connection_note, kind: "connection_note" },
      { user_id: userId, conversation_id: convo.id, direction: "outbound", author: "ai", body: result.intro_message, kind: "intro" },
    ]);

    await supabase.from("leads").update({
      status: "messaged",
      last_activity_at: new Date().toISOString(),
    }).eq("id", lead.id);

    await supabase.from("activity_log").insert({
      user_id: userId, kind: "message", lead_id: lead.id,
      title: `Sent intro to ${lead.full_name}`,
      detail: lead.company ?? undefined,
    });

    return { ok: true, connection_note: result.connection_note, intro_message: result.intro_message };
  });

// ---------- 5. Simulate lead reply + AI response ----------
const ReplyInput = z.object({ conversation_id: z.string().uuid() });

export const simulateLeadReplyAndRespond = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReplyInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: convo }, { data: msgs }, { data: profile }, { data: brain }] = await Promise.all([
      supabase.from("conversations").select("*, lead:leads(*)").eq("id", data.conversation_id).eq("user_id", userId).maybeSingle(),
      supabase.from("messages").select("*").eq("conversation_id", data.conversation_id).order("created_at"),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("sales_brain").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    if (!convo?.lead) throw new Error("Conversation not found");

    const history = (msgs ?? []).map((m) => `${m.author === "lead" ? convo.lead.full_name : "You"}: ${m.body}`).join("\n");

    const prompt = `You are simulating a realistic LinkedIn reply from the prospect, then a follow-up response from the seller's AI agent.

PROSPECT: ${convo.lead.full_name} (${convo.lead.headline})
SELLER: ${profile?.full_name} — ${profile?.value_proposition}
BRAIN: tone=${brain?.tone ?? "professional"} · rules=${brain?.conversation_rules ?? ""}
REPLY STRATEGY: ${brain?.reply_strategy ?? ""}

CONVERSATION SO FAR:
${history}

Return JSON:
{
  "lead_reply": "what the prospect writes back (1-3 sentences)",
  "ai_response": "the seller's AI agent's reply (1-3 sentences, follow rules, if pricing asked push meeting)",
  "intent": "interested | asking | no_response | not_interested",
  "ai_summary": "one-line thread summary"
}`;

    const result = await callJson<{
      lead_reply: string; ai_response: string; intent: string; ai_summary: string;
    }>(prompt);
    if (!result) throw new Error("AI failed.");

    await supabase.from("messages").insert([
      { user_id: userId, conversation_id: convo.id, direction: "inbound", author: "lead", body: result.lead_reply, kind: "reply" },
      { user_id: userId, conversation_id: convo.id, direction: "outbound", author: "ai", body: result.ai_response, kind: "reply" },
    ]);

    const nextLeadStatus =
      result.intent === "interested" ? "interested"
      : result.intent === "not_interested" ? "not_interested"
      : "replied";

    await supabase.from("conversations").update({
      intent: result.intent, ai_summary: result.ai_summary,
      last_message_at: new Date().toISOString(),
    }).eq("id", convo.id);

    await supabase.from("leads").update({
      status: nextLeadStatus, last_activity_at: new Date().toISOString(),
    }).eq("id", convo.lead.id);

    await supabase.from("activity_log").insert({
      user_id: userId, kind: "reply", lead_id: convo.lead.id,
      title: `${convo.lead.full_name} replied · ${result.intent}`,
      detail: result.ai_summary,
    });

    return { ok: true, intent: result.intent };
  });

// ---------- 6. Manual: add a lead ----------
const AddLeadInput = z.object({
  full_name: z.string().min(1),
  headline: z.string().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  industry: z.string().optional(),
  linkedin_url: z.string().url().optional().or(z.literal("")),
});

export const addManualLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AddLeadInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("leads").insert({
      user_id: userId,
      source: "manual",
      status: "qualified",
      icp_score: 75,
      ...data,
      linkedin_url: data.linkedin_url || null,
    });
    if (error) throw error;
    return { ok: true };
  });

// ---------- 7. Add knowledge doc ----------
const KbInput = z.object({
  kind: z.enum(["link", "pdf", "doc", "testimonial", "case_study"]),
  title: z.string().min(1),
  url: z.string().optional(),
  content: z.string().optional(),
});
export const addKnowledgeDoc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => KbInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("knowledge_docs").insert({ user_id: context.userId, ...data });
    if (error) throw error;
    return { ok: true };
  });

// ---------- 8. Save Sales Brain preferences ----------
const BrainPrefsInput = z.object({
  tone: z.string(),
  website: z.string().optional(),
  custom_instructions: z.string().optional(),
  dos: z.array(z.string()).optional(),
  donts: z.array(z.string()).optional(),
});
export const saveBrainPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BrainPrefsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sales_brain")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });

// keep NoObjectGeneratedError referenced so tree-shaker keeps the type
void NoObjectGeneratedError;
void Output;
