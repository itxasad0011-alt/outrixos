import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles, ExternalLink, Building2, Briefcase, MessageSquare, Bot, User as UserIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type Lead = Tables<"leads">;
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

export type StatusTone = {
  label: string;
  className: string;
};

export function LeadDrawer({
  lead, onClose, tone, aiFallback, actions,
}: {
  lead: Lead | null;
  onClose: () => void;
  tone: StatusTone;
  aiFallback: string;
  actions: ReactNode;
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
                    <Badge className={`rounded-full text-[10.5px] ${tone.className}`}>{tone.label}</Badge>
                    {lead.industry && <Badge variant="secondary" className="rounded-full text-[10.5px]">{lead.industry}</Badge>}
                    {lead.icp_score != null && <Badge variant="outline" className="rounded-full text-[10.5px]">ICP {lead.icp_score}</Badge>}
                  </div>
                </div>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="px-6 py-5 space-y-6">
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

                <section className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="h-3 w-3" /> AI summary
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background p-3 text-[12.5px] leading-relaxed">
                    {convo?.ai_summary ? convo.ai_summary : (
                      <span className="text-muted-foreground">{lead.status_reason ?? aiFallback}</span>
                    )}
                    {convo?.intent && (
                      <div className="mt-2">
                        <Badge variant="outline" className="rounded-full text-[10px] capitalize">Intent: {convo.intent}</Badge>
                      </div>
                    )}
                  </div>
                </section>

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
            <div className="p-4">{actions}</div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl border border-border/70 bg-card p-4 transition hover:border-foreground/20 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={lead.avatar_url ?? undefined} />
          <AvatarFallback className="text-[11px]">{initials(lead.full_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-[13.5px] font-medium">{lead.full_name}</div>
            {lead.icp_score != null && (
              <Badge variant="secondary" className="rounded-full text-[10px]">{lead.icp_score}</Badge>
            )}
          </div>
          <div className="truncate text-[11.5px] text-muted-foreground">
            {lead.role ?? "—"}{lead.company ? ` · ${lead.company}` : ""}
          </div>
        </div>
      </div>
      {lead.headline && (
        <p className="mt-3 line-clamp-2 text-[12px] text-muted-foreground">{lead.headline}</p>
      )}
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Building2 className="h-3 w-3" />{lead.industry ?? "—"}
        </span>
        <span>{timeAgo(lead.last_activity_at)}</span>
      </div>
    </button>
  );
}

export { initials, timeAgo };
