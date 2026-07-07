import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Search, Sparkles, ExternalLink, Building2, Briefcase, TrendingUp,
  CalendarPlus, Flame, XCircle, MessageSquare, Bot, User as UserIcon,
} from "lucide-react";

type Lead = Tables<"leads">;
type Conversation = Tables<"conversations">;
type Message = Tables<"messages">;

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function InterestedPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState<string>("all");
  const [sort, setSort] = useState<"recent" | "score" | "name">("recent");
  const [openLead, setOpenLead] = useState<Lead | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", "interested"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads").select("*").eq("status", "interested");
      if (error) throw error;
      return (data ?? []) as Lead[];
    },
  });

  const industries = useMemo(
    () => Array.from(new Set(leads.map((l) => l.industry).filter(Boolean))) as string[],
    [leads],
  );

  const filtered = useMemo(() => {
    let out = leads.filter((l) => {
      const q = search.trim().toLowerCase();
      if (q && !`${l.full_name} ${l.company ?? ""} ${l.role ?? ""}`.toLowerCase().includes(q)) return false;
      if (industry !== "all" && l.industry !== industry) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sort === "score") return (b.icp_score ?? 0) - (a.icp_score ?? 0);
      if (sort === "name") return a.full_name.localeCompare(b.full_name);
      const ta = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
      const tb = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
      return tb - ta;
    });
    return out;
  }, [leads, search, industry, sort]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`Moved to ${v.status.replace("_", " ")}`);
      qc.invalidateQueries({ queryKey: ["leads"] });
      setOpenLead(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scheduleMeeting = useMutation({
    mutationFn: async (lead: Lead) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in");
      const scheduled = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();
      const { error: mErr } = await supabase.from("meetings").insert({
        user_id: user.user.id, lead_id: lead.id, scheduled_at: scheduled, status: "proposed",
      });
      if (mErr) throw mErr;
      const { error: lErr } = await supabase.from("leads")
        .update({ status: "meeting" }).eq("id", lead.id);
      if (lErr) throw lErr;
    },
    onSuccess: () => {
      toast.success("Meeting scheduled");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["meetings"] });
      setOpenLead(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="Interested"
        description="Leads that showed buying intent — ready to convert."
        actions={
          <Badge variant="secondary" className="rounded-full text-[11px]">
            <TrendingUp className="mr-1 h-3 w-3" /> {filtered.length} active
          </Badge>
        }
      />

      <div className="px-8 py-6 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, company, role…"
              className="pl-9 h-9 rounded-xl"
            />
          </div>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger className="h-9 w-[180px] rounded-xl"><SelectValue placeholder="Industry" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All industries</SelectItem>
              {industries.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="h-9 w-[160px] rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="score">Highest ICP score</SelectItem>
              <SelectItem value="name">Name (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-2xl border border-border/60 bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border-border/70">
            <CardContent className="grid place-items-center gap-2 py-16 text-center">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-[14px] font-medium">No interested leads yet</div>
              <div className="text-[12.5px] text-muted-foreground max-w-sm">
                As the AI qualifies your conversations, hot leads will land here automatically.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((l) => (
              <button
                key={l.id}
                onClick={() => setOpenLead(l)}
                className="group text-left rounded-2xl border border-border/70 bg-card p-4 transition hover:border-foreground/20 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={l.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[11px]">{initials(l.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[13.5px] font-medium">{l.full_name}</div>
                      {l.icp_score != null && (
                        <Badge variant="secondary" className="rounded-full text-[10px]">
                          {l.icp_score}
                        </Badge>
                      )}
                    </div>
                    <div className="truncate text-[11.5px] text-muted-foreground">
                      {l.role ?? "—"}{l.company ? ` · ${l.company}` : ""}
                    </div>
                  </div>
                </div>
                {l.headline && (
                  <p className="mt-3 line-clamp-2 text-[12px] text-muted-foreground">{l.headline}</p>
                )}
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3" />{l.industry ?? "—"}
                  </span>
                  <span>{timeAgo(l.last_activity_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <LeadDrawer
        lead={openLead}
        onClose={() => setOpenLead(null)}
        onMeeting={(l) => scheduleMeeting.mutate(l)}
        onWarm={(l) => updateStatus.mutate({ id: l.id, status: "warm" })}
        onNot={(l) => updateStatus.mutate({ id: l.id, status: "not_interested" })}
        busy={updateStatus.isPending || scheduleMeeting.isPending}
      />
    </div>
  );
}

function LeadDrawer({
  lead, onClose, onMeeting, onWarm, onNot, busy,
}: {
  lead: Lead | null;
  onClose: () => void;
  onMeeting: (l: Lead) => void;
  onWarm: (l: Lead) => void;
  onNot: (l: Lead) => void;
  busy: boolean;
}) {
  const { data: convo } = useQuery({
    queryKey: ["conversation", lead?.id],
    enabled: !!lead,
    queryFn: async () => {
      const { data } = await supabase
        .from("conversations").select("*").eq("lead_id", lead!.id)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1).maybeSingle();
      return data as Conversation | null;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", convo?.id],
    enabled: !!convo?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages").select("*").eq("conversation_id", convo!.id)
        .order("created_at", { ascending: true });
      return (data ?? []) as Message[];
    },
  });

  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[520px] p-0 flex flex-col">
        {lead && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={lead.avatar_url ?? undefined} />
                  <AvatarFallback>{initials(lead.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-[16px]">{lead.full_name}</SheetTitle>
                  <div className="mt-0.5 text-[12px] text-muted-foreground truncate">
                    {lead.role ?? "—"}{lead.company ? ` · ${lead.company}` : ""}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge className="rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 text-[10.5px]">Interested</Badge>
                    {lead.industry && <Badge variant="secondary" className="rounded-full text-[10.5px]">{lead.industry}</Badge>}
                    {lead.icp_score != null && <Badge variant="outline" className="rounded-full text-[10.5px]">ICP {lead.icp_score}</Badge>}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="px-6 py-5 space-y-6">
                {/* LinkedIn info */}
                <section className="space-y-2">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">LinkedIn</div>
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2 text-[12.5px]">
                    {lead.headline && <div className="text-foreground">{lead.headline}</div>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                      {lead.company && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{lead.company}</span>}
                      {lead.role && <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{lead.role}</span>}
                    </div>
                    {lead.linkedin_url ? (
                      <a href={lead.linkedin_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] text-foreground/80 hover:text-foreground">
                        View profile <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <div className="text-[11.5px] text-muted-foreground">No LinkedIn URL on file.</div>
                    )}
                  </div>
                </section>

                {/* AI summary */}
                <section className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="h-3 w-3" /> AI summary
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background p-3 text-[12.5px] leading-relaxed">
                    {convo?.ai_summary ? (
                      convo.ai_summary
                    ) : (
                      <span className="text-muted-foreground">
                        {lead.status_reason ??
                          "Lead is showing positive signals. Recommend booking a discovery call within 48 hours to convert intent into a meeting."}
                      </span>
                    )}
                    {convo?.intent && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <Badge variant="outline" className="rounded-full text-[10px] capitalize">
                          Intent: {convo.intent}
                        </Badge>
                      </div>
                    )}
                  </div>
                </section>

                {/* Conversation history */}
                <section className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <MessageSquare className="h-3 w-3" /> Conversation history
                  </div>
                  {messages.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-[12px] text-muted-foreground">
                      No messages yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {messages.map((m) => {
                        const inbound = m.direction === "inbound";
                        const isAI = m.author === "ai";
                        return (
                          <div key={m.id} className={`flex gap-2 ${inbound ? "" : "flex-row-reverse"}`}>
                            <div className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${isAI ? "bg-foreground text-background" : "bg-muted"}`}>
                              {isAI ? <Bot className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                            </div>
                            <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed ${
                              inbound ? "bg-muted/60" : "bg-foreground text-background"
                            }`}>
                              <div>{m.body}</div>
                              <div className={`mt-1 text-[10px] ${inbound ? "text-muted-foreground" : "text-background/60"}`}>
                                {timeAgo(m.created_at)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </ScrollArea>

            <Separator />
            <div className="grid grid-cols-3 gap-2 p-4">
              <Button size="sm" disabled={busy} onClick={() => onMeeting(lead)} className="rounded-xl">
                <CalendarPlus className="mr-1.5 h-3.5 w-3.5" /> Meeting
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => onWarm(lead)} className="rounded-xl">
                <Flame className="mr-1.5 h-3.5 w-3.5" /> Warm
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onNot(lead)} className="rounded-xl">
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Not fit
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export const Route = createFileRoute("/_app/interested")({
  component: InterestedPage,
});
