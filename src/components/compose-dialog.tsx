import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  draftConnectionNote,
  draftIntroMessage,
  sendConnectionRequest,
  sendIntroMessage,
} from "@/lib/ai/compose.functions";

type Mode = "connection" | "intro";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: { id: string; full_name: string; company?: string | null; headline?: string | null } | null;
  mode: Mode;
};

export function ComposeDialog({ open, onOpenChange, lead, mode }: Props) {
  const qc = useQueryClient();
  const draftNote = useServerFn(draftConnectionNote);
  const draftMsg = useServerFn(draftIntroMessage);
  const sendNote = useServerFn(sendConnectionRequest);
  const sendMsg = useServerFn(sendIntroMessage);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const isConn = mode === "connection";
  const maxLen = isConn ? 280 : 2000;

  const generate = async () => {
    if (!lead) return;
    setLoading(true);
    try {
      const res = isConn
        ? await draftNote({ data: { lead_id: lead.id } })
        : await draftMsg({ data: { lead_id: lead.id } });
      setText(isConn ? (res as { note: string }).note : (res as { message: string }).message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI draft failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && lead) {
      setText("");
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id, mode]);

  const sendM = useMutation({
    mutationFn: async () => {
      if (!lead) throw new Error("No lead");
      if (isConn) return sendNote({ data: { lead_id: lead.id, note: text.trim() } });
      return sendMsg({ data: { lead_id: lead.id, message: text.trim() } });
    },
    onSuccess: () => {
      toast.success(isConn ? "Connection request sent" : "Intro message sent");
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      qc.invalidateQueries({ queryKey: ["action-queue"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Send failed"),
  });

  const over = text.length > maxLen;
  const canSend = text.trim().length > 0 && !over && !loading && !sendM.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] rounded-2xl p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#0A0A0A] text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <DialogTitle className="text-[15px] font-semibold tracking-tight">
                {isConn ? "AI Connection Note" : "AI Intro Message"}
              </DialogTitle>
            </div>
            {lead && (
              <DialogDescription className="text-[12.5px] text-muted-foreground pt-1">
                To <span className="text-foreground font-medium">{lead.full_name}</span>
                {lead.company ? <span> · {lead.company}</span> : null}
              </DialogDescription>
            )}
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div className="relative">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={loading ? "Generating…" : "Your message will appear here"}
              className="min-h-[160px] resize-none rounded-xl border-border/70 text-[13.5px] leading-relaxed focus-visible:ring-1 focus-visible:ring-[#0A0A0A]"
              disabled={loading}
            />
            {loading && (
              <div className="absolute inset-0 grid place-items-center rounded-xl bg-white/70 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> AI is drafting…
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={generate}
              disabled={loading}
              className="h-7 rounded-lg px-2 text-[11.5px] text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Regenerate
            </Button>
            <Badge
              variant="secondary"
              className={`rounded-full text-[10.5px] ${over ? "bg-red-50 text-red-700 border-red-200" : ""}`}
            >
              {text.length}/{maxLen}
            </Badge>
          </div>
        </div>

        <DialogFooter className="gap-2 px-6 py-4 border-t border-border/60 bg-neutral-50/50">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-9 rounded-lg text-[12.5px]">
            Cancel
          </Button>
          <Button
            onClick={() => sendM.mutate()}
            disabled={!canSend}
            className="h-9 rounded-lg bg-[#0A0A0A] px-3 text-[12.5px] hover:bg-[#262626]"
          >
            {sendM.isPending ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Sending…</>
            ) : (
              <><Send className="mr-1.5 h-3.5 w-3.5" /> {isConn ? "Send connection request" : "Send message"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
