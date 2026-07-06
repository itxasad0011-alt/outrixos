import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/followups")({ component: Followups });

function Followups() {
  const { data } = useQuery({
    queryKey: ["followups"],
    queryFn: async () => (await supabase.from("follow_ups").select("*").order("scheduled_at")).data ?? [],
  });
  return (
    <div>
      <PageHeader title="Follow-ups" description="Automatic cadence when a lead goes quiet. FU1 → FU2 → FU3 → Final → moved to Not Interested." />
      <div className="px-8 py-6">
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-0">
            {(data?.length ?? 0) === 0 ? (
              <div className="grid place-items-center py-14 text-[13px] text-muted-foreground">No follow-ups scheduled.</div>
            ) : (
              <div className="divide-y divide-border/60">
                {data!.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                    <Badge className="rounded-full">FU{f.step}</Badge>
                    <div className="min-w-0 flex-1 text-[13px]">{f.body ?? "Scheduled follow-up"}</div>
                    <div className="text-[11.5px] text-muted-foreground">{new Date(f.scheduled_at).toLocaleDateString()}</div>
                    <Badge variant="secondary" className="rounded-full text-[10.5px] capitalize">{f.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
