import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { runOutreach } from "@/lib/ai/agent.functions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/outreach")({ component: Outreach });

function Outreach() {
  const qc = useQueryClient();
  const { data: leads } = useQuery({
    queryKey: ["leads", "outreach"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("*")
        .in("status", ["qualified", "messaged", "connected"]).order("last_activity_at", { ascending: false, nullsFirst: false }).limit(60);
      return data ?? [];
    },
  });
  const out = useServerFn(runOutreach);
  const outM = useMutation({
    mutationFn: (id: string) => out({ data: { lead_id: id } }),
    onSuccess: () => { toast.success("Sent"); qc.invalidateQueries({ queryKey: ["leads"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const queued = leads?.filter(l => l.status === "qualified") ?? [];
  const sent = leads?.filter(l => l.status !== "qualified") ?? [];

  return (
    <div>
      <PageHeader title="Outreach" description="Safe sending pattern · 10–15/day · human-like timing." />
      <div className="grid gap-6 px-8 py-6 xl:grid-cols-2">
        <Column title="Ready to send" leads={queued} action={(l) => (
          <Button size="sm" disabled={outM.isPending} onClick={() => outM.mutate(l.id)}
            className="h-7 rounded-lg bg-[#0A0A0A] px-2.5 text-[11.5px] hover:bg-[#262626]"><Send className="mr-1 h-3 w-3" /> Send</Button>
        )} />
        <Column title="Already contacted" leads={sent} />
      </div>
    </div>
  );
}

type Lead = { id: string; full_name: string; company: string | null; role: string | null; status: string };
function Column({ title, leads, action }: { title: string; leads: Lead[]; action?: (l: Lead) => React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-border/70">
      <CardContent className="p-0">
        <div className="border-b border-border/60 px-5 py-3 text-[13.5px] font-semibold">{title} <span className="ml-1 text-muted-foreground">· {leads.length}</span></div>
        {leads.length === 0 ? (
          <div className="grid place-items-center py-12 text-[12.5px] text-muted-foreground">Nothing here.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {leads.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{l.full_name}</div>
                  <div className="truncate text-[11.5px] text-muted-foreground">{l.role} · {l.company}</div>
                </div>
                <Badge variant="secondary" className="rounded-full text-[10.5px] capitalize">{l.status}</Badge>
                {action?.(l)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
