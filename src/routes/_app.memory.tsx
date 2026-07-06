import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, MessageSquareQuote, AlertTriangle, ThumbsUp, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/memory")({
  component: Memory,
});

const winning = [
  { text: "Hey {{first_name}} — noticed {{company}} just shipped {{launch}}. Quick idea…", rate: "34%", uses: 128 },
  { text: "Would a 15-min chat make sense to compare notes on GTM?", rate: "29%", uses: 92 },
  { text: "Sharing a Loom of what we did for {{similar_company}} — 60 seconds.", rate: "26%", uses: 74 },
];

const objections = [
  { text: "'We already use Apollo/Clay/Outreach'", count: 42, reply: "Position as complement, not replacement — integration angle." },
  { text: "'Send me pricing'", count: 38, reply: "Send tier ranges + a 3-question qualifier before deep dive." },
  { text: "'Not the right time'", count: 27, reply: "Ask for permission to circle back in 60 days. Log timing." },
];

const patterns = [
  { text: "Founders reply 2.3× more when message starts with a specific observation about their post", conf: 91 },
  { text: "Tuesday and Thursday mornings (9–11am local) outperform other windows by 18%", conf: 88 },
  { text: "Prospects who accept within 24h are 3.4× more likely to convert to meeting", conf: 84 },
];

const timeline = [
  { d: "Nov 18", t: "Learned: 'Book a chat' converts 2× vs 'Demo'." },
  { d: "Nov 12", t: "Added new objection pattern: 'Budget frozen Q4'." },
  { d: "Nov 03", t: "Retired underperforming opener (12% acceptance)." },
  { d: "Oct 24", t: "Learned: Founder tone > Consultant tone for SaaS ICP." },
];

function Memory() {
  return (
    <div>
      <PageHeader
        title="AI Memory"
        description="What your AI has learned across every conversation, message, and outcome."
        actions={<Button variant="outline" className="h-9 rounded-xl border-border/70 bg-white text-[12.5px]">Export learnings</Button>}
      />
      <div className="grid grid-cols-1 gap-4 p-8 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2 text-[13.5px] font-semibold"><ThumbsUp className="h-4 w-4 text-emerald-600" /> Best performing messages</div>
            <div className="space-y-2">
              {winning.map((w) => (
                <div key={w.text} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                  <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1 text-[12.5px] leading-relaxed">{w.text}</div>
                  <div className="text-right">
                    <div className="text-[13px] font-semibold text-emerald-700">{w.rate}</div>
                    <div className="text-[10.5px] text-muted-foreground">{w.uses} uses</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2 text-[13.5px] font-semibold"><AlertTriangle className="h-4 w-4 text-amber-600" /> Common objections</div>
            <div className="space-y-2">
              {objections.map((o) => (
                <div key={o.text} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-medium">{o.text}</span>
                    <Badge variant="secondary" className="rounded-full bg-secondary text-[10.5px]">{o.count}×</Badge>
                  </div>
                  <div className="mt-1.5 text-[11.5px] text-muted-foreground">→ {o.reply}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2 text-[13.5px] font-semibold"><TrendingUp className="h-4 w-4 text-blue-600" /> Behavior patterns</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-1">
              {patterns.map((p) => (
                <div key={p.text} className="flex items-start gap-3 rounded-xl border border-border/60 bg-gradient-to-br from-blue-50/50 to-white p-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white shadow-sm"><Brain className="h-4 w-4 text-[#2563EB]" /></div>
                  <div className="flex-1 text-[12.5px]">{p.text}</div>
                  <Badge variant="secondary" className="rounded-full bg-emerald-50 text-[10.5px] text-emerald-700">{p.conf}%</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13.5px] font-semibold">Learning timeline</div>
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="relative">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border/70" />
              <ul className="space-y-3">
                {timeline.map((t) => (
                  <li key={t.d} className="relative flex gap-3">
                    <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[#2563EB] bg-white" />
                    <div>
                      <div className="text-[11px] text-muted-foreground">{t.d}</div>
                      <div className="text-[12.5px]">{t.t}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
