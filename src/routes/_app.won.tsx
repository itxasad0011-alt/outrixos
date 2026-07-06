import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/won")({ component: Won });

function Won() {
  const { data } = useQuery({
    queryKey: ["leads", "won"],
    queryFn: async () => (await supabase.from("leads").select("*").eq("status", "won")).data ?? [],
  });
  return (
    <div>
      <PageHeader title="Won Clients" description="Deals closed by the AI agent." />
      <div className="px-8 py-6">
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-0">
            {(data?.length ?? 0) === 0 ? (
              <div className="grid place-items-center py-14 text-[13px] text-muted-foreground">No won clients yet.</div>
            ) : (
              <div className="divide-y divide-border/60">
                {data!.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium">{l.full_name}</div>
                      <div className="truncate text-[11.5px] text-muted-foreground">{l.company} · {l.industry}</div>
                    </div>
                    <Badge className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">Won</Badge>
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
