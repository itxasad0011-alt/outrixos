import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Filter } from "lucide-react";

export const Route = createFileRoute("/_app/analytics")({
  component: Analytics,
});

const weekly = Array.from({ length: 12 }, (_, i) => ({
  w: `W${i + 1}`,
  connections: 120 + Math.round(Math.sin(i) * 30) + i * 4,
  accepted: 55 + Math.round(Math.cos(i) * 15) + i * 2,
  replies: 22 + Math.round(Math.sin(i / 2) * 8) + i,
  meetings: 3 + Math.round(Math.abs(Math.sin(i)) * 3),
  won: 1 + Math.round(Math.abs(Math.cos(i)) * 2),
}));

const funnel = [
  { stage: "Leads Found", value: 1240 },
  { stage: "Qualified Leads", value: 820 },
  { stage: "Connections Sent", value: 612 },
  { stage: "Accepted", value: 289 },
  { stage: "Replies", value: 142 },
  { stage: "Meetings", value: 21 },
  { stage: "Won", value: 8 },
];

const kpis = [
  { l: "Leads found", v: "1,240", d: "+12%" },
  { l: "Qualified leads", v: "820", d: "+9%" },
  { l: "Connections sent", v: "612", d: "+11%" },
  { l: "Acceptance rate", v: "47.2%", d: "+3.1%" },
  { l: "Reply rate", v: "23.4%", d: "+1.8%" },
  { l: "Follow-up performance", v: "18.6%", d: "+2.4%" },
  { l: "Meetings booked", v: "21", d: "+6" },
  { l: "Conversion rate", v: "3.4%", d: "+0.4%" },
  { l: "Won deals", v: "8", d: "+2" },
  { l: "Lost deals", v: "12", d: "−3" },
];

function Analytics() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Sales-focused metrics only — no vanity numbers."
        actions={<Button variant="outline" className="h-9 rounded-xl border-border/70 bg-white text-[12.5px]"><Filter className="mr-1.5 h-3.5 w-3.5" />Last 90 days</Button>}
      />
      <div className="grid grid-cols-2 gap-3 p-8 md:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.l} className="rounded-2xl border-border/60 bg-white shadow-none">
            <CardContent className="p-4">
              <div className="text-[11px] font-medium text-muted-foreground">{k.l}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[20px] font-semibold tracking-tight">{k.v}</span>
                <span className={`text-[10.5px] font-medium ${k.d.startsWith("−") ? "text-rose-600" : "text-emerald-600"}`}>{k.d}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 p-8 pt-0 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-[15px] font-semibold">Outreach performance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={weekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="a1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563EB" stopOpacity={0.3} /><stop offset="100%" stopColor="#2563EB" stopOpacity={0} /></linearGradient>
                  <linearGradient id="a2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.25} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="oklch(0.94 0.005 260)" />
                <XAxis dataKey="w" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Area type="monotone" dataKey="connections" stroke="#2563EB" strokeWidth={2} fill="url(#a1)" />
                <Area type="monotone" dataKey="accepted" stroke="#10b981" strokeWidth={2} fill="url(#a2)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-[15px] font-semibold">Sales funnel</CardTitle></CardHeader>
          <CardContent className="space-y-2 pt-2">
            {funnel.map((s, i) => {
              const pct = (s.value / funnel[0].value) * 100;
              return (
                <div key={s.stage}>
                  <div className="mb-1 flex justify-between text-[12px]"><span className="font-medium">{s.stage}</span><span className="text-muted-foreground">{s.value.toLocaleString()}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-indigo-500" style={{ width: `${pct}%`, opacity: 1 - i * 0.08 }} /></div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-[15px] font-semibold">Meetings booked</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="oklch(0.94 0.005 260)" />
                <XAxis dataKey="w" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Bar dataKey="meetings" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-[15px] font-semibold">Won vs lost</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="oklch(0.94 0.005 260)" />
                <XAxis dataKey="w" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Line type="monotone" dataKey="won" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="meetings" stroke="#2563EB" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-[15px] font-semibold">Follow-up performance</CardTitle></CardHeader>
          <CardContent className="space-y-2 pt-2">
            {[
              { l: "Follow-up 1 (Day 2–3)", v: 34 },
              { l: "Follow-up 2 (Day 5–7)", v: 22 },
              { l: "Follow-up 3 (Day 9–12)", v: 14 },
              { l: "Final follow-up", v: 6 },
            ].map((f) => (
              <div key={f.l}>
                <div className="mb-1 flex justify-between text-[12px]"><span className="font-medium">{f.l}</span><span className="text-muted-foreground">{f.v}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${f.v * 2}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
