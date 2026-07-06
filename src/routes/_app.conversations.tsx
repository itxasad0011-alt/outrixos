import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { simulateLeadReplyAndRespond } from "@/lib/ai/agent.functions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/conversations")({ component: ConvosPage });

type Convo = {
  id: string;
  intent: string | null;
  ai_summary: string | null;
  last_message_at: string | null;
  lead: { id: string; full_name: string; company: string | null; headline: string | null } | null;
};

function ConvosPage() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: convos } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data } = await supabase.from("conversations")
        .select("id, intent, ai_summary, last_message_at, lead:leads(id, full_name, company, headline)")
        .order("last_message_at", { ascending: false, nullsFirst: false });
      return (data ?? []) as unknown as Convo[];
    },
  });

  const active = convos?.find((c) => c.id === activeId) ?? convos?.[0] ?? null;

  const { data: messages } = useQuery({
    queryKey: ["messages", active?.id],
    enabled: !!active,
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("*").eq("conversation_id", active!.id).order("created_at");
      return data ?? [];
    },
  });

  const reply = useServerFn(simulateLeadReplyAndRespond);
  const simulateM = useMutation({
    mutationFn: () => reply({ data: { conversation_id: active!.id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", active!.id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div>
      <PageHeader title="Conversations" description="The AI handles replies, objections, trust-building. If pricing comes up, it pushes a meeting." />
      <div className="grid gap-0 px-8 py-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="rounded-2xl rounded-r-none border-r-0 border-border/70">
          <CardContent className="p-0">
            {(convos?.length ?? 0) === 0 ? (
              <div className="grid place-items-center gap-3 py-16 text-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
                <div className="text-[12.5px] text-muted-foreground">No conversations yet.<br />Send an intro from Discovery.</div>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {convos!.map((c) => (
                  <button key={c.id} onClick={() => setActiveId(c.id)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left ${active?.id === c.id ? "bg-blue-50/50" : "hover:bg-secondary/40"}`}>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] text-white">
                        {c.lead?.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("") ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-[13px] font-semibold">{c.lead?.full_name}</div>
                        {c.intent && c.intent !== "unknown" && (
                          <Badge className="rounded-full text-[10px] capitalize">{c.intent}</Badge>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">{c.ai_summary ?? c.lead?.headline}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl rounded-l-none border-border/70">
          <CardContent className="flex h-[calc(100vh-260px)] flex-col p-0">
            {!active ? (
              <div className="grid flex-1 place-items-center text-[13px] text-muted-foreground">Select a conversation</div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-border/60 px-5 py-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] text-white">
                      {active.lead?.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("") ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold">{active.lead?.full_name}</div>
                    <div className="truncate text-[11.5px] text-muted-foreground">{active.lead?.headline}</div>
                  </div>
                  <Button size="sm" onClick={() => simulateM.mutate()} disabled={simulateM.isPending}
                    className="h-8 rounded-lg bg-[#2563EB] text-[11.5px] hover:bg-[#1d4fd0]">
                    <Sparkles className="mr-1 h-3 w-3" />
                    {simulateM.isPending ? "Thinking…" : "Simulate reply"}
                  </Button>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  {(messages ?? []).map((m) => {
                    const mine = m.direction === "outbound";
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[13px] ${mine ? "bg-[#2563EB] text-white" : "bg-secondary"}`}>
                          {m.kind && m.kind !== "chat" && (
                            <div className={`mb-1 text-[10px] uppercase tracking-wide ${mine ? "text-white/70" : "text-muted-foreground"}`}>
                              {m.kind.replace("_", " ")}
                            </div>
                          )}
                          <div className="whitespace-pre-wrap">{m.body}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-border/60 px-5 py-3 text-[11.5px] text-muted-foreground">
                  <Send className="mr-1 inline h-3 w-3" />
                  AI agent handles every reply automatically. Click "Simulate reply" to test the engine.
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
