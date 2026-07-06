import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Search, Filter, Plus, X, MapPin, Building2, Briefcase } from "lucide-react";

export const Route = createFileRoute("/_app/discovery")({
  component: LeadDiscovery,
});

const leads = [
  { name: "Sarah Chen", role: "Head of Growth", company: "Loom", loc: "San Francisco, US", score: 94, reason: "Recently raised Series B · Actively hiring GTM · Posted about outbound this week" },
  { name: "Marcus Reed", role: "VP Sales", company: "Ramp", loc: "New York, US", score: 91, reason: "Decision maker in fintech ICP · Engaged with 3 competitors' content" },
  { name: "Priya Shah", role: "Founder & CEO", company: "Northwind", loc: "London, UK", score: 88, reason: "Company grew 42% headcount in 90 days · Matches ideal size" },
  { name: "David Ortiz", role: "COO", company: "Vantage", loc: "Austin, US", score: 84, reason: "Recent job change · Warm intro path via 2nd degree" },
  { name: "Julia Park", role: "Director of RevOps", company: "Blend", loc: "Remote · US", score: 82, reason: "Champions RevOps automation · Wrote about pipeline analytics" },
  { name: "Ethan Wolfe", role: "Head of Partnerships", company: "Cascade", loc: "Toronto, CA", score: 79, reason: "Actively expanding partner program · Matches ICP for integrations" },
];

function LeadDiscovery() {
  return (
    <div>
      <PageHeader
        title="Lead Discovery"
        description="AI-scored prospects that match your ideal customer profile."
        actions={
          <>
            <Button variant="outline" className="h-9 rounded-xl border-border/70 bg-white text-[12.5px]"><Filter className="mr-1.5 h-3.5 w-3.5" /> Saved filters</Button>
            <Button className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]"><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Ask AI to find</Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[280px_1fr]">
        {/* Filters */}
        <Card className="h-fit rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold">Filters</span>
              <button className="text-[11.5px] text-muted-foreground hover:text-foreground">Reset</button>
            </div>
            {[
              { l: "Industry", opts: ["SaaS", "Fintech", "Design", "Healthtech"] },
              { l: "Country", opts: ["United States", "United Kingdom", "Canada", "Germany"] },
              { l: "Company Size", opts: ["1–10", "11–50", "51–200", "201–1000", "1000+"] },
              { l: "Role", opts: ["Founder / CEO", "VP Sales", "Head of Growth", "COO"] },
            ].map((f) => (
              <div key={f.l}>
                <label className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">{f.l}</label>
                <Select>
                  <SelectTrigger className="h-9 rounded-xl border-border/70 text-[12.5px]"><SelectValue placeholder={`Any ${f.l.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>
                    {f.opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="space-y-2 rounded-xl border border-border/60 bg-secondary/40 p-3">
              {["Decision Maker", "Recent Activity (30d)", "Company Growth ↑", "High Lead Score"].map((c) => (
                <label key={c} className="flex items-center gap-2 text-[12.5px]">
                  <Checkbox defaultChecked={c === "Decision Maker"} className="rounded-md" />
                  {c}
                </label>
              ))}
            </div>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">Keywords</label>
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/70 bg-white p-2">
                {["outbound", "series b", "revops"].map((k) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                    {k}<X className="h-3 w-3 cursor-pointer opacity-60" />
                  </span>
                ))}
                <input className="flex-1 bg-transparent text-[12px] outline-none" placeholder="Add…" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Refine results…" className="h-9 rounded-xl border-border/70 bg-white pl-8 text-[13px]" />
            </div>
            <div className="text-[12px] text-muted-foreground">1,240 matches · Sorted by AI score</div>
          </div>

          {leads.map((l) => (
            <Card key={l.name} className="rounded-2xl border-border/60 bg-white shadow-none transition hover:shadow-md">
              <CardContent className="flex items-start gap-4 p-5">
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="bg-gradient-to-br from-slate-200 to-slate-100 text-[12px] font-medium">
                    {l.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold">{l.name}</span>
                    <Badge variant="secondary" className="h-5 rounded-full bg-blue-50 text-[10.5px] text-blue-700">Score {l.score}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{l.role}</span>
                    <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{l.company}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{l.loc}</span>
                  </div>
                  <div className="mt-2.5 rounded-xl border border-border/60 bg-secondary/40 p-2.5 text-[12px] text-foreground">
                    <span className="mr-1.5 inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-blue-700"><Sparkles className="h-3 w-3" />AI</span>
                    {l.reason}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Button size="sm" className="h-8 rounded-xl bg-[#2563EB] text-[12px] hover:bg-[#1d4fd0]"><Plus className="mr-1 h-3.5 w-3.5" />Queue</Button>
                  <Button size="sm" variant="outline" className="h-8 rounded-xl border-border/70 text-[12px]">Save</Button>
                  <button className="text-[11.5px] text-muted-foreground hover:text-foreground">Ignore</button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
