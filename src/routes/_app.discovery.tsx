import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { discoverLeads } from "@/lib/ai/agent.functions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ComposeDialog } from "@/components/compose-dialog";

export const Route = createFileRoute("/_app/discovery")({ component: DiscoveryPage });

type LeadRow = { id: string; full_name: string; company: string | null; headline: string | null };

function DiscoveryPage() {
  const qc = useQueryClient();
  const { data: leads } = useQuery({
    queryKey: ["leads", "discovery"],
    queryFn: async () => {
      const { data } = await supabase.from("leads")
        .select("*")
        .in("status", ["qualified", "new", "skipped"])
        .order("icp_score", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const discover = useServerFn(discoverLeads);

  const discoverM = useMutation({
    mutationFn: () => discover({ data: { count: 8 } }),
    onSuccess: (r) => { toast.success(`Discovered ${r.count} leads`); qc.invalidateQueries({ queryKey: ["leads"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [composeLead, setComposeLead] = useState<LeadRow | null>(null);

  return (
    <div>
      <PageHeader
        title="Lead Discovery"
        description="AI finds prospects matching your ICP — from your Sales Brain."
        actions={
          <Button onClick={() => discoverM.mutate()} disabled={discoverM.isPending} className="h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {discoverM.isPending ? "Discovering…" : "Discover leads"}
          </Button>
        }
      />
      <div className="px-8 py-6">
        {(leads?.length ?? 0) === 0 ? (
          <Card className="rounded-2xl border-dashed border-border/70">
            <CardContent className="grid place-items-center gap-3 py-16 text-center">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-muted-foreground"><Search className="h-5 w-5" /></div>
              <div className="text-[14px] font-medium">No leads yet</div>
              <div className="max-w-sm text-[12.5px] text-muted-foreground">
                Complete your profile and generate a Sales Brain, then click Discover.{" "}
                <Link to="/profile" className="text-[#0A0A0A]">Set up profile →</Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {leads!.map((l) => (
              <Card key={l.id} className="rounded-2xl border-border/70">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-neutral-900 to-neutral-700 text-[12px] text-white">
                        {l.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[13.5px] font-semibold">{l.full_name}</div>
                        <Badge className={`rounded-full text-[10.5px] ${(l.icp_score ?? 0) >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : (l.icp_score ?? 0) >= 60 ? "bg-neutral-100 text-[#0A0A0A] border-neutral-200" : "bg-muted text-muted-foreground"}`}>
                          {l.icp_score ?? 0}
                        </Badge>
                      </div>
                      <div className="truncate text-[11.5px] text-muted-foreground">{l.headline || `${l.role} · ${l.company}`}</div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground/70">{l.industry}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-full text-[10.5px] capitalize">{l.status}</Badge>
                    {l.status === "qualified" && (
                      <Button size="sm"
                        onClick={() => setComposeLead({ id: l.id, full_name: l.full_name, company: l.company, headline: l.headline })}
                        className="ml-auto h-7 rounded-lg bg-[#0A0A0A] px-2.5 text-[11.5px] hover:bg-[#262626]">
                        <Send className="mr-1 h-3 w-3" /> Send intro
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <ComposeDialog
        open={composeLead !== null}
        onOpenChange={(o) => { if (!o) setComposeLead(null); }}
        lead={composeLead}
        mode="connection"
      />
    </div>
  );
}
