import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function makeList(status: string[], title: string, description: string) {
  function Page() {
    const { data: leads } = useQuery({
      queryKey: ["leads", title],
      queryFn: async () => {
        const { data } = await supabase.from("leads").select("*").in("status", status).order("last_activity_at", { ascending: false, nullsFirst: false });
        return data ?? [];
      },
    });
    return (
      <div>
        <PageHeader title={title} description={description} />
        <div className="px-8 py-6">
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-0">
              {(leads?.length ?? 0) === 0 ? (
                <div className="grid place-items-center py-14 text-[13px] text-muted-foreground">Nothing here yet.</div>
              ) : (
                <div className="divide-y divide-border/60">
                  {leads!.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium">{l.full_name}</div>
                        <div className="truncate text-[11.5px] text-muted-foreground">{l.role} · {l.company} · {l.industry}</div>
                      </div>
                      {l.status_reason && <div className="text-[11px] text-muted-foreground">{l.status_reason}</div>}
                      <Badge className="rounded-full text-[10.5px] capitalize">{l.status.replace("_", " ")}</Badge>
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
  return Page;
}

export const Route = createFileRoute("/_app/interested")({
  component: makeList(["interested"], "Interested", "Leads showing buying intent."),
});
