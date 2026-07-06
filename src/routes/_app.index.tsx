import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowUpRight, Users, Send, MessageSquare, MessagesSquare, Sparkles,
  Plus, Filter, Play, Zap, UserCheck, Reply, CalendarCheck, Search,
  Repeat2, TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

const kpis = [
  { label: "Total Leads Found", value: "1,240", delta: "+18.4%", icon: Users, tint: "bg-blue-50 text-blue-600" },
  { label: "Connections Sent", value: "612", delta: "+9.1%", icon: Send, tint: "bg-indigo-50 text-indigo-600" },
  { label: "Reply Rate", value: "23.4%", delta: "+1.8%", icon: Reply, tint: "bg-amber-50 text-amber-600" },
  { label: "Active Conversations", value: "84", delta: "+11", icon: MessagesSquare, tint: "bg-cyan-50 text-cyan-600" },
  { label: "Interested Leads", value: "48", delta: "+12", icon: Sparkles, tint: "bg-fuchsia-50 text-fuchsia-600" },
  { label: "Meetings Booked", value: "21", delta: "+6", icon: CalendarCheck, tint: "bg-emerald-50 text-emerald-600" },
  { label: "Conversion Rate", value: "3.4%", delta: "+0.4%", icon: TrendingUp, tint: "bg-rose-50 text-rose-600" },
];

type FeedItem = { icon: React.ElementType; text: string; time: string; tint: string };
const feed: FeedItem[] = [
  { icon: CalendarCheck, text: "Meeting booked with Sarah Chen · Loom · Tue 10:00", time: "2m", tint: "text-emerald-600 bg-emerald-50" },
  { icon: Reply, text: "Reply received from Marcus Reed · VP Sales @ Ramp", time: "8m", tint: "text-blue-600 bg-blue-50" },
  { icon: Sparkles, text: "AI classified Priya Shah as Interested (94% confidence)", time: "14m", tint: "text-fuchsia-600 bg-fuchsia-50" },
  { icon: Send, text: "Sent connection request to Julia Park · Blend", time: "22m", tint: "text-indigo-600 bg-indigo-50" },
  { icon: Search, text: "AI found 12 new leads matching your ICP", time: "34m", tint: "text-slate-600 bg-slate-100" },
  { icon: Repeat2, text: "Follow-up 2 sent to Ethan Wolfe · Cascade", time: "48m", tint: "text-amber-600 bg-amber-50" },
  { icon: UserCheck, text: "Connection accepted by Nadia Ivanov · Sift", time: "1h", tint: "text-emerald-600 bg-emerald-50" },
  { icon: MessageSquare, text: "AI drafted reply for review · David Ortiz", time: "1h", tint: "text-blue-600 bg-blue-50" },
];

const conversations = [
  { name: "Sarah Chen", role: "Head of Growth · Loom", msg: "Sounds great — Tuesday at 10 works.", intent: "Interested", tint: "bg-emerald-50 text-emerald-700" },
  { name: "Marcus Reed", role: "VP Sales · Ramp", msg: "Can you send over pricing details?", intent: "Warm", tint: "bg-amber-50 text-amber-700" },
  { name: "Priya Shah", role: "Founder · Northwind", msg: "Following up on your last note…", intent: "Reply", tint: "bg-blue-50 text-blue-700" },
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
        description="Your AI booked 3 meetings and started 12 new conversations today."
        actions={
          <>
            <Button variant="outline" className="h-9 rounded-xl border-border/70 bg-white text-[12.5px]">
              <Filter className="mr-1.5 h-3.5 w-3.5" /> Last 7 days
            </Button>
            <Button asChild className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]">
              <Link to="/discovery"><Plus className="mr-1.5 h-3.5 w-3.5" /> Find leads</Link>
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
                <CardTitle className="text-[15px] font-semibold">Sales performance</CardTitle>
                <p className="mt-1 text-[12px] text-muted-foreground">Outreach, replies, and meetings.</p>
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

          {/* AI Activity Feed */}
          <Card className="rounded-2xl border-border/60 bg-white shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <CardTitle className="text-[15px] font-semibold">AI activity · Live</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border/70" />
                <ul className="space-y-3">
                  {feed.map((f, i) => (
                    <li key={i} className="relative flex items-start gap-3">
                      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${f.tint} ring-4 ring-white`}>
                        <f.icon className="h-3.5 w-3.5" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="text-[12.5px] leading-snug text-foreground">{f.text}</div>
                        <div className="mt-0.5 text-[10.5px] text-muted-foreground">{f.time} ago</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Recent conversations */}
          <Card className="rounded-2xl border-border/60 bg-white shadow-none lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-[15px] font-semibold">Recent conversations</CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-7 rounded-lg text-[12px] text-muted-foreground">
                <Link to="/conversations">Open inbox <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
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
                    <Badge variant="secondary" className={`h-5 rounded-full text-[10.5px] ${c.tint}`}>
                      {c.intent}
                    </Badge>
                  </div>
                ))}
              </div>
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

        {/* Quick actions */}
        <Card className="rounded-2xl border-border/60 bg-gradient-to-br from-neutral-950 to-neutral-800 text-white shadow-none">
          <CardContent className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4">
            {[
              { i: Search, t: "Find new leads", to: "/discovery" },
              { i: Send, t: "Launch outreach", to: "/outreach" },
              { i: Play, t: "Test AI response", to: "/brain" },
              { i: Zap, t: "Connect LinkedIn", to: "/integrations" },
            ].map((a) => (
              <Link key={a.t} to={a.to} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[12.5px] font-medium transition hover:bg-white/10">
                <a.i className="h-3.5 w-3.5" />
                {a.t}
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-60" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// keep unused imports satisfied
void Circle;

// Repeat icon alias (lucide has Repeat2)
import { Repeat2 } from "lucide-react";
