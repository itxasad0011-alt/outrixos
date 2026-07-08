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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock,
  Edit3,
  Mail,
  MessageSquare,
  MousePointer2,
  Plus,
  Reply,
  Send,
  SkipForward,
  Sparkles,
  Target,
  TimerReset,
  Trophy,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/followups")({
  head: () => ({
    meta: [
      { title: "Follow-ups — Outrix" },
      { name: "description", content: "Manage scheduled, sent, replied, skipped, and converted AI follow-ups in a modern sales cadence workflow." },
      { property: "og:title", content: "Follow-ups — Outrix" },
      { property: "og:description", content: "A sales workflow for reviewing AI-generated follow-ups, rescheduling touches, and sending pending messages." },
    ],
  }),
  component: Followups,
});

type FollowUp = {
  id: string;
  step: number;
  body: string | null;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
  conversation_id: string;
};

type ConversationOption = {
  id: string;
  lead: { full_name: string; company: string | null } | null;
};

const TABS = [
  { id: "all", label: "All" },
  { id: "scheduled", label: "Scheduled" },
  { id: "sent", label: "Sent" },
  { id: "failed", label: "Failed" },
  { id: "replied", label: "Replied" },
  { id: "skipped", label: "Skipped" },
  { id: "converted", label: "Converted" },
] as const;

const FLOW = ["Initial Outreach", "FU1", "FU2", "FU3", "Final Attempt", "Interested / Not Interested"];

function Followups() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [rescheduling, setRescheduling] = useState<FollowUp | null>(null);
  const [editing, setEditing] = useState<FollowUp | null>(null);
  const [creating, setCreating] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [editBody, setEditBody] = useState("");
  const [createForm, setCreateForm] = useState({ conversation_id: "", step: 1, scheduled_at: "", body: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["followups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_ups")
        .select("*")
        .order("scheduled_at");
      if (error) throw error;
      return (data ?? []) as FollowUp[];
    },
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["followups.conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, lead:leads(full_name, company)")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as ConversationOption[];
    },
  });

  const rows = useMemo(() => {
    const list = data ?? [];
    if (tab === "all") return list;
    if (tab === "failed") return list.filter((f) => ["failed", "error"].includes(f.status));
    if (tab === "converted") return list.filter((f) => ["converted", "meeting_booked"].includes(f.status));
    return list.filter((f) => f.status === tab);
  }, [data, tab]);

  const stats = useMemo(() => {
    const list = data ?? [];
    const count = (statuses: string[]) => list.filter((f) => statuses.includes(f.status)).length;
    return [
      { label: "Scheduled", value: count(["scheduled"]), icon: Clock, tone: "text-blue-600" },
      { label: "Sent", value: count(["sent"]), icon: Send, tone: "text-emerald-600" },
      { label: "Pending", value: count(["pending", "scheduled"]), icon: TimerReset, tone: "text-amber-600" },
      { label: "Replied", value: count(["replied"]), icon: Reply, tone: "text-neutral-700" },
      { label: "Skipped", value: count(["skipped"]), icon: SkipForward, tone: "text-muted-foreground" },
      { label: "Converted", value: count(["converted", "meeting_booked"]), icon: Trophy, tone: "text-emerald-700" },
    ];
  }, [data]);

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<FollowUp> }) => {
      const { error } = await supabase.from("follow_ups").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["followups"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sign in required");
      if (!createForm.conversation_id) throw new Error("Select a conversation");
      const scheduled = createForm.scheduled_at ? new Date(createForm.scheduled_at).toISOString() : new Date(Date.now() + 24 * 3600_000).toISOString();
      const { error } = await supabase.from("follow_ups").insert({
        user_id: auth.user.id,
        conversation_id: createForm.conversation_id,
        step: createForm.step,
        scheduled_at: scheduled,
        body: createForm.body.trim() || null,
        status: "scheduled",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Follow-up created");
      qc.invalidateQueries({ queryKey: ["followups"] });
      setCreating(false);
      setCreateForm({ conversation_id: "", step: 1, scheduled_at: "", body: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
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
  const saveEdit = () => {
    if (!editing) return;
    update.mutate(
      { id: editing.id, patch: { body: editBody } },
      {
        onSuccess: () => {
          toast.success("Message updated");
          setEditing(null);
          setEditBody("");
        },
      },
    );
  };

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        description="A cadence control room for pending touches, AI-written messages, and reply-driving follow-up actions."
        actions={
          <Button className="h-9 rounded-lg" onClick={() => setCreating(true)}> 
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Follow-up
          </Button>
        }
      />
      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        <Card className="overflow-hidden rounded-2xl border-border/70 bg-white shadow-sm shadow-black/[0.02]">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Target className="h-4 w-4" /></div>
              <div>
                <div className="text-[14px] font-semibold tracking-tight">Cadence journey</div>
                <div className="text-[12px] text-muted-foreground">From initial touch to final disposition.</div>
              </div>
            </div>
            <div className="overflow-x-auto pb-1">
              <div className="grid min-w-[760px] grid-cols-[repeat(6,minmax(0,1fr))] items-center gap-2">
                {FLOW.map((item, i) => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="flex min-h-20 flex-1 flex-col justify-between rounded-2xl border border-border/70 bg-secondary/50 p-3">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Step {i + 1}</div>
                      <div className="text-[13px] font-semibold leading-tight">{item}</div>
                    </div>
                    {i < FLOW.length - 1 && <div className="h-px w-5 shrink-0 bg-border" />}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-white p-2 shadow-sm shadow-black/[0.02]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-3 py-2 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <FollowupSkeleton key={i} />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState tab={tab} onCreate={() => setCreating(true)} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {rows.map((f) => (
              <FollowupCard
                key={f.id}
                f={f}
                onSend={() => sendNow(f)}
                onSkip={() => skip(f)}
                onEdit={() => { setEditing(f); setEditBody(f.body ?? ""); }}
                onReschedule={() => { setRescheduling(f); setNewDate(f.scheduled_at.slice(0, 16)); }}
                busy={update.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={rescheduling !== null} onOpenChange={(o) => !o && setRescheduling(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reschedule follow-up</DialogTitle>
            <DialogDescription>Choose a new date and time for this message to go out.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-lg" onClick={() => setRescheduling(null)}>
              Cancel
            </Button>
            <Button className="rounded-lg" onClick={reschedule} disabled={!newDate || update.isPending}>
              {update.isPending ? "Saving…" : "Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit follow-up message</DialogTitle>
            <DialogDescription>Adjust the message preview before it is sent.</DialogDescription>
          </DialogHeader>
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            className="min-h-40 rounded-2xl border border-border/70 bg-secondary/40 p-4 text-[13px] leading-relaxed outline-none focus:border-foreground"
          />
          <DialogFooter>
            <Button variant="outline" className="rounded-lg" onClick={() => setEditing(null)}>Cancel</Button>
            <Button className="rounded-lg" onClick={saveEdit} disabled={update.isPending}>Save message</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="rounded-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create follow-up</DialogTitle>
            <DialogDescription>Schedule a follow-up against an active conversation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={createForm.conversation_id} onValueChange={(v) => setCreateForm({ ...createForm, conversation_id: v })}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select conversation" /></SelectTrigger>
              <SelectContent>
                {conversations.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.lead?.full_name ?? "Unknown lead"}{c.lead?.company ? ` · ${c.lead.company}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input type="number" min={1} max={9} value={createForm.step} onChange={(e) => setCreateForm({ ...createForm, step: Number(e.target.value) })} className="h-10 rounded-xl" aria-label="Follow-up number" />
              <Input type="datetime-local" value={createForm.scheduled_at} onChange={(e) => setCreateForm({ ...createForm, scheduled_at: e.target.value })} className="h-10 rounded-xl" aria-label="Scheduled date and time" />
            </div>
            <textarea
              value={createForm.body}
              onChange={(e) => setCreateForm({ ...createForm, body: e.target.value })}
              placeholder="Write the follow-up message…"
              className="min-h-32 w-full rounded-2xl border border-border/70 bg-secondary/40 p-4 text-[13px] leading-relaxed outline-none focus:border-foreground"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-lg" onClick={() => setCreating(false)}>Cancel</Button>
            <Button className="rounded-lg" onClick={() => create.mutate()} disabled={create.isPending || !createForm.conversation_id}>
              {create.isPending ? "Creating…" : "Create follow-up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: string }) {
  return (
    <Card className="rounded-2xl border-border/70 bg-white shadow-sm shadow-black/[0.02] transition hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <Icon className={`h-4 w-4 ${tone}`} />
        </div>
        <div className="mt-3 text-[25px] font-semibold tracking-tight">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

function FollowupSkeleton() {
  return (
    <Card className="rounded-2xl border-border/70 bg-white">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-xl" /><Skeleton className="h-4 w-40" /></div>
        <Skeleton className="h-24 rounded-2xl" />
        <div className="flex gap-2"><Skeleton className="h-8 w-20 rounded-lg" /><Skeleton className="h-8 w-24 rounded-lg" /></div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ tab, onCreate }: { tab: string; onCreate: () => void }) {
  return (
    <Card className="rounded-2xl border-dashed border-border/70 bg-white shadow-sm shadow-black/[0.02]">
      <CardContent className="grid place-items-center gap-4 py-20 text-center">
        <div className="relative grid h-20 w-20 place-items-center rounded-3xl border border-border/70 bg-secondary/60">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
          <div className="absolute -right-1 -top-1 grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground"><Sparkles className="h-3.5 w-3.5" /></div>
        </div>
        <div>
          <div className="text-[16px] font-semibold tracking-tight">No follow-ups scheduled yet.</div>
          <div className="mt-1 max-w-sm text-[13px] text-muted-foreground">
            {tab === "all" ? "When AI schedules cadence touches, they will appear here as reviewable workflow cards." : `No ${tab} follow-ups match this filter.`}
          </div>
        </div>
        <Button className="h-10 rounded-xl" onClick={onCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Follow-up
        </Button>
      </CardContent>
    </Card>
  );
}

function FollowupCard({ f, onSend, onSkip, onEdit, onReschedule, busy }: {
  f: FollowUp;
  onSend: () => void;
  onSkip: () => void;
  onEdit: () => void;
  onReschedule: () => void;
  busy: boolean;
}) {
  const isPending = ["scheduled", "pending"].includes(f.status);
  const channel = f.step % 2 === 0 ? "Email" : "LinkedIn";
  const score = Math.min(96, 64 + f.step * 7 + (f.body?.length ?? 0) % 13);
  const statusIcon = f.status === "sent" ? CheckCircle2 : f.status === "failed" ? XCircle : f.status === "replied" ? Reply : Clock;
  const StatusIcon = statusIcon;

  return (
    <Card className="group overflow-hidden rounded-2xl border-border/70 bg-white shadow-sm shadow-black/[0.02] transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md">
      <CardContent className="p-0">
        <div className="border-b border-border/60 p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[15px] font-semibold tracking-tight">FU{f.step}</div>
                  <Badge variant="outline" className="rounded-full text-[10.5px] capitalize"><StatusIcon className="mr-1 h-3 w-3" />{f.status}</Badge>
                  <Badge variant="secondary" className="rounded-full text-[10.5px]"><Bot className="mr-1 h-3 w-3" />AI Generated</Badge>
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">
                  Scheduled {new Date(f.scheduled_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[20px] font-semibold tracking-tight">{score}</div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">AI score</div>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="ml-2 max-w-[92%] rounded-[22px] rounded-tl-md border border-border/70 bg-secondary/60 px-4 py-3 text-[13px] leading-relaxed shadow-sm shadow-black/[0.02]">
            {f.body ?? "AI-personalized follow-up drafted for this lead. Review, edit, then send when ready."}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="rounded-full"><MousePointer2 className="mr-1 h-3 w-3" />Personalized</Badge>
            <Badge variant="outline" className="rounded-full"><Edit3 className="mr-1 h-3 w-3" />Edited</Badge>
            <Badge variant="outline" className="rounded-full">{channel === "Email" ? <Mail className="mr-1 h-3 w-3" /> : <MessageSquare className="mr-1 h-3 w-3" />}{channel}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-8 rounded-lg text-[11.5px]" onClick={onEdit}>
              <Edit3 className="mr-1 h-3 w-3" /> Edit
            </Button>
            <Button size="sm" variant="outline" className="h-8 rounded-lg text-[11.5px]" onClick={onReschedule}>
              <CalendarClock className="mr-1 h-3 w-3" /> Reschedule
            </Button>
            <Button size="sm" variant="outline" className="h-8 rounded-lg text-[11.5px] text-muted-foreground" onClick={onSkip} disabled={busy}>
              <SkipForward className="mr-1 h-3 w-3" /> Skip
            </Button>
            {isPending && (
              <Button size="sm" className="h-8 rounded-lg text-[11.5px]" onClick={onSend} disabled={busy}>
                <Send className="mr-1 h-3 w-3" /> Send Now
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}