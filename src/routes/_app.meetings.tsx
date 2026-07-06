import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_app/meetings")({ component: Meetings });

function Meetings() {
  const { data } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => (await supabase.from("meetings").select("*, lead:leads(full_name, company)").order("scheduled_at")).data ?? [],
  });
  return (
    <div>
      <PageHeader title="Meetings" description="Booked and confirmed by the AI agent." />
      <div className="px-8 py-6">
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-0">
            {(data?.length ?? 0) === 0 ? (
              <div className="grid place-items-center py-14 text-[13px] text-muted-foreground">No meetings yet.</div>
            ) : (
              <div className="divide-y divide-border/60">
                {data!.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium">{(m as { lead: { full_name: string; company: string } }).lead?.full_name}</div>
                      <div className="text-[11.5px] text-muted-foreground">{(m as { lead: { company: string } }).lead?.company}</div>
                    </div>
                    <div className="text-[12px] text-muted-foreground">{new Date(m.scheduled_at).toLocaleString()}</div>
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
