import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowUpRight, TrendingUp, Users, Send, CheckCircle2, MessageSquare,
  Sparkles, Calendar, Zap, Plus, Search, Play, Filter,
} from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

const activity = [
  { d: "Mon", sent: 42, replies: 12, meetings: 2 },
  { d: "Tue", sent: 55, replies: 18, meetings: 3 },
  { d: "Wed", sent: 61, replies: 22, meetings: 4 },
  { d: "Thu", sent: 48, replies: 15, meetings: 3 },
  { d: "Fri", sent: 70, replies: 28, meetings: 6 },
  { d: "Sat", sent: 30, replies: 9, meetings: 1 },
  { d: "Sun", sent: 25, replies: 7, meetings: 2 },
];

const funnel = [
  { stage: "Discovered", value: 1240 },
  { stage: "Queued", value: 820 },
  { stage: "Sent", value: 612 },
  { stage: "Accepted", value: 289 },
  { stage: "Replied", value: 142 },
  { stage: "Interested", value: 48 },
  { stage: "Booked", value: 21 },
];

const kpis = [
  { label: "Leads Found", value: "1,240", delta: "+18.4%", icon: Users, tint: "bg-blue-50 text-blue-600" },
  { label: "Connections Sent", value: "612", delta: "+9.1%", icon: Send, tint: "bg-indigo-50 text-indigo-600" },
  { label: "Acceptance Rate", value: "47.2%", delta: "+3.2%", icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-600" },
  { label: "Reply Rate", value: "23.4%", delta: "+1.8%", icon: MessageSquare, tint: "bg-amber-50 text-amber-600" },
  { label: "Interested", value: "48", delta: "+12", icon: Sparkles, tint: "bg-fuchsia-50 text-fuchsia-600" },
  { label: "Meetings Booked", value: "21", delta: "+6", icon: Calendar, tint: "bg-cyan-50 text-cyan-600" },
  { label: "Conversion", value: "3.4%", delta: "+0.4%", icon: TrendingUp, tint: "bg-rose-50 text-rose-600" },
];

const conversations = [
  { name: "Sarah Chen", role: "Head of Growth · Loom", msg: "Sounds great — Tuesday at 10 works.", intent: "Interested", tone: "emerald" },
  { name: "Marcus Reed", role: "VP Sales · Ramp", msg: "Can you send over pricing details?", intent: "Warm", tone: "amber" },
  { name: "Priya Shah", role: "Founder · Northwind", msg: "Following up on your last note…", intent: "Reply", tone: "blue" },
  { name: "David Ortiz", role: "COO · Vantage", msg: "Not the right time — try Q1.", intent: "Cold", tone: "slate" },
];

const meetings = [
  { name: "Sarah Chen", when: "Today · 10:00", type: "Discovery", accent: "bg-blue-500" },
  { name: "Julia Park", when: "Tomorrow · 14:30", type: "Demo", accent: "bg-emerald-500" },
  { name: "Ethan Wolfe", when: "Fri · 09:00", type: "Follow-up", accent: "bg-amber-500" },
];

function Dashboard() {
  return (
    <div>
      <PageHeader
        title="Good afternoon, Alex"
        description="Your AI agent booked 3 meetings and started 12 new conversations today."
        actions={
          <>
            <Button variant="outline" className="h-9 rounded-xl border-border/70 bg-white text-[12.5px]">
              <Filter className="mr-1.5 h-3.5 w-3.5" /> Last 7 days
            </Button>
            <Button className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New Campaign
            </Button>
          </>
        }
      />

      <div className="space-y-6 p-8">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {kpis.map((k) => (
            <Card key={k.label} className="rounded-2xl border-border/60 bg-white shadow-none transition hover:shadow-md">
              <CardContent className="p-4">
                <div className={`mb-3 grid h-8 w-8 place-items-center rounded-xl ${k.tint}`}>
                  <k.icon className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="text-[11.5px] font-medium text-muted-foreground">{k.label}</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[22px] font-semibold tracking-tight">{k.value}</span>
                  <span className="text-[11px] font-medium text-emerald-600">{k.delta}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Activity chart */}
          <Card className="rounded-2xl border-border/60 bg-white shadow-none lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-[15px] font-semibold">Today's AI activity</CardTitle>
                <p className="mt-1 text-[12px] text-muted-foreground">Outreach volume, replies, and meetings.</p>
              </div>
              <div className="flex gap-1 rounded-xl bg-secondary p-1 text-[11.5px]">
                {["Daily", "Weekly", "Monthly"].map((t, i) => (
                  <button key={t} className={`rounded-lg px-2.5 py-1 font-medium ${i === 0 ? "bg-white shadow-sm" : "text-muted-foreground"}`}>{t}</button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={activity} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="rep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="oklch(0.94 0.005 260)" />
                  <XAxis dataKey="d" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                  <Area type="monotone" dataKey="sent" stroke="#2563EB" strokeWidth={2} fill="url(#sent)" />
                  <Area type="monotone" dataKey="replies" stroke="#10b981" strokeWidth={2} fill="url(#rep)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Lead Funnel */}
          <Card className="rounded-2xl border-border/60 bg-white shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold">Lead funnel</CardTitle>
              <p className="text-[12px] text-muted-foreground">This month</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {funnel.map((s, i) => {
                const pct = (s.value / funnel[0].value) * 100;
                return (
                  <div key={s.stage}>
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span className="font-medium text-foreground">{s.stage}</span>
                      <span className="text-muted-foreground">{s.value.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-indigo-500" style={{ width: `${pct}%`, opacity: 1 - i * 0.08 }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Campaign overview */}
          <Card className="rounded-2xl border-border/60 bg-white shadow-none lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[15px] font-semibold">Campaign overview</CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-7 rounded-lg text-[12px] text-muted-foreground">
                <Link to="/campaigns">View all <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {[
                { name: "Q4 SaaS Founders — US", status: "Active", pct: 72, sent: 148, meetings: 9 },
                { name: "Series A Growth Leaders", status: "Active", pct: 46, sent: 92, meetings: 4 },
                { name: "Fintech Ops — EU", status: "Paused", pct: 88, sent: 210, meetings: 12 },
              ].map((c) => (
                <div key={c.name} className="flex items-center gap-4 rounded-xl border border-border/60 p-3.5 transition hover:bg-secondary/40">
                  <div className={`grid h-9 w-9 place-items-center rounded-xl ${c.status === "Active" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                    <Zap className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium">{c.name}</span>
                      <Badge variant="secondary" className={`h-5 rounded-full text-[10px] ${c.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {c.status}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-[11.5px] text-muted-foreground">
                      <span>{c.sent} sent</span>
                      <span>·</span>
                      <span>{c.meetings} meetings</span>
                    </div>
                  </div>
                  <div className="hidden w-40 md:block">
                    <Progress value={c.pct} className="h-1.5" />
                    <div className="mt-1 text-right text-[10.5px] text-muted-foreground">{c.pct}% of daily limit</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming meetings */}
          <Card className="rounded-2xl border-border/60 bg-white shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-[15px] font-semibold">Upcoming meetings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {meetings.map((m) => (
                <div key={m.name} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                  <div className={`h-9 w-1 rounded-full ${m.accent}`} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{m.name}</div>
                    <div className="text-[11.5px] text-muted-foreground">{m.when} · {m.type}</div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 rounded-lg text-[11.5px]">Join</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent conversations + Quick actions */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl border-border/60 bg-white shadow-none lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[15px] font-semibold">Recent conversations</CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-7 rounded-lg text-[12px] text-muted-foreground">
                <Link to="/conversations">Open inbox</Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="divide-y divide-border/60">
                {conversations.map((c) => (
                  <div key={c.name} className="flex items-center gap-3 py-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-secondary text-[11px] font-medium">{c.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-medium">{c.name}</span>
                        <span className="hidden truncate text-[11.5px] text-muted-foreground md:inline">· {c.role}</span>
                      </div>
                      <div className="truncate text-[12px] text-muted-foreground">{c.msg}</div>
                    </div>
                    <Badge variant="secondary" className={`h-5 rounded-full text-[10.5px] bg-${c.tone}-50 text-${c.tone}-700`}>
                      {c.intent}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-gradient-to-br from-neutral-950 to-neutral-800 text-white shadow-none">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/10">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <CardTitle className="text-[14px] font-semibold text-white">Quick actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {[
                { i: Search, t: "Find new leads", to: "/discovery" },
                { i: Send, t: "Launch outreach", to: "/outreach" },
                { i: Play, t: "Test AI response", to: "/brain" },
                { i: Plus, t: "Create campaign", to: "/campaigns" },
              ].map((a) => (
                <Link key={a.t} to={a.to} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[12.5px] font-medium transition hover:bg-white/10">
                  <a.i className="h-3.5 w-3.5" />
                  {a.t}
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-60" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
