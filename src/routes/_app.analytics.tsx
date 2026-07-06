import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/_app/analytics")({
  component: Analytics,
});

const weekly = Array.from({ length: 12 }, (_, i) => ({
  w: `W${i + 1}`, connections: 120 + Math.round(Math.sin(i) * 30) + i * 4,
  accepted: 55 + Math.round(Math.cos(i) * 15) + i * 2,
  replies: 22 + Math.round(Math.sin(i / 2) * 8) + i,
  meetings: 3 + Math.round(Math.abs(Math.sin(i)) * 3),
}));

const industries = [
  { name: "SaaS", v: 42 }, { name: "Fintech", v: 28 }, { name: "Healthtech", v: 14 },
  { name: "Design", v: 10 }, { name: "Other", v: 6 },
];

function Analytics() {
  return (
    <div>
      <PageHeader title="Analytics" description="Every KPI, every stage, every campaign — all in one place." />
      <div className="grid grid-cols-1 gap-4 p-8 md:grid-cols-2 xl:grid-cols-4">
        {[
          { l: "Connections sent", v: "3,842", d: "+12%" },
          { l: "Acceptance rate", v: "47.2%", d: "+3.1%" },
          { l: "Reply rate", v: "23.4%", d: "+1.8%" },
          { l: "Meeting conversion", v: "3.4%", d: "+0.4%" },
        ].map((k) => (
          <Card key={k.l} className="rounded-2xl border-border/60 bg-white shadow-none">
            <CardContent className="p-5">
              <div className="text-[11.5px] font-medium text-muted-foreground">{k.l}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[24px] font-semibold tracking-tight">{k.v}</span>
                <span className="text-[11.5px] font-medium text-emerald-600">{k.d}</span>
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
          <CardHeader className="pb-2"><CardTitle className="text-[15px] font-semibold">Meetings booked</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
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
          <CardHeader className="pb-2"><CardTitle className="text-[15px] font-semibold">Top industries</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {industries.map((i) => (
              <div key={i.name}>
                <div className="mb-1 flex justify-between text-[12px]"><span className="font-medium">{i.name}</span><span className="text-muted-foreground">{i.v}%</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${i.v}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-[15px] font-semibold">Response time trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weekly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="oklch(0.94 0.005 260)" />
                <XAxis dataKey="w" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                <Line type="monotone" dataKey="replies" stroke="#2563EB" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-[15px] font-semibold">AI accuracy</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-4 pt-4">
            <div className="relative h-24 w-24">
              <svg viewBox="0 0 36 36" className="h-full w-full">
                <circle cx="18" cy="18" r="16" fill="none" stroke="oklch(0.94 0.005 260)" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#2563EB" strokeWidth="3" strokeDasharray="91 100" strokeLinecap="round" transform="rotate(-90 18 18)" />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-[16px] font-semibold">91%</div>
            </div>
            <div className="text-[12px] text-muted-foreground">Intent classification accuracy across 1,240 conversations this quarter.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
