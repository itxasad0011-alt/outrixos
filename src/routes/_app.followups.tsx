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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Clock, Send, SkipForward, CalendarClock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/followups")({ component: Followups });

type FollowUp = {
  id: string;
  step: number;
  body: string | null;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
};

const TABS: { id: "all" | "scheduled" | "sent" | "skipped"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "scheduled", label: "Scheduled" },
  { id: "sent", label: "Sent" },
  { id: "skipped", label: "Skipped" },
];

function Followups() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [rescheduling, setRescheduling] = useState<FollowUp | null>(null);
  const [newDate, setNewDate] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["followups"],
    queryFn: async () => {
      const { data } = await supabase
        .from("follow_ups")
        .select("*")
        .order("scheduled_at");
      return (data ?? []) as FollowUp[];
    },
  });

  const rows = useMemo(() => {
    const list = data ?? [];
    if (tab === "all") return list;
    return list.filter((f) => f.status === tab);
  }, [data, tab]);

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<FollowUp> }) => {
      const { error } = await supabase.from("follow_ups").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["followups"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });

  const sendNow = (f: FollowUp) =>
    update.mutate(
      { id: f.id, patch: { status: "sent", sent_at: new Date().toISOString() } },
      { onSuccess: () => toast.success("Follow-up queued to send") },
    );
  const skip = (f: FollowUp) =>
    update.mutate(
      { id: f.id, patch: { status: "skipped" } },
      { onSuccess: () => toast.success("Follow-up skipped") },
    );
  const reschedule = () => {
    if (!rescheduling || !newDate) return;
    update.mutate(
      { id: rescheduling.id, patch: { scheduled_at: new Date(newDate).toISOString(), status: "scheduled" } },
      {
        onSuccess: () => {
          toast.success("Follow-up rescheduled");
          setRescheduling(null);
          setNewDate("");
        },
      },
    );
  };

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        description="Automatic cadence when a lead goes quiet. FU1 → FU2 → FU3 → Final → moved to Not Interested."
      />
      <div className="px-8 py-6">
        <div className="mb-4 flex items-center gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                tab === t.id
                  ? "bg-[#0A0A0A] text-white"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="divide-y divide-border/60">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-4">
                    <Skeleton className="h-5 w-10 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="grid place-items-center gap-3 py-16 text-center">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-muted-foreground">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="text-[14px] font-medium">
                  {tab === "all" ? "No follow-ups yet" : `No ${tab} follow-ups`}
                </div>
                <div className="max-w-xs text-[12.5px] text-muted-foreground">
                  When a lead goes quiet, the AI queues follow-ups automatically. They will appear here.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {rows.map((f) => (
                  <div key={f.id} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/40">
                    <Badge className="rounded-full">FU{f.step}</Badge>
                    <div className="min-w-0 flex-1 truncate text-[13px]">
                      {f.body ?? "Scheduled follow-up"}
                    </div>
                    <div className="hidden text-[11.5px] text-muted-foreground sm:block">
                      {new Date(f.scheduled_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                    <Badge
                      variant="secondary"
                      className="rounded-full text-[10.5px] capitalize"
                    >
                      {f.status}
                    </Badge>
                    {f.status === "scheduled" && (
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => sendNow(f)}
                          className="h-7 rounded-lg px-2 text-[11.5px]"
                          aria-label="Send now"
                        >
                          <Send className="mr-1 h-3 w-3" /> Send
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRescheduling(f);
                            setNewDate(f.scheduled_at.slice(0, 16));
                          }}
                          className="h-7 rounded-lg px-2 text-[11.5px]"
                          aria-label="Reschedule"
                        >
                          <CalendarClock className="mr-1 h-3 w-3" /> Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => skip(f)}
                          className="h-7 rounded-lg px-2 text-[11.5px] text-muted-foreground"
                          aria-label="Skip"
                        >
                          <SkipForward className="mr-1 h-3 w-3" /> Skip
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={rescheduling !== null} onOpenChange={(o) => !o && setRescheduling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule follow-up</DialogTitle>
            <DialogDescription>Choose a new date and time for this message to go out.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduling(null)}>
              Cancel
            </Button>
            <Button onClick={reschedule} disabled={!newDate || update.isPending}>
              {update.isPending ? "Saving…" : "Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
