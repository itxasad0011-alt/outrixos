import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Play, Pause, Copy, BarChart3, Search, Zap } from "lucide-react";

export const Route = createFileRoute("/_app/campaigns")({
  component: Campaigns,
});

const campaigns = [
  { name: "Q4 SaaS Founders — US", status: "Active", goal: "Book demos", sent: 148, accepted: 74, replies: 32, meetings: 9, pct: 72 },
  { name: "Series A Growth Leaders", status: "Active", goal: "Discovery calls", sent: 92, accepted: 41, replies: 18, meetings: 4, pct: 46 },
  { name: "Fintech Ops — EU", status: "Paused", goal: "Book demos", sent: 210, accepted: 118, replies: 62, meetings: 12, pct: 88 },
  { name: "Design agencies — remote", status: "Draft", goal: "Partnerships", sent: 0, accepted: 0, replies: 0, meetings: 0, pct: 0 },
];

const statusStyle: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700",
  Paused: "bg-amber-50 text-amber-700",
  Draft: "bg-slate-100 text-slate-600",
};

function Campaigns() {
  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Modular outreach campaigns with ICPs, limits, and follow-up rules."
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search campaigns" className="h-9 w-64 rounded-xl border-border/70 bg-white pl-8 text-[13px]" />
            </div>
            <Button className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Campaign
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 p-8 md:grid-cols-2">
        {campaigns.map((c) => (
          <Card key={c.name} className="rounded-2xl border-border/60 bg-white shadow-none transition hover:shadow-md">
            <CardContent className="p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[14.5px] font-semibold tracking-tight">{c.name}</div>
                      <div className="text-[12px] text-muted-foreground">Goal · {c.goal}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className={`h-6 rounded-full text-[11px] ${statusStyle[c.status]}`}>{c.status}</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem>{c.status === "Active" ? <><Pause className="mr-2 h-3.5 w-3.5" />Pause</> : <><Play className="mr-2 h-3.5 w-3.5" />Activate</>}</DropdownMenuItem>
                      <DropdownMenuItem><Copy className="mr-2 h-3.5 w-3.5" />Duplicate</DropdownMenuItem>
                      <DropdownMenuItem><BarChart3 className="mr-2 h-3.5 w-3.5" />Analytics</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 rounded-xl border border-border/60 bg-secondary/40 p-3">
                {[
                  { l: "Sent", v: c.sent },
                  { l: "Accepted", v: c.accepted },
                  { l: "Replies", v: c.replies },
                  { l: "Meetings", v: c.meetings },
                ].map((s) => (
                  <div key={s.l}>
                    <div className="text-[11px] text-muted-foreground">{s.l}</div>
                    <div className="text-[17px] font-semibold">{s.v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[11.5px]">
                  <span className="text-muted-foreground">Daily limit</span>
                  <span className="font-medium">{c.pct}% · 36 / 50</span>
                </div>
                <Progress value={c.pct} className="h-1.5" />
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {["US", "SaaS", "Series A+", "Founder", "CRO"].map((t) => (
                  <span key={t} className="rounded-lg border border-border/60 bg-white px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">{t}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
