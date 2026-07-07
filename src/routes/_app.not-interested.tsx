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
import { Search, XCircle, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { LeadCard, LeadDrawer, type Lead } from "@/components/lead-drawer";

function NotInterestedPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState<string>("all");
  const [openLead, setOpenLead] = useState<Lead | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", "not_interested"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads").select("*").eq("status", "not_interested");
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const reasons = useMemo(
    () => Array.from(new Set(leads.map((l) => l.status_reason).filter(Boolean))) as string[],
    [leads],
  );

  const filtered = useMemo(() => {
    return leads
      .filter((l) => {
        const q = search.trim().toLowerCase();
        if (q && !`${l.full_name} ${l.company ?? ""} ${l.role ?? ""}`.toLowerCase().includes(q)) return false;
        if (reason !== "all" && l.status_reason !== reason) return false;
        return true;
      })
      .sort((a, b) => {
        const ta = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
        const tb = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
        return tb - ta;
      });
  }, [leads, search, reason]);

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

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead archived");
      qc.invalidateQueries({ queryKey: ["leads"] });
      setOpenLead(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Not Interested"
        description="Leads that opted out or weren't a fit — kept for learning and future re-engagement."
        actions={
          <Badge variant="secondary" className="rounded-full text-[11px]">
            <XCircle className="mr-1 h-3 w-3" /> {filtered.length} archived
          </Badge>
        }
      />

      <div className="px-8 py-6 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, company, role…" className="pl-9 h-9 rounded-xl" />
          </div>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="h-9 w-[220px] rounded-xl"><SelectValue placeholder="Reason" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reasons</SelectItem>
              {reasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
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
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-[14px] font-medium">Nothing archived yet</div>
              <div className="text-[12.5px] text-muted-foreground max-w-sm">
                Leads that decline outreach or don't match your ICP will land here for the AI to learn from.
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
        tone={{ label: "Not interested", className: "bg-muted text-muted-foreground hover:bg-muted" }}
        aiFallback="Lead declined or wasn't a fit. The AI has logged the objection to refine targeting and messaging next time."
        actions={
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" disabled={move.isPending} onClick={() => openLead && move.mutate({ id: openLead.id, status: "interested" })} className="rounded-xl">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Interested
            </Button>
            <Button size="sm" variant="secondary" disabled={move.isPending} onClick={() => openLead && move.mutate({ id: openLead.id, status: "qualified" })} className="rounded-xl">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Re-engage
            </Button>
            <Button size="sm" variant="outline" disabled={remove.isPending} onClick={() => openLead && remove.mutate(openLead.id)} className="rounded-xl">
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        }
      />
    </div>
  );
}

export const Route = createFileRoute("/_app/not-interested")({
  component: NotInterestedPage,
});
