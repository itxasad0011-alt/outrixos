import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/not-interested")({ component: NotInterested });

function NotInterested() {
  const { data } = useQuery({
    queryKey: ["leads", "not_interested"],
    queryFn: async () => (await supabase.from("leads").select("*").in("status", ["not_interested", "blocked"])).data ?? [],
  });
  return (
    <div>
      <PageHeader title="Not Interested" description="Permanently excluded from outreach." />
      <div className="px-8 py-6">
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-0">
            {(data?.length ?? 0) === 0 ? (
              <div className="grid place-items-center py-14 text-[13px] text-muted-foreground">Empty.</div>
            ) : (
              <div className="divide-y divide-border/60">
                {data!.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium">{l.full_name}</div>
                      <div className="truncate text-[11.5px] text-muted-foreground">{l.company}</div>
                    </div>
                    <Badge variant="secondary" className="rounded-full text-[10.5px]">Blocked</Badge>
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
