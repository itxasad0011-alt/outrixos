import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Send, Reply, MessagesSquare, Sparkles, CalendarCheck, TrendingUp, Search, Zap, Play, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { runWorker } from "@/lib/automation/queue.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/")({ component: Dashboard });

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [leads, sent, replied, interested, meetings, activity] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).in("status", ["messaged", "replied", "interested", "meeting", "won"]),
        supabase.from("leads").select("id", { count: "exact", head: true }).in("status", ["replied", "interested", "meeting", "won"]),
        supabase.from("leads").select("id", { count: "exact", head: true }).in("status", ["interested", "meeting", "won"]),
        supabase.from("meetings").select("id", { count: "exact", head: true }),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(12),
      ]);
      const total = leads.count ?? 0;
      const s = sent.count ?? 0;
      const r = replied.count ?? 0;
      const w = interested.count ?? 0;
      return {
        total, sent: s, replied: r, interested: w,
        meetings: meetings.count ?? 0,
        replyRate: s ? Math.round((r / s) * 1000) / 10 : 0,
        conversion: total ? Math.round((w / total) * 1000) / 10 : 0,
        activity: activity.data ?? [],
      };
    },
  });

  const qc = useQueryClient();
  const runWorkerFn = useServerFn(runWorker);
  const workerMutation = useMutation({
    mutationFn: () => runWorkerFn({ data: { limit: 5 } }),
    onSuccess: (r) => {
      toast.success(`Processed ${r.processed} action${r.processed === 1 ? "" : "s"}`);
      qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Worker failed"),
  });

  const { data: queue } = useQuery({
    queryKey: ["action-queue"],
    refetchInterval: 4000,
    queryFn: async () => {
      const { data } = await supabase.from("action_queue" as never)
        .select("id, action_type, status, created_at, error")
        .order("created_at", { ascending: false }).limit(8);
      return (data ?? []) as unknown as { id: string; action_type: string; status: string; created_at: string; error: string | null }[];
    },
  });
  const pendingCount = queue?.filter((q) => q.status === "pending").length ?? 0;

  const kpis: { label: string; value: string; icon: LucideIcon; tint: string }[] = [
    { label: "Leads Found", value: `${stats?.total ?? 0}`, icon: Users, tint: "bg-neutral-100 text-blue-600" },
    { label: "Connections Sent", value: `${stats?.sent ?? 0}`, icon: Send, tint: "bg-indigo-50 text-indigo-600" },
    { label: "Reply Rate", value: `${stats?.replyRate ?? 0}%`, icon: Reply, tint: "bg-amber-50 text-amber-600" },
    { label: "Active Convos", value: `${stats?.replied ?? 0}`, icon: MessagesSquare, tint: "bg-cyan-50 text-cyan-600" },
    { label: "Interested", value: `${stats?.interested ?? 0}`, icon: Sparkles, tint: "bg-fuchsia-50 text-fuchsia-600" },
    { label: "Meetings", value: `${stats?.meetings ?? 0}`, icon: CalendarCheck, tint: "bg-emerald-50 text-emerald-600" },
    { label: "Conversion", value: `${stats?.conversion ?? 0}%`, icon: TrendingUp, tint: "bg-rose-50 text-rose-600" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your AI sales agent, live. Every action, in real time."
        actions={
          <>
            <Button asChild variant="outline" className="h-9 rounded-lg"><Link to="/discovery"><Search className="mr-1.5 h-3.5 w-3.5" />Discover leads</Link></Button>
            <Button asChild className="h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]"><Link to="/brain"><Zap className="mr-1.5 h-3.5 w-3.5" />Sales Brain</Link></Button>
          </>
        }
      />
      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          {kpis.map((k) => (
            <Card key={k.label} className="rounded-2xl border-border/70">
              <CardContent className="p-4">
                <div className={`inline-grid h-8 w-8 place-items-center rounded-lg ${k.tint}`}><k.icon className="h-4 w-4" /></div>
                <div className="mt-3 text-[20px] font-semibold tracking-tight">{k.value}</div>
                <div className="text-[11.5px] text-muted-foreground">{k.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="text-[14px] font-semibold">Automation Queue</div>
                {pendingCount > 0 && (
                  <Badge variant="outline" className="rounded-full text-[10px]">{pendingCount} pending</Badge>
                )}
              </div>
              <Button
                size="sm"
                className="h-8 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]"
                disabled={workerMutation.isPending || pendingCount === 0}
                onClick={() => workerMutation.mutate()}
              >
                {workerMutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
                Run worker
              </Button>
            </div>
            {(queue?.length ?? 0) === 0 ? (
              <div className="grid place-items-center py-10 text-[13px] text-muted-foreground">
                No queued actions. Send outreach from a lead to enqueue commands.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {queue!.map((q) => (
                  <div key={q.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="font-mono text-[11px] text-muted-foreground">{q.action_type}</div>
                    <Badge variant="outline" className={`ml-auto rounded-full text-[10px] ${statusTint(q.status)}`}>{q.status}</Badge>
                    <div className="whitespace-nowrap text-[11px] text-muted-foreground">{timeAgo(q.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <div className="text-[14px] font-semibold">Live Agent Activity</div>
              <Badge className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Live
              </Badge>
            </div>
            {(stats?.activity.length ?? 0) === 0 ? (
              <div className="grid place-items-center py-14 text-[13px] text-muted-foreground">No activity yet. Set up your profile to start.</div>
            ) : (
              <div className="divide-y divide-border/60">
                {stats!.activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                    <div className={`grid h-8 w-8 place-items-center rounded-lg ${kindTint(a.kind)}`}>{kindIcon(a.kind)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{a.title}</div>
                      {a.detail && <div className="truncate text-[11.5px] text-muted-foreground">{a.detail}</div>}
                    </div>
                    <div className="whitespace-nowrap text-[11px] text-muted-foreground">
                      {timeAgo(a.created_at)}
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

function kindTint(k: string) {
  return {
    discovery: "bg-neutral-100 text-blue-600",
    message: "bg-indigo-50 text-indigo-600",
    reply: "bg-amber-50 text-amber-600",
    meeting: "bg-emerald-50 text-emerald-600",
    learning: "bg-fuchsia-50 text-fuchsia-600",
    connection: "bg-cyan-50 text-cyan-600",
    system: "bg-muted text-muted-foreground",
  }[k] ?? "bg-muted text-muted-foreground";
}
function kindIcon(k: string) {
  const I = ({ discovery: Search, message: Send, reply: Reply, meeting: CalendarCheck, learning: Sparkles, connection: Users, system: Zap } as Record<string, LucideIcon>)[k] ?? Zap;
  return <I className="h-4 w-4" />;
}
function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
