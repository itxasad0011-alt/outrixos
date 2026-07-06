import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { simulateLeadReplyAndRespond } from "@/lib/ai/agent.functions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare, Sparkles, Send, Search, Archive, CalendarCheck,
  ThumbsUp, ThumbsDown, RefreshCw, Pencil, AlertTriangle, Brain,
  Target, TrendingUp, Clock, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/conversations")({ component: ConvosPage });

type Convo = {
  id: string;
  intent: string | null;
  ai_summary: string | null;
  last_message_at: string | null;
  lead: {
    id: string;
    full_name: string;
    company: string | null;
    headline: string | null;
    status: string | null;
    icp_score: number | null;
  } | null;
};

type Message = {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  author: "ai" | "lead" | "user";
  body: string;
  kind: string | null;
  created_at: string;
};

// ---------- helpers ----------
const FILTERS = [
  { id: "all", label: "All" },
  { id: "interested", label: "Interested" },
  { id: "followup", label: "Follow-ups" },
  { id: "meeting", label: "Meetings" },
  { id: "cold", label: "Cold" },
  { id: "not_interested", label: "Not Interested" },
] as const;
type FilterId = typeof FILTERS[number]["id"];

function statusMeta(status: string | null | undefined) {
  const s = status ?? "";
  if (s === "interested") return { label: "Interested", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (s === "meeting_booked" || s === "meeting") return { label: "Meeting", tone: "bg-violet-50 text-violet-700 border-violet-200" };
  if (s === "warm" || s === "won") return { label: "Warm", tone: "bg-amber-50 text-amber-700 border-amber-200" };
  if (s === "followup_sent" || s === "follow_up") return { label: "Follow-up", tone: "bg-sky-50 text-sky-700 border-sky-200" };
  if (s === "not_interested") return { label: "Not Interested", tone: "bg-neutral-100 text-neutral-500 border-neutral-200" };
  if (s === "messaged" || s === "connect_sent" || s === "replied") return { label: "Active", tone: "bg-neutral-100 text-neutral-700 border-neutral-200" };
  return { label: "Cold", tone: "bg-neutral-50 text-neutral-500 border-neutral-200" };
}

function matchesFilter(convo: Convo, filter: FilterId): boolean {
  if (filter === "all") return true;
  const s = convo.lead?.status ?? "";
  if (filter === "interested") return s === "interested";
  if (filter === "followup") return s === "followup_sent" || s === "follow_up";
  if (filter === "meeting") return s === "meeting_booked" || s === "meeting";
  if (filter === "cold") return !s || ["messaged", "connect_sent"].includes(s);
  if (filter === "not_interested") return s === "not_interested";
  return true;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function initials(name?: string | null) {
  return (name ?? "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}

function intentScore(convo: Convo | null): number {
  if (!convo) return 0;
  const i = convo.intent ?? "";
  const base = i === "interested" ? 85 : i === "asking" ? 68 : i === "not_interested" ? 12 : 45;
  const icp = convo.lead?.icp_score ?? 60;
  return Math.min(98, Math.round(base * 0.7 + icp * 0.3));
}

function detectObjection(messages: Message[]): { label: string; strategy: string } | null {
  const lastLead = [...messages].reverse().find((m) => m.author === "lead")?.body.toLowerCase() ?? "";
  if (/price|pricing|cost|budget|expensive|afford/.test(lastLead))
    return { label: "Pricing", strategy: "Acknowledge briefly, redirect to value + offer a 15-min call via Calendly." };
  if (/time|busy|later|next quarter|not now/.test(lastLead))
    return { label: "Timing", strategy: "Empathize, ask when would be better, offer to send async loom instead." };
  if (/not sure|trust|proof|case study|reference/.test(lastLead))
    return { label: "Trust", strategy: "Share 1 relevant case study or testimonial. Keep it short." };
  if (/competitor|already using|current/.test(lastLead))
    return { label: "Competitor", strategy: "Ask 1 open question about what's missing today. Don't bash competitors." };
  return null;
}

function nextBestAction(convo: Convo | null, messages: Message[]): { title: string; hint: string; icon: typeof Send } {
  if (!convo) return { title: "Wait", hint: "Select a lead", icon: Clock };
  const last = messages[messages.length - 1];
  const intent = convo.intent ?? "";
  if (intent === "interested") return { title: "Push Calendly meeting", hint: "Intent is high — book the call now.", icon: CalendarCheck };
  if (last?.author === "lead") return { title: "Send AI reply", hint: "Prospect just replied. Respond within 5 minutes.", icon: Send };
  const stale = last ? Date.now() - new Date(last.created_at).getTime() > 3 * 86400000 : false;
  if (stale) return { title: "Send follow-up", hint: "Thread is stalled >3d. Nudge with value.", icon: RefreshCw };
  if (intent === "asking") return { title: "Ask qualifying question", hint: "They're curious. Qualify the pain.", icon: Target };
  return { title: "Wait", hint: "Give the prospect time to respond.", icon: Clock };
}

function draftReplies(convo: Convo | null, messages: Message[]): { short: string; medium: string; push: string } {
  const name = convo?.lead?.full_name?.split(" ")[0] ?? "there";
  const obj = detectObjection(messages);
  if (obj?.label === "Pricing") {
    return {
      short: `Great question — depends on scope. Easiest is a quick 15-min call: {calendly}`,
      medium: `Totally fair, ${name}. Pricing depends on volume and integrations, so I'd rather show you a tailored number than throw a range. 15 mins works? {calendly}`,
      push: `${name}, pricing conversations always go better live. I've blocked a few slots this week — grab one that works: {calendly}`,
    };
  }
  return {
    short: `Makes sense, ${name}. Want me to send a 2-min loom?`,
    medium: `Appreciate the reply, ${name}. Quick question — is [pain point] currently owned by you or the team? Happy to share how we've helped similar folks.`,
    push: `${name}, easiest way to see if this fits is a 15-min call — no pitch, just a look at your setup. Grab a time: {calendly}`,
  };
}

// ============ Component ============
function ConvosPage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");
  const [composer, setComposer] = useState("");

  const { data: convos } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await supabase.from("conversations")
        .select("id, intent, ai_summary, last_message_at, lead:leads(id, full_name, company, headline, status, icp_score)")
        .order("last_message_at", { ascending: false, nullsFirst: false });
      return (data ?? []) as unknown as Convo[];
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-calendly"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").maybeSingle();
      return data;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (convos ?? []).filter((c) => matchesFilter(c, filter))
      .filter((c) => !q || c.lead?.full_name.toLowerCase().includes(q) || c.lead?.company?.toLowerCase().includes(q));
  }, [convos, filter, search]);

  const active = filtered.find((c) => c.id === activeId) ?? convos?.find((c) => c.id === activeId) ?? filtered[0] ?? null;

  const { data: messages } = useQuery({
    queryKey: ["messages", active?.id],
    enabled: !!active,
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", active!.id).order("created_at");
      return (data ?? []) as unknown as Message[];
    },
  });

  // ---- mutations ----
  const reply = useServerFn(simulateLeadReplyAndRespond);
  const simulateM = useMutation({
    mutationFn: () => reply({ data: { conversation_id: active!.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", active!.id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("AI replied");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const sendManual = useMutation({
    mutationFn: async (body: string) => {
      if (!active) throw new Error("no conversation");
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("not signed in");
      const { error } = await supabase.from("messages").insert({
        user_id: uid,
        conversation_id: active.id,
        direction: "outbound",
        author: "user",
        body,
        kind: "reply",
      });
      if (error) throw error;
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", active.id);
    },
    onSuccess: () => {
      setComposer("");
      qc.invalidateQueries({ queryKey: ["messages", active!.id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const setStatus = useMutation({
    mutationFn: async (status: string) => {
      if (!active?.lead) throw new Error("no lead");
      const { error } = await supabase.from("leads")
        .update({ status, last_activity_at: new Date().toISOString() })
        .eq("id", active.lead.id);
      if (error) throw error;
    },
    onSuccess: (_d, status) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success(`Marked as ${statusMeta(status).label}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const score = intentScore(active);
  const nba = nextBestAction(active, messages ?? []);
  const objection = detectObjection(messages ?? []);
  const replies = draftReplies(active, messages ?? []);
  const calendly = "https://calendly.com/your-link";
  void profile;

  function useReply(text: string) {
    setComposer(text.replaceAll("{calendly}", calendly));
  }

  return (
    <div>
      <PageHeader
        title="Conversations"
        description="Every reply, guided by your AI Sales Assistant."
      />
      <div className="grid gap-0 px-6 pb-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        {/* ---------- LEFT: INBOX ---------- */}
        <Card className="rounded-2xl rounded-r-none border-r-0 border-border/70">
          <CardContent className="flex h-[calc(100vh-180px)] flex-col p-0">
            <div className="border-b border-border/60 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search leads…"
                  className="h-8 rounded-lg border-border/70 bg-white pl-8 text-[12.5px]"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`rounded-full px-2.5 py-1 text-[10.5px] font-medium transition ${
                      filter === f.id
                        ? "bg-[#0A0A0A] text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="grid h-full place-items-center gap-3 text-center">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                  <div className="text-[12.5px] text-muted-foreground">
                    No conversations.<br />Send an intro from Discovery.
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {filtered.map((c) => {
                    const meta = statusMeta(c.lead?.status);
                    const isActive = active?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setActiveId(c.id)}
                        className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                          isActive ? "bg-neutral-100/80" : "hover:bg-secondary/40"
                        }`}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-neutral-900 to-neutral-700 text-[11px] text-white">
                            {initials(c.lead?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate text-[13px] font-semibold text-neutral-900">
                              {c.lead?.full_name}
                            </div>
                            <div className="shrink-0 text-[10.5px] text-muted-foreground">
                              {timeAgo(c.last_message_at)}
                            </div>
                          </div>
                          <div className="truncate text-[11px] text-muted-foreground">
                            {c.lead?.company ?? c.lead?.headline}
                          </div>
                          <div className="mt-1 truncate text-[11.5px] text-neutral-600">
                            {c.ai_summary ?? "No summary yet"}
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className={`rounded-full border px-1.5 py-0.5 text-[9.5px] font-medium ${meta.tone}`}>
                              {meta.label}
                            </span>
                            {c.intent && c.intent !== "unknown" && (
                              <span className="rounded-full bg-neutral-900/5 px-1.5 py-0.5 text-[9.5px] font-medium text-neutral-700">
                                AI: {c.intent}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ---------- MIDDLE: CHAT ---------- */}
        <Card className="rounded-none border-x-0 border-border/70">
          <CardContent className="flex h-[calc(100vh-180px)] flex-col p-0">
            {!active ? (
              <div className="grid flex-1 place-items-center text-[13px] text-muted-foreground">
                Select a conversation
              </div>
            ) : (
              <>
                {/* header */}
                <div className="border-b border-border/60 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-neutral-900 to-neutral-700 text-[12px] text-white">
                        {initials(active.lead?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[14px] font-semibold">{active.lead?.full_name}</div>
                        <span className={`rounded-full border px-1.5 py-0.5 text-[9.5px] font-medium ${statusMeta(active.lead?.status).tone}`}>
                          {statusMeta(active.lead?.status).label}
                        </span>
                      </div>
                      <div className="truncate text-[11.5px] text-muted-foreground">
                        {active.lead?.headline}{active.lead?.company ? ` · ${active.lead.company}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">AI confidence</div>
                      <div className="text-[15px] font-semibold text-neutral-900">{score}%</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 rounded-lg border-border/70 text-[11px]"
                      onClick={() => setStatus.mutate("interested")}>
                      <ThumbsUp className="mr-1 h-3 w-3" /> Interested
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 rounded-lg border-border/70 text-[11px]"
                      onClick={() => setStatus.mutate("not_interested")}>
                      <ThumbsDown className="mr-1 h-3 w-3" /> Cold
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 rounded-lg border-border/70 text-[11px]"
                      onClick={() => setStatus.mutate("meeting_booked")}>
                      <CalendarCheck className="mr-1 h-3 w-3" /> Push to meeting
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 rounded-lg border-border/70 text-[11px]"
                      onClick={() => setStatus.mutate("archived")}>
                      <Archive className="mr-1 h-3 w-3" /> Archive
                    </Button>
                  </div>
                </div>

                {/* messages */}
                <div className="flex-1 space-y-4 overflow-y-auto bg-[#FAFAFA] px-5 py-5">
                  {(messages ?? []).map((m) => {
                    const mine = m.direction === "outbound";
                    const byAi = m.author === "ai";
                    return (
                      <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                        <div className={`mb-1 flex items-center gap-1.5 text-[10px] ${mine ? "text-neutral-500" : "text-neutral-500"}`}>
                          <span className="font-medium">
                            {byAi ? "AI Agent" : mine ? "You" : active.lead?.full_name}
                          </span>
                          <span>·</span>
                          <span>{timeAgo(m.created_at)}</span>
                          {m.kind && m.kind !== "chat" && m.kind !== "reply" && (
                            <span className="rounded-full bg-neutral-200/70 px-1.5 py-0 text-[9px] uppercase tracking-wide">
                              {m.kind.replace("_", " ")}
                            </span>
                          )}
                        </div>
                        <div className={`max-w-[72%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                          mine
                            ? byAi
                              ? "bg-neutral-900 text-white"
                              : "bg-[#0A0A0A] text-white"
                            : "border border-border/60 bg-white text-neutral-800"
                        }`}>
                          {m.body}
                        </div>
                      </div>
                    );
                  })}
                  {(messages?.length ?? 0) === 0 && (
                    <div className="grid h-full place-items-center text-[12.5px] text-muted-foreground">
                      No messages yet
                    </div>
                  )}
                </div>

                {/* composer */}
                <div className="border-t border-border/60 bg-white p-3">
                  <Textarea
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    placeholder="Write a reply, or pick a suggested one from the right →"
                    className="min-h-[70px] resize-none rounded-xl border-border/70 text-[13px]"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-[10.5px] text-muted-foreground">
                      Enter sends line break · Click Send to reply as you
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm" variant="outline"
                        className="h-8 rounded-lg border-border/70 text-[11.5px]"
                        onClick={() => simulateM.mutate()} disabled={simulateM.isPending}
                      >
                        <Sparkles className="mr-1 h-3 w-3" />
                        {simulateM.isPending ? "Thinking…" : "Simulate reply"}
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 rounded-lg bg-[#0A0A0A] text-[11.5px] hover:bg-[#262626]"
                        disabled={!composer.trim() || sendManual.isPending}
                        onClick={() => sendManual.mutate(composer.trim())}
                      >
                        <Send className="mr-1 h-3 w-3" /> Send
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ---------- RIGHT: AI ASSISTANT ---------- */}
        <Card className="rounded-2xl rounded-l-none border-l-0 border-border/70">
          <CardContent className="flex h-[calc(100vh-180px)] flex-col overflow-y-auto p-0">
            {!active ? (
              <div className="grid flex-1 place-items-center px-6 text-center text-[12.5px] text-muted-foreground">
                <div>
                  <Brain className="mx-auto mb-2 h-6 w-6" />
                  Select a conversation to see AI insights.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {/* AI INSIGHTS */}
                <section className="p-4">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5" />
                    <div className="text-[11px] font-semibold uppercase tracking-wide">AI insights</div>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-neutral-700">
                    {active.ai_summary ?? `${active.lead?.full_name} · ${active.lead?.headline ?? ""}. Waiting on first exchange to build a full profile.`}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Metric label="Intent" value={active.intent ?? "neutral"} />
                    <Metric label="Sentiment" value={score > 65 ? "Positive" : score > 35 ? "Neutral" : "Guarded"} />
                    <Metric label="Engagement" value={(messages?.length ?? 0) > 4 ? "High" : (messages?.length ?? 0) > 1 ? "Medium" : "Low"} />
                    <Metric label="Risk" value={score < 30 ? "High" : score < 60 ? "Medium" : "Low"} />
                  </div>
                </section>

                {/* NEXT BEST ACTION */}
                <section className="p-4">
                  <div className="mb-2 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <div className="text-[11px] font-semibold uppercase tracking-wide">Next best action</div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-neutral-50 p-3">
                    <div className="flex items-center gap-2">
                      <nba.icon className="h-4 w-4 text-neutral-900" />
                      <div className="text-[13px] font-semibold text-neutral-900">{nba.title}</div>
                    </div>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-neutral-600">{nba.hint}</p>
                  </div>
                </section>

                {/* SUGGESTED REPLIES */}
                <section className="p-4">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <div className="text-[11px] font-semibold uppercase tracking-wide">Suggested replies</div>
                  </div>
                  <div className="space-y-2">
                    <ReplyOption label="Short" text={replies.short} onUse={useReply} onSend={(t) => sendManual.mutate(t)} />
                    <ReplyOption label="Medium" text={replies.medium} onUse={useReply} onSend={(t) => sendManual.mutate(t)} />
                    <ReplyOption label="Sales push" text={replies.push} onUse={useReply} onSend={(t) => sendManual.mutate(t)} />
                  </div>
                </section>

                {/* OBJECTION HANDLING */}
                <section className="p-4">
                  <div className="mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <div className="text-[11px] font-semibold uppercase tracking-wide">Objection handling</div>
                  </div>
                  {objection ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <div className="flex items-center gap-1.5">
                        <Badge className="rounded-full bg-amber-100 text-[10px] text-amber-800 hover:bg-amber-100">
                          {objection.label}
                        </Badge>
                      </div>
                      <p className="mt-2 text-[11.5px] leading-relaxed text-amber-900">{objection.strategy}</p>
                    </div>
                  ) : (
                    <p className="text-[11.5px] text-muted-foreground">No objections detected yet.</p>
                  )}
                </section>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-white px-2.5 py-2">
      <div className="text-[9.5px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[12.5px] font-semibold capitalize text-neutral-900">{value}</div>
    </div>
  );
}

function ReplyOption({
  label, text, onUse, onSend,
}: {
  label: string;
  text: string;
  onUse: (t: string) => void;
  onSend: (t: string) => void;
}) {
  const [draft, setDraft] = useState(text);
  const [editing, setEditing] = useState(false);
  return (
    <div className="rounded-xl border border-border/60 bg-white p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</span>
        <div className="flex gap-0.5">
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100"
            title="Edit"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={() => setDraft(text)}
            className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100"
            title="Regenerate"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>
      {editing ? (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-[70px] resize-none rounded-lg border-border/70 text-[12px]"
        />
      ) : (
        <p className="text-[12px] leading-relaxed text-neutral-700">{draft}</p>
      )}
      <div className="mt-2 flex gap-1.5">
        <Button
          size="sm"
          className="h-7 flex-1 rounded-lg bg-[#0A0A0A] text-[11px] hover:bg-[#262626]"
          onClick={() => onSend(draft)}
        >
          <Send className="mr-1 h-3 w-3" /> Send
        </Button>
        <Button
          size="sm" variant="outline"
          className="h-7 rounded-lg border-border/70 text-[11px]"
          onClick={() => onUse(draft)}
        >
          Use <ChevronRight className="ml-0.5 h-3 w-3" />
        </Button>
      </div>
      <Separator className="mt-2 opacity-0" />
    </div>
  );
}
