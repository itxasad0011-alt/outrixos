import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Send, Check, X, Edit3, Search, Paperclip, Calendar as Cal } from "lucide-react";

export const Route = createFileRoute("/_app/conversations")({
  component: Conversations,
});

const threads = [
  { id: 1, name: "Sarah Chen", role: "Loom · Growth", last: "Sounds great — Tue at 10 works.", time: "2m", unread: true, intent: "Interested" },
  { id: 2, name: "Marcus Reed", role: "Ramp · Sales", last: "Can you send pricing?", time: "24m", unread: true, intent: "Warm" },
  { id: 3, name: "Priya Shah", role: "Northwind · CEO", last: "Following up on your note", time: "1h", unread: false, intent: "Reply" },
  { id: 4, name: "David Ortiz", role: "Vantage · COO", last: "Not the right time.", time: "3h", unread: false, intent: "Cold" },
  { id: 5, name: "Julia Park", role: "Blend · RevOps", last: "Interesting — tell me more.", time: "yest", unread: false, intent: "Warm" },
];

const intentTint: Record<string, string> = {
  Interested: "bg-emerald-50 text-emerald-700",
  Warm: "bg-amber-50 text-amber-700",
  Reply: "bg-blue-50 text-blue-700",
  Cold: "bg-slate-100 text-slate-600",
};

function Conversations() {
  const [active, setActive] = useState(1);
  const thread = threads.find((t) => t.id === active)!;

  return (
    <div className="grid h-[calc(100vh-3.5rem)] grid-cols-[320px_1fr_340px]">
      {/* Inbox */}
      <aside className="flex flex-col border-r border-border/60 bg-white">
        <div className="border-b border-border/60 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search conversations" className="h-9 rounded-xl border-border/70 bg-secondary/60 pl-8 text-[13px]" />
          </div>
        </div>
        <div className="flex gap-1 border-b border-border/60 px-3 py-2">
          {["All", "Unread", "Interested", "Follow-up"].map((t, i) => (
            <button key={t} className={`rounded-lg px-2 py-1 text-[11.5px] font-medium ${i === 0 ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.map((t) => (
            <button key={t.id} onClick={() => setActive(t.id)} className={`flex w-full items-start gap-3 border-b border-border/40 p-3 text-left transition ${active === t.id ? "bg-blue-50/60" : "hover:bg-secondary/50"}`}>
              <Avatar className="h-9 w-9"><AvatarFallback className="bg-secondary text-[11px]">{t.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className={`truncate text-[13px] ${t.unread ? "font-semibold" : "font-medium"}`}>{t.name}</span>
                  <span className="text-[10.5px] text-muted-foreground">{t.time}</span>
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">{t.role}</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="line-clamp-1 flex-1 text-[12px] text-muted-foreground">{t.last}</span>
                  {t.unread && <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <section className="flex flex-col bg-[oklch(0.99_0.003_260)]">
        <div className="flex items-center justify-between border-b border-border/60 bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10"><AvatarFallback className="bg-secondary text-[12px]">{thread.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
            <div>
              <div className="text-[14px] font-semibold">{thread.name}</div>
              <div className="text-[11.5px] text-muted-foreground">{thread.role}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`h-6 rounded-full text-[11px] ${intentTint[thread.intent]}`}>{thread.intent}</Badge>
            <Button size="sm" variant="outline" className="h-8 rounded-lg border-border/70 text-[12px]"><Cal className="mr-1 h-3.5 w-3.5" />Book meeting</Button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          <Bubble side="them" text="Hi Sarah — noticed you're scaling GTM at Loom. We built an AI sales agent that's helped 40+ Series B teams run outbound safely. Would you be open to a quick chat?" />
          <Bubble side="me" ai text="Thanks for connecting! Curious how you're handling reply volume today?" />
          <Bubble side="them" text="Honestly it's a mess. Tuesday at 10 works for a call." highlight />
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3 text-[12px] text-blue-900">
            <div className="mb-1 flex items-center gap-1.5 font-semibold"><Sparkles className="h-3.5 w-3.5" /> AI detected meeting intent</div>
            Suggested reply queued for approval below.
          </div>
        </div>

        <div className="border-t border-border/60 bg-white p-4">
          <div className="rounded-2xl border border-border/70 bg-white p-3">
            <div className="mb-2 flex items-center gap-2 text-[11.5px] font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-[#2563EB]" /> AI draft · Confidence 94%
            </div>
            <p className="text-[13px] leading-relaxed">Perfect — I'll send a calendar invite for Tuesday at 10am PST. Anything specific you'd like to cover so I can prep?</p>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-1.5">
                <Button size="sm" className="h-8 rounded-lg bg-[#2563EB] text-[12px] hover:bg-[#1d4fd0]"><Check className="mr-1 h-3.5 w-3.5" />Approve & send</Button>
                <Button size="sm" variant="outline" className="h-8 rounded-lg border-border/70 text-[12px]"><Edit3 className="mr-1 h-3.5 w-3.5" />Edit</Button>
                <Button size="sm" variant="ghost" className="h-8 rounded-lg text-[12px]"><X className="mr-1 h-3.5 w-3.5" />Reject</Button>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg"><Paperclip className="h-3.5 w-3.5" /></Button>
                <Button size="icon" className="h-8 w-8 rounded-lg bg-neutral-900"><Send className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI panel */}
      <aside className="overflow-y-auto border-l border-border/60 bg-white">
        <div className="space-y-4 p-5">
          <Card className="rounded-2xl border-border/60 shadow-none">
            <CardContent className="space-y-2 p-4">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Prospect summary</div>
              <div className="text-[13px]">Sarah leads growth at Loom. Recently posted about scaling outbound. Decision maker; strong ICP fit.</div>
              <div className="flex flex-wrap gap-1 pt-1">
                {["Growth", "SaaS", "Series B", "SF"].map((t) => <span key={t} className="rounded-lg bg-secondary px-2 py-0.5 text-[10.5px] font-medium">{t}</span>)}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-none">
            <CardContent className="space-y-3 p-4">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Signals</div>
              <Row label="Intent" value="Interested" tint="text-emerald-700" />
              <Row label="Confidence" value="94%" />
              <Row label="Meeting opportunity" value="High" tint="text-emerald-700" />
              <Row label="Tone used" value="Founder · Friendly" />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-none">
            <CardContent className="p-4">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Knowledge used</div>
              <ul className="space-y-1.5 text-[12.5px]">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />Pricing · Growth tier</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />Case study · Ramp</li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />Founder tone template</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-none">
            <CardContent className="p-4">
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Suggested replies</div>
              <div className="space-y-2">
                {[
                  "Great! Sending an invite for Tue 10am PST.",
                  "Would you prefer Google Meet or Zoom?",
                  "Want me to include a quick agenda?",
                ].map((s) => (
                  <button key={s} className="w-full rounded-xl border border-border/60 bg-white p-2.5 text-left text-[12.5px] transition hover:border-blue-300 hover:bg-blue-50/40">{s}</button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </aside>
    </div>
  );
}

function Bubble({ side, text, ai, highlight }: { side: "me" | "them"; text: string; ai?: boolean; highlight?: boolean }) {
  const isMe = side === "me";
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${isMe ? "bg-[#2563EB] text-white" : highlight ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-white border border-border/60"}`}>
        {ai && <div className="mb-1 text-[10.5px] font-medium opacity-80">AI</div>}
        {text}
      </div>
    </div>
  );
}

function Row({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${tint ?? ""}`}>{value}</span>
    </div>
  );
}

// keep Separator import used
void Separator;
