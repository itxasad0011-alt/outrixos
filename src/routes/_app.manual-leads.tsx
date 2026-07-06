import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { addManualLead } from "@/lib/ai/agent.functions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/manual-leads")({ component: ManualLeads });

function ManualLeads() {
  const qc = useQueryClient();
  const [f, setF] = useState({ full_name: "", headline: "", company: "", role: "", industry: "", linkedin_url: "" });

  const { data: leads } = useQuery({
    queryKey: ["leads", "manual"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("*").eq("source", "manual").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = useServerFn(addManualLead);
  const addM = useMutation({
    mutationFn: () => add({ data: { ...f } }),
    onSuccess: () => {
      toast.success("Lead added");
      setF({ full_name: "", headline: "", company: "", role: "", industry: "", linkedin_url: "" });
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div>
      <PageHeader title="Manual Leads" description="Add leads by hand. They flow into the same qualification pipeline." />
      <div className="grid gap-6 px-8 py-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-0">
            {(leads?.length ?? 0) === 0 ? (
              <div className="grid place-items-center py-16 text-[13px] text-muted-foreground">No manual leads yet.</div>
            ) : (
              <div className="divide-y divide-border/60">
                {leads!.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 px-5 py-3 text-[13px]">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{l.full_name}</div>
                      <div className="truncate text-[11.5px] text-muted-foreground">{l.role} · {l.company}</div>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{l.industry}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardContent className="space-y-3 p-5">
            <div className="text-[14px] font-semibold">Add a lead</div>
            {(["full_name", "headline", "company", "role", "industry", "linkedin_url"] as const).map((k) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-[12px] capitalize">{k.replace("_", " ")}</Label>
                <Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="h-9 rounded-lg" />
              </div>
            ))}
            <Button onClick={() => addM.mutate()} disabled={!f.full_name || addM.isPending} className="h-9 w-full rounded-lg bg-[#2563EB] hover:bg-[#1d4fd0]">
              <Plus className="mr-1.5 h-3.5 w-3.5" />{addM.isPending ? "Adding…" : "Add lead"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
