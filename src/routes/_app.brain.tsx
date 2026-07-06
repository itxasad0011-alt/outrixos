import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Play, Save, Wand2, Brain } from "lucide-react";

export const Route = createFileRoute("/_app/brain")({
  component: SalesBrain,
});

const tones = ["Professional", "Founder", "Consultant", "Friendly", "Luxury", "Minimal", "Technical", "Custom"];

function SalesBrain() {
  return (
    <div>
      <PageHeader
        title="AI Sales Brain"
        description="The control center for how your AI thinks, writes, and closes."
        actions={
          <>
            <Button variant="outline" className="h-9 rounded-xl border-border/70 bg-white text-[12.5px]"><Play className="mr-1.5 h-3.5 w-3.5" />Test AI</Button>
            <Button variant="outline" className="h-9 rounded-xl border-border/70 bg-white text-[12.5px]"><Wand2 className="mr-1.5 h-3.5 w-3.5" />Improve prompt</Button>
            <Button className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]"><Save className="mr-1.5 h-3.5 w-3.5" />Save</Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 p-8 lg:grid-cols-[1fr_380px]">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="p-0">
            <Tabs defaultValue="instructions">
              <div className="border-b border-border/60 px-4 pt-3">
                <TabsList className="rounded-xl bg-secondary">
                  <TabsTrigger value="instructions" className="rounded-lg text-[12.5px]">Instructions</TabsTrigger>
                  <TabsTrigger value="knowledge" className="rounded-lg text-[12.5px]">Knowledge</TabsTrigger>
                  <TabsTrigger value="memory" className="rounded-lg text-[12.5px]">Memory</TabsTrigger>
                  <TabsTrigger value="tone" className="rounded-lg text-[12.5px]">Tone</TabsTrigger>
                  <TabsTrigger value="behavior" className="rounded-lg text-[12.5px]">Behavior</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="instructions" className="space-y-4 p-6">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold">Core instructions</label>
                  <Textarea rows={8} className="rounded-xl border-border/70 text-[13px]" defaultValue="You are Alex's AI sales agent representing Acme Studio. Speak like a friendly founder. Never oversell. Always confirm the prospect's problem before proposing a solution. Never mention pricing unless asked. If a prospect shows interest, propose a 20-minute discovery call using the Calendly link." />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold">Things AI should avoid</label>
                  <Textarea rows={4} className="rounded-xl border-border/70 text-[13px]" defaultValue="No aggressive follow-ups. No emojis. Never claim we're the cheapest. Do not book meetings after 6pm PST." />
                </div>
              </TabsContent>

              <TabsContent value="tone" className="space-y-4 p-6">
                <div className="flex flex-wrap gap-2">
                  {tones.map((t, i) => (
                    <button key={t} className={`rounded-xl border px-3 py-1.5 text-[12.5px] font-medium transition ${i === 1 ? "border-[#2563EB] bg-blue-50 text-[#2563EB]" : "border-border/70 bg-white text-foreground hover:border-blue-300"}`}>{t}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <SliderRow label="Warmth" value={70} />
                  <SliderRow label="Formality" value={40} />
                  <SliderRow label="Directness" value={65} />
                  <SliderRow label="Enthusiasm" value={55} />
                </div>
              </TabsContent>

              <TabsContent value="memory" className="p-6">
                <div className="space-y-3">
                  {[
                    { t: "Loves data-driven pitches for RevOps leaders", w: "94%" },
                    { t: "'Book a quick chat' converts 2× vs 'Demo'", w: "89%" },
                    { t: "Common objection: 'We already use Apollo' — reply with integration angle", w: "82%" },
                  ].map((m) => (
                    <div key={m.t} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><Brain className="h-4 w-4" /></div>
                      <div className="flex-1 text-[12.5px]">{m.t}</div>
                      <Badge variant="secondary" className="rounded-full bg-emerald-50 text-[11px] text-emerald-700">{m.w}</Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="knowledge" className="p-6 text-[13px] text-muted-foreground">Linked to Knowledge Base — 12 documents, 3 links indexed.</TabsContent>
              <TabsContent value="behavior" className="space-y-4 p-6">
                <SliderRow label="Follow-up persistence" value={40} />
                <SliderRow label="Time-of-day sensitivity" value={80} />
                <SliderRow label="Ask discovery questions" value={70} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-2xl border-border/60 bg-gradient-to-br from-neutral-950 to-neutral-800 text-white shadow-none">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/10"><Sparkles className="h-3.5 w-3.5" /></div>
                <span className="text-[13px] font-semibold">Prompt preview</span>
                <Badge className="ml-auto rounded-full bg-white/10 text-[10px] text-white hover:bg-white/10">v14</Badge>
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-black/40 p-3 text-[11.5px] leading-relaxed text-white/80">{`You are Alex Morgan's AI sales agent at Acme Studio.
Voice: founder, warm, direct.
Goal: book qualified 20-min discovery calls.
Context: ${'{{knowledge_base}}'}
Prospect: ${'{{lead_profile}}'}
Rules:
 - Never mention pricing unsolicited
 - Never book meetings after 18:00 PST
 - If competitor mentioned → integration angle`}
              </pre>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-white shadow-none">
            <CardContent className="space-y-3 p-5">
              <div className="text-[13.5px] font-semibold">Confidence</div>
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16">
                  <svg viewBox="0 0 36 36" className="h-full w-full">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="oklch(0.94 0.005 260)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#2563EB" strokeWidth="3" strokeDasharray="88 100" strokeLinecap="round" transform="rotate(-90 18 18)" />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center text-[13px] font-semibold">88%</div>
                </div>
                <div className="text-[12px] text-muted-foreground">Based on 1,240 sent messages, 47% acceptance, and 23% reply rate.</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[12px]"><span className="font-medium">{label}</span><span className="text-muted-foreground">{value}%</span></div>
      <Slider defaultValue={[value]} max={100} step={1} />
    </div>
  );
}
