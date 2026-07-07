import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Send, Reply, MessagesSquare, Sparkles, CalendarCheck, TrendingUp,
  Search, Zap, ArrowRight, Clock, AlertCircle, CheckCircle2, Video,
  BookOpen, MessageSquare, Brain, Rocket, ChevronRight, Activity, LineChart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_app/")({ component: Dashboard });

const PIPELINE: { key: string; label: string; statuses: string[] }[] = [
  { key: "discovery", label: "Discovery", statuses: ["new"] },
  { key: "qualified", label: "Qualified", statuses: ["qualified"] },
  { key: "connected", label: "Connected", statuses: ["connected"] },
  { key: "conversation", label: "Conversation", statuses: ["messaged", "replied"] },
  { key: "interested", label: "Interested", statuses: ["interested"] },
  { key: "meeting", label: "Meeting", statuses: ["meeting"] },
  { key: "warm", label: "Warm", statuses: ["warm"] },
  { key: "won", label: "Won", statuses: ["won"] },
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
      const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - 6);
      const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1);

      const [
        leads, sent, replied, interested, meetings, activity, allLeads,
        yLeads, yConvos, yMeetings,
        weekLeads, weekMsgs, weekMeetings,
      ] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).in("status", ["messaged", "replied", "interested", "meeting", "won", "warm"]),
        supabase.from("leads").select("id", { count: "exact", head: true }).in("status", ["replied", "interested", "meeting", "won", "warm"]),
        supabase.from("leads").select("id", { count: "exact", head: true }).in("status", ["interested", "meeting", "won", "warm"]),
        supabase.from("meetings").select("id", { count: "exact", head: true }),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("leads").select("status"),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startOfYesterday.toISOString()).lt("created_at", startOfToday.toISOString()),
        supabase.from("conversations").select("id", { count: "exact", head: true }).gte("created_at", startOfYesterday.toISOString()).lt("created_at", startOfToday.toISOString()),
        supabase.from("meetings").select("id", { count: "exact", head: true }).gte("created_at", startOfYesterday.toISOString()).lt("created_at", startOfToday.toISOString()),
        supabase.from("leads").select("created_at").gte("created_at", startOfWeek.toISOString()),
        supabase.from("messages").select("created_at, direction").gte("created_at", startOfWeek.toISOString()),
        supabase.from("meetings").select("created_at").gte("created_at", startOfWeek.toISOString()),
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

      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek); d.setDate(d.getDate() + i);
        return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { weekday: "short" }) };
      });
      const weekly = days.map(({ key, label }) => {
        const connections = (weekLeads.data ?? []).filter((x) => x.created_at.slice(0, 10) === key).length;
        const replies = (weekMsgs.data ?? []).filter((x) => x.direction === "inbound" && x.created_at.slice(0, 10) === key).length;
        const meets = (weekMeetings.data ?? []).filter((x) => x.created_at.slice(0, 10) === key).length;
        return { day: label, connections, replies, meetings: meets };
      });

      return {
        total, sent: s, replied: r, interested: w,
        meetings: meetings.count ?? 0,
        replyRate: s ? Math.round((r / s) * 1000) / 10 : 0,
        conversion: total ? Math.round((w / total) * 1000) / 10 : 0,
        activity: activity.data ?? [],
        pipeline,
        weekly,
        yesterday: {
          leads: yLeads.count ?? 0,
          conversations: yConvos.count ?? 0,
          meetings: yMeetings.count ?? 0,
          highIntent: (allLeads.data ?? []).filter((l) => (l as { status: string }).status === "interested").length,
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
        .or("unread.eq.true,intent.eq.pricing")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(6);
      return (data ?? []) as unknown as {
        id: string; unread: boolean; last_message_at: string | null; ai_summary: string | null; intent: string | null;
        lead: { id: string; full_name: string; company: string | null; avatar_url: string | null; status: string } | null;
      }[];
    },
    refetchInterval: 15000,
  });

  const { data: todayMeetings, refetch: refetchMeetings } = useQuery({
    queryKey: ["today-meetings"],
    queryFn: async () => {
      const s = new Date(); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setDate(e.getDate() + 2);
      const { data } = await supabase
        .from("meetings")
        .select("id, scheduled_at, meeting_url, status, duration_min, lead:leads(full_name, company, avatar_url)")
        .gte("scheduled_at", s.toISOString())
        .lt("scheduled_at", e.toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(4);
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

  const { data: queueStatus } = useQuery({
    queryKey: ["queue-status"],
    refetchInterval: 8000,
    queryFn: async () => {
      const [pending, done, failed] = await Promise.all([
        supabase.from("action_queue" as never).select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("action_queue" as never).select("id", { count: "exact", head: true }).eq("status", "done"),
        supabase.from("action_queue" as never).select("id", { count: "exact", head: true }).eq("status", "failed"),
      ]);
      const p = pending.count ?? 0, d = done.count ?? 0, f = failed.count ?? 0;
      const total = d + f;
      return { pending: p, success: total ? Math.round((d / total) * 1000) / 10 : 100, healthy: f < d * 0.05 || total === 0 };
    },
  });

  // Realtime — refetch when key tables change
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
  const summary = buildSummary(stats, firstName);

  const kpis: { label: string; value: string; icon: LucideIcon; tint: string }[] = [
    { label: "Leads Found", value: `${stats?.total ?? 0}`, icon: Users, tint: "bg-neutral-100 text-blue-600" },
    { label: "Connections Sent", value: `${stats?.sent ?? 0}`, icon: Send, tint: "bg-indigo-50 text-indigo-600" },
    { label: "Reply Rate", value: `${stats?.replyRate ?? 0}%`, icon: Reply, tint: "bg-amber-50 text-amber-600" },
    { label: "Active Convos", value: `${stats?.replied ?? 0}`, icon: MessagesSquare, tint: "bg-cyan-50 text-cyan-600" },
    { label: "Interested", value: `${stats?.interested ?? 0}`, icon: Sparkles, tint: "bg-fuchsia-50 text-fuchsia-600" },
    { label: "Meetings", value: `${stats?.meetings ?? 0}`, icon: CalendarCheck, tint: "bg-emerald-50 text-emerald-600" },
    { label: "Conversion", value: `${stats?.conversion ?? 0}%`, icon: TrendingUp, tint: "bg-rose-50 text-rose-600" },
  ];

  const focusCards = [
    { label: "Meetings Today", value: focus?.meetings ?? 0, to: "/meetings", cta: "Open calendar", icon: CalendarCheck },
    { label: "Replies Waiting", value: focus?.replies ?? 0, to: "/conversations", cta: "Reply now", icon: MessagesSquare },
    { label: "Follow-ups Due", value: focus?.followUps ?? 0, to: "/followups", cta: "Send follow-ups", icon: Clock },
    { label: "Pricing Questions", value: focus?.pricing ?? 0, to: "/conversations", cta: "Review", icon: AlertCircle },
    { label: "Confirmations Pending", value: focus?.confirmations ?? 0, to: "/meetings", cta: "Confirm", icon: CheckCircle2 },
  ] as const;

  const insights = buildInsights(stats);

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

      <div className="space-y-6 px-8 py-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {kpis.map((k) => (
            <Card key={k.label} className="rounded-2xl border-border/70">
              <CardContent className="p-4">
                <div className={`inline-grid h-8 w-8 place-items-center rounded-lg ${k.tint}`}><k.icon className="h-4 w-4" /></div>
                <div className="mt-3 text-[20px] font-semibold tracking-tight">{k.value}</div>
                <div className="text-[11.5px] text-muted-foreground">{k.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Hero: AI Executive Summary + Automation status */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl border-border/70 bg-gradient-to-br from-neutral-950 to-neutral-800 text-white lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-white/60">
                <Sparkles className="h-3.5 w-3.5" /> AI Executive Summary
                <span className="ml-auto inline-flex items-center gap-1.5 text-white/70">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
                </span>
              </div>
              <h2 className="mt-3 text-[22px] font-semibold tracking-tight">{greeting}, {firstName}.</h2>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-white/80">{summary}</p>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button asChild className="h-9 rounded-lg bg-white text-black hover:bg-white/90">
                  <Link to="/conversations"><ArrowRight className="mr-1.5 h-3.5 w-3.5" />Review today's priorities</Link>
                </Button>
                <Button asChild variant="ghost" className="h-9 rounded-lg text-white/80 hover:bg-white/10 hover:text-white">
                  <Link to="/interested">See high-intent leads</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Automation</div>
                <Badge className={`rounded-full ${queueStatus?.healthy ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                  <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${queueStatus?.healthy ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  {queueStatus?.healthy ? "Healthy" : "Attention"}
                </Badge>
              </div>
              <div className="mt-4 space-y-2.5 text-[13px]">
                <StatusRow label="Worker" value="Online" tone="ok" />
                <StatusRow label="Queue" value={`${queueStatus?.pending ?? 0} pending`} />
                <StatusRow label="Success rate" value={`${queueStatus?.success ?? 100}%`} />
              </div>
              <Button asChild variant="outline" size="sm" className="mt-4 h-8 w-full rounded-lg">
                <Link to="/notifications">View logs<ChevronRight className="ml-1 h-3.5 w-3.5" /></Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Today's focus */}
        <SectionTitle icon={Rocket} title="Today's focus" hint="Only what needs your attention right now" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {focusCards.map((f) => (
            <Card key={f.label} className="group rounded-2xl border-border/70 transition hover:shadow-sm">
              <CardContent className="p-4">
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

        {/* Needs attention + Live activity */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl border-border/70 lg:col-span-2">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <div className="text-[14px] font-semibold">Needs attention</div>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 rounded-md text-[11.5px]">
                  <Link to="/conversations">View all<ChevronRight className="ml-0.5 h-3 w-3" /></Link>
                </Button>
              </div>
              {(attention?.length ?? 0) === 0 ? (
                <div className="grid place-items-center px-6 py-14 text-center text-[13px] text-muted-foreground">
                  You're all caught up. The AI will surface leads here as they need you.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {attention!.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                      <Avatar name={c.lead?.full_name ?? "?"} url={c.lead?.avatar_url ?? null} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-[13px] font-medium">{c.lead?.full_name}</div>
                          {c.lead?.company && <div className="truncate text-[11.5px] text-muted-foreground">· {c.lead.company}</div>}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <IntentBadge intent={c.intent} unread={c.unread} />
                          <div className="truncate text-[11.5px] text-muted-foreground">{c.ai_summary ?? suggestedAction(c.intent)}</div>
                        </div>
                      </div>
                      <Button asChild size="sm" className="h-8 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
                        <Link to="/conversations">Open</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <div className="text-[14px] font-semibold">AI live activity</div>
                </div>
                <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Live
                </Badge>
              </div>
              {(stats?.activity.length ?? 0) === 0 ? (
                <div className="grid place-items-center py-14 text-[13px] text-muted-foreground">No activity yet.</div>
              ) : (
                <ol className="relative px-5 py-4">
                  <div className="absolute left-[27px] top-4 bottom-4 w-px bg-border/70" />
                  {stats!.activity.map((a) => (
                    <li key={a.id} className="relative flex items-start gap-3 py-2">
                      <div className={`z-10 grid h-6 w-6 place-items-center rounded-full ring-4 ring-background ${kindTint(a.kind)}`}>{kindIcon(a.kind)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-mono text-muted-foreground">{timeShort(a.created_at)}</div>
                        <div className="truncate text-[12.5px] font-medium">{a.title}</div>
                        {a.detail && <div className="truncate text-[11.5px] text-muted-foreground">{a.detail}</div>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pipeline overview */}
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-semibold">Sales pipeline</div>
              <div className="text-[11.5px] text-muted-foreground">Click a stage to open the filtered list</div>
            </div>
            <div className="mt-4 flex items-stretch gap-2 overflow-x-auto pb-1">
              {stats?.pipeline.map((p, i) => (
                <>
                  <Link
                    key={p.key}
                    to={stageLink(p.key)}
                    className="group min-w-[130px] flex-1 rounded-xl border border-border/70 bg-white px-3 py-3 transition hover:border-neutral-300 hover:bg-neutral-50"
                  >
                    <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">{p.label}</div>
                    <div className="mt-1 text-[22px] font-semibold tabular-nums leading-none">{p.count}</div>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className="h-full rounded-full bg-neutral-900 transition-all"
                        style={{ width: `${Math.min(100, (p.count / Math.max(1, Math.max(...(stats?.pipeline.map((x) => x.count) ?? [1])))) * 100)}%` }}
                      />
                    </div>
                  </Link>
                  {i < (stats?.pipeline.length ?? 0) - 1 && (
                    <div className="hidden shrink-0 items-center text-muted-foreground xl:flex"><ChevronRight className="h-4 w-4" /></div>
                  )}
                </>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Meetings + Conversation snapshot */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" />
                  <div className="text-[14px] font-semibold">Upcoming meetings</div>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 rounded-md text-[11.5px]">
                  <Link to="/meetings">Calendar<ChevronRight className="ml-0.5 h-3 w-3" /></Link>
                </Button>
              </div>
              {(todayMeetings?.length ?? 0) === 0 ? (
                <div className="grid place-items-center py-14 text-[13px] text-muted-foreground">No meetings today.</div>
              ) : (
                <div className="divide-y divide-border/60">
                  {todayMeetings!.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                      <Avatar name={m.lead?.full_name ?? "?"} url={m.lead?.avatar_url ?? null} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium">{m.lead?.full_name}</div>
                        <div className="truncate text-[11.5px] text-muted-foreground">
                          {m.lead?.company ?? "—"} · {formatMeetingTime(m.scheduled_at)} · {platformOf(m.meeting_url)}
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
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <div className="text-[14px] font-semibold">Conversation snapshot</div>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 rounded-md text-[11.5px]">
                  <Link to="/conversations">Inbox<ChevronRight className="ml-0.5 h-3 w-3" /></Link>
                </Button>
              </div>
              {(attention?.length ?? 0) === 0 ? (
                <div className="grid place-items-center py-14 text-[13px] text-muted-foreground">Inbox is clean.</div>
              ) : (
                <div className="divide-y divide-border/60">
                  {attention!.slice(0, 4).map((c) => (
                    <div key={c.id} className="flex items-start gap-3 px-5 py-3">
                      <Avatar name={c.lead?.full_name ?? "?"} url={c.lead?.avatar_url ?? null} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-[13px] font-medium">{c.lead?.full_name}</div>
                          <div className="ml-auto shrink-0 text-[10.5px] text-muted-foreground">{c.last_message_at ? timeAgo(c.last_message_at) : ""}</div>
                        </div>
                        <div className="truncate text-[11.5px] text-muted-foreground">{c.ai_summary ?? "New activity in conversation"}</div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge variant="outline" className="rounded-full text-[10px]">AI: {suggestedAction(c.intent)}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weekly performance + AI insights */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl border-border/70 lg:col-span-2">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LineChart className="h-4 w-4" />
                  <div className="text-[14px] font-semibold">Weekly performance</div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <LegendDot color="#0A0A0A" label="Connections" />
                  <LegendDot color="#6366F1" label="Replies" />
                  <LegendDot color="#10B981" label="Meetings" />
                </div>
              </div>
              <div className="mt-4 h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats?.weekly ?? []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gConn" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0A0A0A" stopOpacity={0.25} /><stop offset="100%" stopColor="#0A0A0A" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gRep" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6366F1" stopOpacity={0.25} /><stop offset="100%" stopColor="#6366F1" stopOpacity={0} /></linearGradient>
                      <linearGradient id="gMeet" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F1" vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#737373" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#737373" }} width={30} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E5E5", fontSize: 12 }} />
                    <Area type="monotone" dataKey="connections" stroke="#0A0A0A" strokeWidth={2} fill="url(#gConn)" />
                    <Area type="monotone" dataKey="replies" stroke="#6366F1" strokeWidth={2} fill="url(#gRep)" />
                    <Area type="monotone" dataKey="meetings" stroke="#10B981" strokeWidth={2} fill="url(#gMeet)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <div className="text-[14px] font-semibold">AI insights</div>
              </div>
              <ul className="mt-4 space-y-3">
                {insights.map((i, idx) => (
                  <li key={idx} className="flex gap-2.5">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900" />
                    <div className="text-[12.5px] leading-relaxed text-neutral-700">{i}</div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-xl bg-neutral-950 p-3 text-white">
                <div className="text-[10.5px] font-medium uppercase tracking-wider text-white/60">AI recommendation</div>
                <div className="mt-1 text-[12.5px] leading-relaxed">{buildRecommendation(stats)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <SectionTitle icon={Zap} title="Quick actions" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <QuickAction to="/discovery" label="Discover leads" icon={Search} />
          <QuickAction to="/outreach" label="Run outreach" icon={Send} />
          <QuickAction to="/conversations" label="Review conversations" icon={MessagesSquare} />
          <QuickAction to="/knowledge" label="Knowledge base" icon={BookOpen} />
          <QuickAction to="/brain" label="Sales Brain" icon={Brain} />
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function SectionTitle({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between pt-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-neutral-700" />
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
      </div>
      {hint && <div className="text-[11.5px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function StatusRow({ label, value, tone }: { label: string; value: string; tone?: "ok" }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-muted-foreground">{label}</div>
      <div className="flex items-center gap-1.5 font-medium">
        {tone === "ok" && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />}
        {value}
      </div>
    </div>
  );
}

function QuickAction({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) {
  return (
    <Button asChild variant="outline" className="group h-auto justify-start rounded-2xl border-border/70 p-4 hover:border-neutral-300 hover:bg-neutral-50">
      <Link to={to}>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-900 text-white transition group-hover:scale-105">
          <Icon className="h-4 w-4" />
        </div>
        <div className="ml-3 text-left">
          <div className="text-[13px] font-medium text-neutral-900">{label}</div>
          <div className="text-[11px] text-muted-foreground">Open</div>
        </div>
      </Link>
    </Button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</div>;
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

function suggestedAction(intent: string | null) {
  switch (intent) {
    case "pricing": return "Send pricing + case study";
    case "meeting": return "Confirm meeting time";
    case "objection": return "Address the objection";
    case "portfolio": return "Send portfolio";
    default: return "Reply recommended";
  }
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
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
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
  yesterday: { leads: number; conversations: number; meetings: number; highIntent: number };
} | undefined;

function buildSummary(stats: Stats, name: string) {
  if (!stats) return `Loading your day, ${name}…`;
  const y = stats.yesterday;
  const parts: string[] = [];
  parts.push(`Yesterday your AI discovered ${y.leads} new lead${y.leads === 1 ? "" : "s"}`);
  parts.push(`started ${y.conversations} conversation${y.conversations === 1 ? "" : "s"}`);
  parts.push(`booked ${y.meetings} meeting${y.meetings === 1 ? "" : "s"}`);
  parts.push(`and is tracking ${stats.interested} high-intent prospect${stats.interested === 1 ? "" : "s"}`);
  const priority = stats.interested > 0
    ? `Today's priority is following up with your ${stats.interested} interested lead${stats.interested === 1 ? "" : "s"}.`
    : stats.replied > 0
      ? `Today's priority is replying to your ${stats.replied} active conversation${stats.replied === 1 ? "" : "s"}.`
      : `Today's priority is expanding discovery — send outreach to fill the pipeline.`;
  return `${parts.join(", ")}. ${priority}`;
}

function buildInsights(stats: Stats) {
  if (!stats) return ["Gathering data from your recent activity…"];
  const insights: string[] = [];
  if (stats.replyRate > 0) insights.push(`Your reply rate is ${stats.replyRate}% — ${stats.replyRate > 15 ? "above" : "in line with"} B2B benchmarks.`);
  if (stats.conversion > 0) insights.push(`${stats.conversion}% of discovered leads convert to interested — keep refining ICP filters.`);
  const bestDay = [...stats.weekly ?? []].sort((a, b) => b.replies - a.replies)[0];
  if (bestDay && bestDay.replies > 0) insights.push(`${bestDay.day} generated the strongest reply volume this week (${bestDay.replies}).`);
  if (stats.interested > 0) insights.push(`${stats.interested} lead${stats.interested === 1 ? " is" : "s are"} showing buying intent — prioritize personal outreach.`);
  if (!insights.length) insights.push("Send your first outreach batch to unlock personalized insights.");
  return insights.slice(0, 4);
}

function buildRecommendation(stats: Stats) {
  if (!stats) return "Working…";
  if (stats.interested > 3) return "Focus this week on booking meetings with your interested pipeline — momentum is strong.";
  if (stats.replyRate > 20) return "Reply rate is excellent. Increase outreach volume by 30% to compound results.";
  if (stats.total < 20) return "Expand discovery — target 50+ new ICP leads this week to build a healthier top-of-funnel.";
  return "Keep sending personalized follow-ups. Consistency compounds in outbound.";
}

// weekly typing helper
declare module "@tanstack/react-query" {}
