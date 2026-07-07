import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Send, Reply, Sparkles, CalendarCheck, TrendingUp,
  Search, Zap, ArrowRight, Clock, AlertCircle, CheckCircle2, Video,
  Brain, ChevronRight, Activity, Inbox, CalendarClock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/_app/")({ component: Dashboard });

const PIPELINE: { key: string; label: string; statuses: string[] }[] = [
  { key: "discovery", label: "Discovery", statuses: ["new"] },
  { key: "qualified", label: "Qualified", statuses: ["qualified"] },
  { key: "connected", label: "Connected", statuses: ["connected"] },
  { key: "conversation", label: "Conversation", statuses: ["messaged", "replied"] },
  { key: "interested", label: "Interested", statuses: ["interested"] },
  { key: "meeting", label: "Meeting Booked", statuses: ["meeting"] },
  { key: "warm", label: "Warm Client", statuses: ["warm"] },
  { key: "won", label: "Won Client", statuses: ["won"] },
];

function Dashboard() {
  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("full_name, email").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);

      const [
        leads, sent, replied, interested, meetings, activity, allLeads,
        yLeads, yConvos, yMeetings,
      ] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).in("status", ["messaged", "replied", "interested", "meeting", "won", "warm"]),
        supabase.from("leads").select("id", { count: "exact", head: true }).in("status", ["replied", "interested", "meeting", "won", "warm"]),
        supabase.from("leads").select("id", { count: "exact", head: true }).in("status", ["interested", "meeting", "won", "warm"]),
        supabase.from("meetings").select("id", { count: "exact", head: true }),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("leads").select("status"),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startOfYesterday.toISOString()).lt("created_at", startOfToday.toISOString()),
        supabase.from("conversations").select("id", { count: "exact", head: true }).gte("created_at", startOfYesterday.toISOString()).lt("created_at", startOfToday.toISOString()),
        supabase.from("meetings").select("id", { count: "exact", head: true }).gte("created_at", startOfYesterday.toISOString()).lt("created_at", startOfToday.toISOString()),
      ]);

      const total = leads.count ?? 0;
      const s = sent.count ?? 0;
      const r = replied.count ?? 0;
      const w = interested.count ?? 0;

      const counts: Record<string, number> = {};
      (allLeads.data ?? []).forEach((l) => { counts[l.status] = (counts[l.status] ?? 0) + 1; });
      const pipeline = PIPELINE.map((p) => ({
        ...p,
        count: p.statuses.reduce((sum, st) => sum + (counts[st] ?? 0), 0),
      }));

      return {
        total, sent: s, replied: r, interested: w,
        meetings: meetings.count ?? 0,
        replyRate: s ? Math.round((r / s) * 1000) / 10 : 0,
        conversion: total ? Math.round((w / total) * 1000) / 10 : 0,
        activity: activity.data ?? [],
        pipeline,
        yesterday: {
          leads: yLeads.count ?? 0,
          conversations: yConvos.count ?? 0,
          meetings: yMeetings.count ?? 0,
        },
      };
    },
    refetchInterval: 15000,
  });

  const { data: attention, refetch: refetchAttention } = useQuery({
    queryKey: ["needs-attention"],
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, unread, last_message_at, ai_summary, intent, lead:leads(id, full_name, company, avatar_url, status)")
        .or("unread.eq.true,intent.eq.pricing,intent.eq.meeting")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(6);
      return (data ?? []) as unknown as {
        id: string; unread: boolean; last_message_at: string | null; ai_summary: string | null; intent: string | null;
        lead: { id: string; full_name: string; company: string | null; avatar_url: string | null; status: string } | null;
      }[];
    },
    refetchInterval: 15000,
  });

  const { data: upcomingMeetings, refetch: refetchMeetings } = useQuery({
    queryKey: ["upcoming-meetings"],
    queryFn: async () => {
      const now = new Date();
      const { data } = await supabase
        .from("meetings")
        .select("id, scheduled_at, meeting_url, status, duration_min, lead:leads(full_name, company, avatar_url)")
        .gte("scheduled_at", now.toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(3);
      return (data ?? []) as unknown as {
        id: string; scheduled_at: string; meeting_url: string | null; status: string; duration_min: number | null;
        lead: { full_name: string; company: string | null; avatar_url: string | null } | null;
      }[];
    },
    refetchInterval: 30000,
  });

  const { data: focus } = useQuery({
    queryKey: ["today-focus"],
    queryFn: async () => {
      const s = new Date(); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setDate(e.getDate() + 1);
      const now = new Date().toISOString();
      const [meets, unread, overdue, pricing, pending] = await Promise.all([
        supabase.from("meetings").select("id", { count: "exact", head: true }).gte("scheduled_at", s.toISOString()).lt("scheduled_at", e.toISOString()),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("unread", true),
        supabase.from("follow_ups").select("id", { count: "exact", head: true }).eq("status", "pending").lt("scheduled_at", now),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("intent", "pricing"),
        supabase.from("meetings").select("id", { count: "exact", head: true }).eq("status", "scheduled").gte("scheduled_at", s.toISOString()),
      ]);
      return {
        meetings: meets.count ?? 0,
        replies: unread.count ?? 0,
        followUps: overdue.count ?? 0,
        pricing: pricing.count ?? 0,
        confirmations: pending.count ?? 0,
      };
    },
    refetchInterval: 20000,
  });

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => { refetchStats(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => { refetchAttention(); refetchStats(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, () => { refetchMeetings(); refetchStats(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_log" }, () => { refetchStats(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [refetchStats, refetchAttention, refetchMeetings]);

  const firstName = (profile?.full_name ?? profile?.email ?? "there").split(" ")[0];
  const greeting = greetingFor(new Date());
  const summary = buildSummary(stats, attention);

  const kpis: { label: string; value: string; icon: LucideIcon; tint: string }[] = [
    { label: "Leads Found", value: `${stats?.total ?? 0}`, icon: Users, tint: "bg-neutral-100 text-blue-600" },
    { label: "Connections Sent", value: `${stats?.sent ?? 0}`, icon: Send, tint: "bg-indigo-50 text-indigo-600" },
    { label: "Reply Rate", value: `${stats?.replyRate ?? 0}%`, icon: Reply, tint: "bg-amber-50 text-amber-600" },
    { label: "Interested Leads", value: `${stats?.interested ?? 0}`, icon: Sparkles, tint: "bg-fuchsia-50 text-fuchsia-600" },
    { label: "Meetings", value: `${stats?.meetings ?? 0}`, icon: CalendarCheck, tint: "bg-emerald-50 text-emerald-600" },
    { label: "Conversion Rate", value: `${stats?.conversion ?? 0}%`, icon: TrendingUp, tint: "bg-rose-50 text-rose-600" },
  ];

  const focusCards = [
    { label: "Meetings Today", value: focus?.meetings ?? 0, to: "/meetings", cta: "Open calendar", icon: CalendarCheck },
    { label: "Replies Waiting", value: focus?.replies ?? 0, to: "/conversations", cta: "Reply now", icon: Inbox },
    { label: "Follow-ups Due", value: focus?.followUps ?? 0, to: "/followups", cta: "Send follow-ups", icon: Clock },
    { label: "Pricing Questions", value: focus?.pricing ?? 0, to: "/conversations", cta: "Review", icon: AlertCircle },
    { label: "Meeting Confirmations", value: focus?.confirmations ?? 0, to: "/meetings", cta: "Confirm", icon: CheckCircle2 },
  ] as const;

  const insights = buildInsights(stats);
  const maxPipeline = Math.max(1, ...(stats?.pipeline.map((x) => x.count) ?? [1]));

  return (
    <div>
      <PageHeader
        title="Mission Control"
        description="Your AI sales agent, live. Every action, in real time."
        actions={
          <>
            <Button asChild variant="outline" className="h-9 rounded-lg"><Link to="/discovery"><Search className="mr-1.5 h-3.5 w-3.5" />Discover leads</Link></Button>
            <Button asChild className="h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]"><Link to="/brain"><Zap className="mr-1.5 h-3.5 w-3.5" />Sales Brain</Link></Button>
          </>
        }
      />

      <div className="space-y-8 px-8 py-8">
        {/* KPI cards — 6 columns */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => (
            <Card key={k.label} className="rounded-2xl border-border/70">
              <CardContent className="p-5">
                <div className={`inline-grid h-8 w-8 place-items-center rounded-lg ${k.tint}`}><k.icon className="h-4 w-4" /></div>
                <div className="mt-3 text-[22px] font-semibold tracking-tight tabular-nums">{k.value}</div>
                <div className="text-[11.5px] text-muted-foreground">{k.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* SECTION 1 — AI Executive Summary (hero) */}
        <Card className="rounded-2xl border-border/70 bg-gradient-to-br from-neutral-950 to-neutral-800 text-white">
          <CardContent className="p-8">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-white/60">
              <Sparkles className="h-3.5 w-3.5" /> AI Executive Summary
              <span className="ml-auto inline-flex items-center gap-1.5 text-white/70">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
              </span>
            </div>
            <h2 className="mt-4 text-[26px] font-semibold tracking-tight">{greeting}, {firstName}.</h2>
            <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-white/80">{summary}</p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Button asChild className="h-9 rounded-lg bg-white text-black hover:bg-white/90">
                <Link to="/conversations"><ArrowRight className="mr-1.5 h-3.5 w-3.5" />Review today's priorities</Link>
              </Button>
              <Button asChild variant="ghost" className="h-9 rounded-lg text-white/80 hover:bg-white/10 hover:text-white">
                <Link to="/interested">View high-intent leads</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2 — Today's Focus */}
        <div>
          <SectionTitle title="Today's focus" hint="Only what needs your attention right now" />
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {focusCards.map((f) => (
              <Card key={f.label} className="group rounded-2xl border-border/70 transition hover:shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="inline-grid h-8 w-8 place-items-center rounded-lg bg-neutral-100 text-neutral-800"><f.icon className="h-4 w-4" /></div>
                    <div className="text-[24px] font-semibold tabular-nums leading-none">{f.value}</div>
                  </div>
                  <div className="mt-3 text-[12.5px] font-medium">{f.label}</div>
                  <Button asChild size="sm" variant="ghost" className="mt-2 h-7 rounded-md px-2 text-[11.5px] text-neutral-700 hover:bg-neutral-100">
                    <Link to={f.to}>{f.cta}<ChevronRight className="ml-0.5 h-3 w-3" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* SECTION 3 & 4 — Needs Attention + AI Live Activity */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl border-border/70 lg:col-span-2">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <div className="text-[14px] font-semibold">Needs attention</div>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 rounded-md text-[11.5px]">
                  <Link to="/conversations">View all<ChevronRight className="ml-0.5 h-3 w-3" /></Link>
                </Button>
              </div>
              {(attention?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="You're all caught up"
                  hint="The AI will surface leads here as they need you."
                />
              ) : (
                <div className="divide-y divide-border/60">
                  {attention!.map((c) => {
                    const action = recommendedAction(c.intent, c.unread);
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-6 py-4">
                        <Avatar name={c.lead?.full_name ?? "?"} url={c.lead?.avatar_url ?? null} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-[13.5px] font-medium">{c.lead?.full_name}</div>
                            {c.lead?.company && <div className="truncate text-[11.5px] text-muted-foreground">· {c.lead.company}</div>}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <IntentBadge intent={c.intent} unread={c.unread} />
                            <div className="truncate text-[11.5px] text-muted-foreground">{c.ai_summary ?? action.hint}</div>
                          </div>
                        </div>
                        <Button asChild size="sm" className="h-8 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
                          <Link to={action.to}>{action.label}</Link>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <div className="text-[14px] font-semibold">AI live activity</div>
                </div>
                <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Live
                </Badge>
              </div>
              {(stats?.activity.length ?? 0) === 0 ? (
                <EmptyState icon={Activity} title="No activity yet" hint="The AI will start logging actions here shortly." />
              ) : (
                <>
                  <ol className="relative px-5 py-4">
                    <div className="absolute left-[27px] top-4 bottom-4 w-px bg-border/70" />
                    {stats!.activity.map((a) => (
                      <li key={a.id} className="relative flex items-start gap-3 py-2.5">
                        <div className={`z-10 grid h-6 w-6 place-items-center rounded-full ring-4 ring-background ${kindTint(a.kind)}`}>{kindIcon(a.kind)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-mono text-muted-foreground">{timeShort(a.created_at)}</div>
                          <div className="truncate text-[12.5px] font-medium">{a.title}</div>
                          {a.detail && <div className="truncate text-[11.5px] text-muted-foreground">{a.detail}</div>}
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="border-t border-border/60 px-5 py-3">
                    <Button asChild variant="ghost" size="sm" className="h-8 w-full rounded-md text-[12px]">
                      <Link to="/notifications">View all activity<ChevronRight className="ml-0.5 h-3.5 w-3.5" /></Link>
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>


        {/* SECTION 6 & 7 — Upcoming Meetings + AI Insights */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  <div className="text-[14px] font-semibold">Upcoming meetings</div>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 rounded-md text-[11.5px]">
                  <Link to="/meetings">Calendar<ChevronRight className="ml-0.5 h-3 w-3" /></Link>
                </Button>
              </div>
              {(upcomingMeetings?.length ?? 0) === 0 ? (
                <EmptyState icon={CalendarCheck} title="No meetings scheduled" hint="Booked meetings will appear here automatically." />
              ) : (
                <div className="divide-y divide-border/60">
                  {upcomingMeetings!.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-6 py-4">
                      <Avatar name={m.lead?.full_name ?? "?"} url={m.lead?.avatar_url ?? null} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium">{m.lead?.full_name}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                          <span className="truncate">{m.lead?.company ?? "—"}</span>
                          <span>·</span>
                          <span>{formatMeetingTime(m.scheduled_at)}</span>
                          <span>·</span>
                          <span>{platformOf(m.meeting_url)}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`rounded-full text-[10px] ${meetingTint(m.status)}`}>{m.status}</Badge>
                      {m.meeting_url ? (
                        <Button asChild size="sm" className="h-8 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
                          <a href={m.meeting_url} target="_blank" rel="noreferrer"><Video className="mr-1 h-3.5 w-3.5" />Join</a>
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline" className="h-8 rounded-lg">
                          <Link to="/meetings">Details</Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <div className="text-[14px] font-semibold">AI insights</div>
              </div>
              <ul className="mt-4 space-y-3">
                {insights.map((i, idx) => (
                  <li key={idx} className="flex gap-2.5">
                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900" />
                    <div className="text-[12.5px] leading-relaxed text-neutral-700">{i}</div>
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-xl bg-neutral-950 p-4 text-white">
                <div className="text-[10.5px] font-medium uppercase tracking-wider text-white/60">AI recommendation</div>
                <div className="mt-1.5 text-[13px] leading-relaxed">{buildRecommendation(stats)}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between">
      <h3 className="text-[16px] font-semibold tracking-tight">{title}</h3>
      {hint && <div className="text-[11.5px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint: string }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-neutral-100 text-neutral-500">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-3 text-[13px] font-medium">{title}</div>
      <div className="mt-1 max-w-[260px] text-[12px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  if (url) return <img src={url} alt={name} className="h-9 w-9 shrink-0 rounded-full object-cover" />;
  return <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-100 text-[11px] font-semibold text-neutral-700">{initials}</div>;
}

function IntentBadge({ intent, unread }: { intent: string | null; unread: boolean }) {
  if (intent === "pricing") return <Badge className="rounded-full border-amber-200 bg-amber-50 text-amber-700 text-[10px]">Pricing</Badge>;
  if (intent === "meeting") return <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">Meeting</Badge>;
  if (intent === "objection") return <Badge className="rounded-full border-rose-200 bg-rose-50 text-rose-700 text-[10px]">Objection</Badge>;
  if (unread) return <Badge className="rounded-full border-blue-200 bg-blue-50 text-blue-700 text-[10px]">Unread</Badge>;
  return <Badge variant="outline" className="rounded-full text-[10px]">Attention</Badge>;
}

function recommendedAction(intent: string | null, unread: boolean): { label: string; hint: string; to: string } {
  if (intent === "meeting") return { label: "Confirm meeting", hint: "Needs confirmation", to: "/meetings" };
  if (intent === "pricing") return { label: "Reply", hint: "Asked about pricing — reply recommended", to: "/conversations" };
  if (intent === "objection") return { label: "Open conversation", hint: "Address the objection", to: "/conversations" };
  if (unread) return { label: "Open conversation", hint: "New reply waiting", to: "/conversations" };
  return { label: "Send follow-up", hint: "Follow-up overdue", to: "/followups" };
}

function kindTint(k: string) {
  return {
    discovery: "bg-blue-100 text-blue-700",
    message: "bg-indigo-100 text-indigo-700",
    reply: "bg-amber-100 text-amber-700",
    meeting: "bg-emerald-100 text-emerald-700",
    learning: "bg-fuchsia-100 text-fuchsia-700",
    connection: "bg-cyan-100 text-cyan-700",
    system: "bg-neutral-100 text-neutral-700",
  }[k] ?? "bg-neutral-100 text-neutral-700";
}
function kindIcon(k: string) {
  const I = ({ discovery: Search, message: Send, reply: Reply, meeting: CalendarCheck, learning: Sparkles, connection: Users, system: Zap } as Record<string, LucideIcon>)[k] ?? Zap;
  return <I className="h-3 w-3" />;
}
function timeShort(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatMeetingTime(iso: string) {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const meet = new Date(d); meet.setHours(0, 0, 0, 0);
  const prefix = meet.getTime() === today.getTime() ? "Today" : d.toLocaleDateString(undefined, { weekday: "short" });
  return `${prefix} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
function platformOf(url: string | null) {
  if (!url) return "In-person";
  if (url.includes("zoom")) return "Zoom";
  if (url.includes("meet.google")) return "Google Meet";
  if (url.includes("teams")) return "Teams";
  if (url.includes("calendly")) return "Calendly";
  return "Video call";
}
function meetingTint(s: string) {
  return {
    scheduled: "border-blue-200 bg-blue-50 text-blue-700",
    confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    completed: "border-neutral-200 bg-neutral-50 text-neutral-700",
    cancelled: "border-rose-200 bg-rose-50 text-rose-700",
  }[s] ?? "";
}
function greetingFor(d: Date) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
function stageLink(key: string): string {
  switch (key) {
    case "interested": return "/interested";
    case "meeting": return "/meetings";
    case "warm": return "/won";
    case "won": return "/won";
    case "conversation": return "/conversations";
    default: return "/discovery";
  }
}

type Stats = {
  total: number; sent: number; replied: number; interested: number; meetings: number;
  replyRate: number; conversion: number;
  yesterday: { leads: number; conversations: number; meetings: number };
} | undefined;

type Attention = {
  lead: { full_name: string } | null; intent: string | null;
}[] | undefined;

function buildSummary(stats: Stats, attention: Attention) {
  if (!stats) return `Loading your day…`;
  const y = stats.yesterday;
  const parts: string[] = [];
  parts.push(`Yesterday your AI discovered ${y.leads} new lead${y.leads === 1 ? "" : "s"}`);
  parts.push(`started ${y.conversations} conversation${y.conversations === 1 ? "" : "s"}`);
  parts.push(`booked ${y.meetings} meeting${y.meetings === 1 ? "" : "s"}`);
  parts.push(`and identified ${stats.interested} high-intent prospect${stats.interested === 1 ? "" : "s"}`);

  const pricing = (attention ?? []).find((a) => a.intent === "pricing")?.lead?.full_name;
  const meeting = (attention ?? []).find((a) => a.intent === "meeting")?.lead?.full_name;
  let priority = "";
  if (pricing && meeting) {
    priority = `Today's highest priority is following up with ${pricing} and confirming ${meeting}'s meeting.`;
  } else if (pricing) {
    priority = `Today's highest priority is following up with ${pricing} on pricing.`;
  } else if (meeting) {
    priority = `Today's highest priority is confirming ${meeting}'s meeting.`;
  } else if (stats.interested > 0) {
    priority = `Today's priority is nurturing your ${stats.interested} interested lead${stats.interested === 1 ? "" : "s"}.`;
  } else if (stats.replied > 0) {
    priority = `Today's priority is replying to ${stats.replied} active conversation${stats.replied === 1 ? "" : "s"}.`;
  } else {
    priority = `Today's priority is expanding discovery — send outreach to fill the pipeline.`;
  }
  return `${parts.join(", ")}. ${priority}`;
}

function buildInsights(stats: Stats) {
  if (!stats) return ["Gathering data from your recent activity…"];
  const insights: string[] = [];
  if (stats.replyRate > 0) insights.push(`Your reply rate is ${stats.replyRate}% — ${stats.replyRate > 15 ? "above" : "in line with"} B2B benchmarks.`);
  if (stats.conversion > 0) insights.push(`${stats.conversion}% of discovered leads convert to interested — keep refining ICP filters.`);
  if (stats.interested > 0) insights.push(`${stats.interested} lead${stats.interested === 1 ? " is" : "s are"} showing buying intent — prioritize personal outreach.`);
  const h = new Date().getHours();
  insights.push(h < 12 ? "Morning outreach historically converts better than afternoon." : "Afternoon replies tend to move fastest — check your inbox now.");
  if (!insights.length) insights.push("Send your first outreach batch to unlock personalized insights.");
  return insights.slice(0, 4);
}

function buildRecommendation(stats: Stats) {
  if (!stats) return "Working…";
  if (stats.interested > 3) return "Focus this week on booking meetings with your interested pipeline — momentum is strong.";
  if (stats.replyRate > 20) return "Reply rate is excellent. Increase outreach volume by 20% while continuing to target B2B SaaS founders.";
  if (stats.total < 20) return "Expand discovery — target 50+ new ICP leads this week to build a healthier top-of-funnel.";
  return "Keep sending personalized follow-ups. Consistency compounds in outbound.";
}
