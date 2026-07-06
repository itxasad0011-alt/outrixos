import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";

export const Route = createFileRoute("/_app/memory")({ component: Memory });

function Memory() {
  const { data } = useQuery({
    queryKey: ["memory"],
    queryFn: async () => (await supabase.from("ai_memory").select("*").order("weight", { ascending: false })).data ?? [],
  });
  return (
    <div>
      <PageHeader title="AI Memory" description="What your agent has learned — winning messages, common objections, successful patterns." />
      <div className="px-8 py-6">
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-0">
            {(data?.length ?? 0) === 0 ? (
              <div className="grid place-items-center gap-3 py-14 text-center">
                <Brain className="h-6 w-6 text-muted-foreground" />
                <div className="max-w-xs text-[12.5px] text-muted-foreground">The AI learns as it runs conversations. Come back after your first replies.</div>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {data!.map((m) => (
                  <div key={m.id} className="flex items-start gap-3 px-5 py-3">
                    <Badge className="rounded-full text-[10.5px] capitalize">{m.category.replace("_", " ")}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium">{m.title}</div>
                      {m.detail && <div className="text-[11.5px] text-muted-foreground">{m.detail}</div>}
                    </div>
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
