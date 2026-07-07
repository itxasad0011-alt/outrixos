import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Brain, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/memory")({ component: Memory });

type Memory = {
  id: string;
  category: string;
  title: string;
  detail: string | null;
  weight: number | null;
};

function Memory() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Memory | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["memory"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_memory")
        .select("*")
        .order("weight", { ascending: false });
      return (data ?? []) as Memory[];
    },
  });

  const rows = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    const needle = q.toLowerCase();
    return list.filter(
      (m) =>
        m.title.toLowerCase().includes(needle) ||
        (m.detail ?? "").toLowerCase().includes(needle) ||
        m.category.toLowerCase().includes(needle),
    );
  }, [data, q]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_memory").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memory"] });
      toast.success("Memory removed");
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });

  return (
    <div>
      <PageHeader
        title="AI Memory"
        description="What your agent has learned — winning messages, common objections, successful patterns."
      />
      <div className="px-8 py-6 space-y-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search learnings…"
            className="h-10 rounded-xl pl-9"
            aria-label="Search AI memory"
          />
        </div>

        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y divide-border/60">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-4">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="grid place-items-center gap-3 py-16 text-center">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-muted-foreground">
                  <Brain className="h-5 w-5" />
                </div>
                <div className="text-[14px] font-medium">
                  {q ? "No matches" : "No learnings yet"}
                </div>
                <div className="max-w-xs text-[12.5px] text-muted-foreground">
                  {q
                    ? "Try a different keyword."
                    : "The AI learns as it runs conversations. Come back after your first replies."}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {rows.map((m) => (
                  <div
                    key={m.id}
                    className="group flex items-start gap-3 px-5 py-3 transition-colors hover:bg-secondary/40"
                  >
                    <Badge className="rounded-full text-[10.5px] capitalize">
                      {m.category.replace(/_/g, " ")}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium">{m.title}</div>
                      {m.detail && (
                        <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">
                          {m.detail}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDelete(m)}
                      className="h-7 w-7 rounded-lg p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                      aria-label={`Delete memory ${m.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this learning?</AlertDialogTitle>
            <AlertDialogDescription>
              The AI will no longer use this memory when composing messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && del.mutate(confirmDelete.id)}
              disabled={del.isPending}
            >
              {del.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
