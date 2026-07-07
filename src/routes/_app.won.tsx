import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Trophy, Flame, CalendarPlus, XCircle, TrendingUp } from "lucide-react";
import { LeadCard, LeadDrawer, type Lead } from "@/components/lead-drawer";

function WarmClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "score" | "name">("recent");
  const [openLead, setOpenLead] = useState<Lead | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", "warm"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads").select("*").in("status", ["warm", "won"]);
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const industries = useMemo(
    () => Array.from(new Set(leads.map((l) => l.industry).filter(Boolean))) as string[],
    [leads],
  );

  const filtered = useMemo(() => {
    return leads
      .filter((l) => {
        const q = search.trim().toLowerCase();
        if (q && !`${l.full_name} ${l.company ?? ""} ${l.role ?? ""}`.toLowerCase().includes(q)) return false;
        if (industry !== "all" && l.industry !== industry) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "score") return (b.icp_score ?? 0) - (a.icp_score ?? 0);
        if (sort === "name") return a.full_name.localeCompare(b.full_name);
        const ta = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
        const tb = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
        return tb - ta;
      });
  }, [leads, search, industry, sort]);

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`Moved to ${v.status.replace("_", " ")}`);
      qc.invalidateQueries({ queryKey: ["leads"] });
      setOpenLead(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scheduleMeeting = useMutation({
    mutationFn: async (lead: Lead) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in");
      const scheduled = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
      const { error } = await supabase.from("meetings").insert({
        user_id: user.user.id, lead_id: lead.id, scheduled_at: scheduled, status: "proposed",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Follow-up meeting scheduled");
      qc.invalidateQueries({ queryKey: ["meetings"] });
      setOpenLead(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = {
    total: leads.length,
    thisMonth: leads.filter((l) => {
      if (!l.updated_at) return false;
      const d = new Date(l.updated_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    avgScore: leads.length
      ? Math.round(leads.reduce((s, l) => s + (l.icp_score ?? 0), 0) / leads.length)
      : 0,
  };

  return (
    <div>
      <PageHeader
        title="Warm Clients"
        description="Ongoing relationships worth nurturing — trusted contacts and closed deals."
        actions={
          <Badge variant="secondary" className="rounded-full text-[11px]">
            <Trophy className="mr-1 h-3 w-3" /> {filtered.length} clients
          </Badge>
        }
      />

      <div className="px-8 py-6 space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Total warm clients" value={stats.total} icon={<Flame className="h-3.5 w-3.5" />} />
          <StatCard label="Active this month" value={stats.thisMonth} icon={<TrendingUp className="h-3.5 w-3.5" />} />
          <StatCard label="Avg. ICP score" value={stats.avgScore} icon={<Trophy className="h-3.5 w-3.5" />} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients…" className="pl-9 h-9 rounded-xl" />
          </div>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="h-9 w-[180px] rounded-xl"><SelectValue placeholder="Industry" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All industries</SelectItem>
              {industries.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="h-9 w-[160px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="score">Highest ICP score</SelectItem>
              <SelectItem value="name">Name (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl border border-border/60 bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border-border/70">
            <CardContent className="grid place-items-center gap-2 py-16 text-center">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-[14px] font-medium">No warm clients yet</div>
              <div className="text-[12.5px] text-muted-foreground max-w-sm">
                Closed deals and ongoing warm relationships will appear here as the AI moves leads through the pipeline.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((l) => (
              <LeadCard key={l.id} lead={l} onClick={() => setOpenLead(l)} />
            ))}
          </div>
        )}
      </div>

      <LeadDrawer
        lead={openLead}
        onClose={() => setOpenLead(null)}
        tone={{ label: openLead?.status === "won" ? "Won" : "Warm", className: "bg-amber-500/10 text-amber-700 hover:bg-amber-500/10" }}
        aiFallback="Strong ongoing relationship. Recommend a light-touch check-in every 2–3 weeks to keep the account warm."
        actions={
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" disabled={scheduleMeeting.isPending} onClick={() => openLead && scheduleMeeting.mutate(openLead)} className="rounded-xl">
              <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Follow-up
            </Button>
            <Button size="sm" variant="secondary" disabled={move.isPending} onClick={() => openLead && move.mutate({ id: openLead.id, status: "won" })} className="rounded-xl">
              <Trophy className="mr-1.5 h-3.5 w-3.5" /> Mark won
            </Button>
            <Button size="sm" variant="outline" disabled={move.isPending} onClick={() => openLead && move.mutate({ id: openLead.id, status: "not_interested" })} className="rounded-xl">
              <XCircle className="mr-1.5 h-3.5 w-3.5" /> Not fit
            </Button>
          </div>
        }
      />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}{label}
      </div>
      <div className="mt-2 text-[24px] font-semibold tracking-tight">{value}</div>
    </div>
  );
}

export const Route = createFileRoute("/_app/won")({
  component: WarmClientsPage,
});
