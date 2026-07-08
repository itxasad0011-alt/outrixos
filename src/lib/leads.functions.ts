import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";
import { createGateway, CHAT_MODEL } from "./ai/gateway.server";

// ---------- List ----------
const ListInput = z.object({
  search: z.string().optional().default(""),
  sources: z.array(z.string()).optional().default([]),
  statuses: z.array(z.string()).optional().default([]),
  industries: z.array(z.string()).optional().default([]),
  countries: z.array(z.string()).optional().default([]),
  min_score: z.number().min(0).max(100).optional(),
  tags: z.array(z.string()).optional().default([]),
  sort: z.enum(["newest", "oldest", "score", "activity", "name"]).default("newest"),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(10).max(500).default(50),
});

export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase.from("leads").select("*", { count: "exact" }).eq("user_id", userId);

    if (data.search.trim()) {
      const s = data.search.trim().replace(/[,]/g, " ");
      q = q.or(
        [
          `full_name.ilike.%${s}%`,
          `company.ilike.%${s}%`,
          `role.ilike.%${s}%`,
          `job_title.ilike.%${s}%`,
          `industry.ilike.%${s}%`,
          `country.ilike.%${s}%`,
          `email.ilike.%${s}%`,
          `linkedin_url.ilike.%${s}%`,
          `headline.ilike.%${s}%`,
        ].join(","),
      );
    }
    if (data.sources.length) q = q.in("source", data.sources);
    if (data.statuses.length) q = q.in("status", data.statuses);
    if (data.industries.length) q = q.in("industry", data.industries);
    if (data.countries.length) q = q.in("country", data.countries);
    if (typeof data.min_score === "number") q = q.gte("icp_score", data.min_score);
    if (data.tags.length) q = q.contains("tags", data.tags);

    switch (data.sort) {
      case "oldest": q = q.order("created_at", { ascending: true }); break;
      case "score": q = q.order("icp_score", { ascending: false, nullsFirst: false }); break;
      case "activity": q = q.order("last_activity_at", { ascending: false, nullsFirst: false }); break;
      case "name": q = q.order("full_name", { ascending: true }); break;
      default: q = q.order("created_at", { ascending: false });
    }

    const from = (data.page - 1) * data.page_size;
    const to = from + data.page_size - 1;
    q = q.range(from, to);

    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

// ---------- KPIs ----------
export const leadKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ count: total }, { data: byStatus }, { count: convos }, { count: meetings }] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("leads").select("status").eq("user_id", userId),
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("meetings").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);
    const c = (s: string) => (byStatus ?? []).filter((r: any) => r.status === s).length;
    return {
      total: total ?? 0,
      qualified: c("qualified"),
      conversations: convos ?? 0,
      interested: c("interested"),
      meetings: meetings ?? 0,
      won: c("won"),
    };
  });

// ---------- Facets ----------
export const leadFacets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("leads")
      .select("industry,country,tags,source")
      .eq("user_id", userId)
      .limit(5000);
    const industries = new Set<string>();
    const countries = new Set<string>();
    const tags = new Set<string>();
    const sources = new Set<string>();
    (data ?? []).forEach((r: any) => {
      if (r.industry) industries.add(r.industry);
      if (r.country) countries.add(r.country);
      if (r.source) sources.add(r.source);
      (r.tags ?? []).forEach((t: string) => t && tags.add(t));
    });
    return {
      industries: [...industries].sort(),
      countries: [...countries].sort(),
      tags: [...tags].sort(),
      sources: [...sources].sort(),
    };
  });

// ---------- Update ----------
const UpdateInput = z.object({
  id: z.string().uuid(),
  patch: z.object({
    full_name: z.string().optional(),
    company: z.string().optional().nullable(),
    role: z.string().optional().nullable(),
    job_title: z.string().optional().nullable(),
    industry: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    location: z.string().optional().nullable(),
    company_size: z.string().optional().nullable(),
    company_website: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    linkedin_url: z.string().optional().nullable(),
    headline: z.string().optional().nullable(),
    status: z.string().optional(),
    icp_score: z.number().optional(),
    notes: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
  }).partial(),
});

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("leads").update(data.patch).eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Bulk actions ----------
const BulkInput = z.object({
  ids: z.array(z.string().uuid()).min(1),
  action: z.enum(["delete", "archive", "set_status", "add_tags", "remove_tags"]),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const bulkLeadAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BulkInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.action === "delete") {
      const { error } = await supabase.from("leads").delete().in("id", data.ids).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    if (data.action === "archive") {
      const { error } = await supabase.from("leads").update({ status: "archived" }).in("id", data.ids).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    if (data.action === "set_status" && data.status) {
      const { error } = await supabase.from("leads").update({ status: data.status }).in("id", data.ids).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    if ((data.action === "add_tags" || data.action === "remove_tags") && data.tags?.length) {
      const { data: rows } = await supabase.from("leads").select("id,tags").in("id", data.ids).eq("user_id", userId);
      for (const r of rows ?? []) {
        const cur = new Set<string>((r as any).tags ?? []);
        if (data.action === "add_tags") data.tags!.forEach((t) => cur.add(t));
        else data.tags!.forEach((t) => cur.delete(t));
        await supabase.from("leads").update({ tags: [...cur] }).eq("id", (r as any).id).eq("user_id", userId);
      }
      return { ok: true };
    }
    return { ok: true };
  });

// ---------- Add to campaigns (bulk) ----------
const AddToCampaignsInput = z.object({
  lead_ids: z.array(z.string().uuid()).min(1),
  campaign_ids: z.array(z.string().uuid()).min(1),
});
export const addLeadsToCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AddToCampaignsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows: any[] = [];
    for (const cid of data.campaign_ids) {
      for (const lid of data.lead_ids) {
        rows.push({ campaign_id: cid, lead_id: lid, user_id: userId, status: "pending" });
      }
    }
    const { error } = await supabase.from("campaign_leads").upsert(rows, { onConflict: "campaign_id,lead_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { count: rows.length };
  });

// ---------- Import (CSV rows / manual / URLs) with duplicate detection ----------
const LeadRowInput = z.object({
  full_name: z.string().min(1),
  headline: z.string().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  job_title: z.string().optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  location: z.string().optional(),
  company_size: z.string().optional(),
  company_website: z.string().optional(),
  email: z.string().optional(),
  linkedin_url: z.string().optional(),
  avatar_url: z.string().optional(),
  tags: z.array(z.string()).optional(),
  icp_score: z.number().optional(),
});

const ImportInput = z.object({
  source: z.enum(["csv", "linkedin", "manual", "apollo", "crm"]).default("manual"),
  rows: z.array(LeadRowInput).min(1).max(1000),
});

export const importLeadsUnified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ImportInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Fetch existing for duplicate detection
    const { data: existing } = await supabase
      .from("leads")
      .select("id,full_name,company,email,linkedin_url")
      .eq("user_id", userId);

    const byLi = new Map<string, string>();
    const byEmail = new Map<string, string>();
    const byNameCo = new Map<string, string>();
    (existing ?? []).forEach((r: any) => {
      if (r.linkedin_url) byLi.set(r.linkedin_url.toLowerCase(), r.id);
      if (r.email) byEmail.set(r.email.toLowerCase(), r.id);
      const key = `${(r.full_name ?? "").toLowerCase()}|${(r.company ?? "").toLowerCase()}`;
      if (key !== "|") byNameCo.set(key, r.id);
    });

    let inserted = 0, updated = 0;
    for (const raw of data.rows) {
      const row = { ...raw };
      const li = row.linkedin_url?.trim().toLowerCase();
      const em = row.email?.trim().toLowerCase();
      const nameKey = `${row.full_name.toLowerCase()}|${(row.company ?? "").toLowerCase()}`;
      const dupId = (li && byLi.get(li)) || (em && byEmail.get(em)) || byNameCo.get(nameKey) || null;

      const payload: any = {
        full_name: row.full_name,
        headline: row.headline ?? null,
        company: row.company ?? null,
        role: row.role ?? null,
        job_title: row.job_title ?? null,
        industry: row.industry ?? null,
        country: row.country ?? null,
        location: row.location ?? null,
        company_size: row.company_size ?? null,
        company_website: row.company_website ?? null,
        email: row.email ?? null,
        linkedin_url: row.linkedin_url ?? null,
        avatar_url: row.avatar_url ?? null,
        tags: row.tags ?? [],
        icp_score: row.icp_score ?? 60,
      };

      if (dupId) {
        // merge: don't overwrite non-null with null
        const patch: any = {};
        Object.entries(payload).forEach(([k, v]) => {
          if (v != null && !(Array.isArray(v) && v.length === 0)) patch[k] = v;
        });
        await supabase.from("leads").update(patch).eq("id", dupId).eq("user_id", userId);
        updated++;
      } else {
        const { error, data: ins } = await supabase.from("leads").insert({
          ...payload,
          user_id: userId,
          source: data.source,
          status: "new",
        }).select("id").single();
        if (!error && ins) {
          inserted++;
          if (li) byLi.set(li, ins.id);
          if (em) byEmail.set(em, ins.id);
          byNameCo.set(nameKey, ins.id);
        }
      }
    }

    await supabase.from("activity_log").insert({
      user_id: userId, kind: "discovery",
      title: `Imported ${inserted} leads`,
      detail: `Source: ${data.source} · ${updated} updated`,
    });

    return { inserted, updated, total: inserted + updated };
  });

// ---------- LinkedIn URLs → rows ----------
export const importLinkedinUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ urls: z.array(z.string().url()).min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const rows = data.urls.map((url) => {
      const slug = url.split("/in/").pop()?.replace(/\/$/, "") ?? "lead";
      const name = slug.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
      return { full_name: name, linkedin_url: url };
    });
    // Delegate to importLeadsUnified logic inline:
    const { supabase, userId } = context;
    const { data: existing } = await supabase.from("leads")
      .select("id,linkedin_url").eq("user_id", userId).not("linkedin_url", "is", null);
    const set = new Set<string>((existing ?? []).map((r: any) => r.linkedin_url.toLowerCase()));
    const toInsert = rows.filter((r) => !set.has(r.linkedin_url.toLowerCase()))
      .map((r) => ({ ...r, user_id: userId, source: "linkedin", status: "new", icp_score: 60 }));
    let inserted = 0;
    if (toInsert.length) {
      const { data: ins } = await supabase.from("leads").insert(toInsert).select("id");
      inserted = ins?.length ?? 0;
    }
    return { inserted, updated: rows.length - inserted };
  });

// ---------- AI summary ----------
export const generateLeadAiSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: lead } = await supabase.from("leads").select("*").eq("id", data.id).eq("user_id", userId).maybeSingle();
    if (!lead) throw new Error("Lead not found");
    const { data: profile } = await supabase.from("profiles").select("industry,target_audience,value_proposition,services").eq("id", userId).maybeSingle();

    const gateway = createGateway();
    const prompt = `Write a concise 3-5 bullet AI summary of this B2B lead for a salesperson.
Return plain text, one line per bullet, prefixed with "• ".

Seller: ${profile?.value_proposition ?? "B2B services"}
Target: ${profile?.target_audience ?? "founders and execs"}

Lead:
- Name: ${lead.full_name}
- Role: ${lead.role ?? lead.job_title ?? "?"}
- Company: ${lead.company ?? "?"} (${lead.company_size ?? "?"}, ${lead.industry ?? "?"})
- Location: ${lead.location ?? lead.country ?? "?"}
- Headline: ${lead.headline ?? "?"}
- ICP score: ${lead.icp_score ?? "?"}
`;
    const { text } = await generateText({ model: gateway(CHAT_MODEL), prompt });
    await supabase.from("leads").update({ ai_summary: text }).eq("id", lead.id);
    return { ai_summary: text };
  });

// ---------- Delete single ----------
export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("leads").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Timeline ----------
export const leadTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: acts }, { data: convo }, { data: msgs }, { data: enrolls }] = await Promise.all([
      supabase.from("activity_log").select("*").eq("user_id", userId).eq("lead_id", data.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("conversations").select("*").eq("user_id", userId).eq("lead_id", data.id).order("last_message_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
      supabase.from("messages").select("*").eq("user_id", userId).limit(0),
      supabase.from("campaign_leads").select("id,status,current_step,paused,campaign:campaigns(id,name,status)").eq("user_id", userId).eq("lead_id", data.id),
    ]);
    void msgs;
    return { activity: acts ?? [], conversation: convo, campaigns: enrolls ?? [] };
  });
