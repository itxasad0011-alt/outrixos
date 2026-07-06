import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, Pause, Play, StopCircle, Repeat, Edit3 } from "lucide-react";

export const Route = createFileRoute("/_app/followups")({
  component: Followups,
});

const timeline = [
  { day: "Day 2–3", label: "Follow-up 1", tone: "Soft nudge", preview: "Hey {{first_name}} — just floating this back up in case it got buried!", active: true, count: 42 },
  { day: "Day 5–7", label: "Follow-up 2", tone: "Add value", preview: "Sharing a quick case study with a team similar to {{company}}…", active: true, count: 28 },
  { day: "Day 9–12", label: "Follow-up 3", tone: "Direct ask", preview: "Would a 15-min chat next week make sense, or should I circle back next quarter?", active: true, count: 14 },
  { day: "Day 15+", label: "Final follow-up", tone: "Break-up", preview: "I don't want to keep pinging — closing the loop here. Door's open whenever!", active: false, count: 6 },
];

const upcoming = [
  { name: "Sarah Chen", company: "Loom", step: "Follow-up 2", when: "in 4h" },
  { name: "Marcus Reed", company: "Ramp", step: "Follow-up 1", when: "tomorrow" },
  { name: "Julia Park", company: "Blend", step: "Follow-up 3", when: "in 2d" },
  { name: "Ethan Wolfe", company: "Cascade", step: "Final", when: "in 5d" },
];

function Followups() {
  return (
    <div>
      <PageHeader
        title="Follow-ups"
        description="AI-driven follow-up sequence. Stops automatically after no response."
        actions={
          <>
            <Button variant="outline" className="h-9 rounded-xl border-border/70 bg-white text-[12.5px]"><Pause className="mr-1.5 h-3.5 w-3.5" />Pause sequence</Button>
            <Button className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]"><Edit3 className="mr-1.5 h-3.5 w-3.5" />Edit templates</Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 p-8 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none lg:col-span-2">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2 text-[13.5px] font-semibold"><Repeat className="h-4 w-4" /> Sequence timeline</div>
            <div className="relative">
              <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border/70" />
              <ol className="space-y-4">
                {timeline.map((t, i) => (
                  <li key={t.label} className="relative flex items-start gap-4">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-2 ring-4 ring-white ${t.active ? "border-[#2563EB] bg-blue-50 text-[#2563EB]" : "border-border/70 bg-white text-muted-foreground"}`}>
                      <span className="text-[12px] font-semibold">{i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1 rounded-2xl border border-border/60 bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13.5px] font-semibold">{t.label}</span>
                        <Badge variant="secondary" className="rounded-full bg-secondary text-[10.5px]"><Clock className="mr-1 h-2.5 w-2.5" />{t.day}</Badge>
                        <Badge variant="secondary" className="rounded-full bg-blue-50 text-[10.5px] text-blue-700">{t.tone}</Badge>
                        <span className="ml-auto text-[11px] text-muted-foreground">{t.count} pending</span>
                      </div>
                      <div className="mt-2 rounded-xl border border-border/60 bg-secondary/40 p-3 text-[12.5px] leading-relaxed text-foreground">{t.preview}</div>
                      <div className="mt-3 flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 rounded-lg border-border/70 text-[11.5px]"><Edit3 className="mr-1 h-3 w-3" />Edit</Button>
                        {t.active ? (
                          <Button size="sm" variant="ghost" className="h-7 rounded-lg text-[11.5px] text-muted-foreground"><Pause className="mr-1 h-3 w-3" />Pause step</Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 rounded-lg text-[11.5px] text-muted-foreground"><Play className="mr-1 h-3 w-3" />Enable</Button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
                <li className="relative flex items-start gap-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-2 border-slate-200 bg-white text-slate-400 ring-4 ring-white">
                    <StopCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl border border-dashed border-border/70 bg-secondary/30 p-4">
                    <div className="text-[13px] font-semibold">Move to Cold Leads</div>
                    <div className="text-[12px] text-muted-foreground">If no response after the final follow-up, the lead is automatically marked cold and preserved in CRM.</div>
                  </div>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="p-0">
            <div className="border-b border-border/60 p-4">
              <div className="text-[13.5px] font-semibold">Scheduled follow-ups</div>
              <div className="text-[11.5px] text-muted-foreground">{upcoming.length} queued</div>
            </div>
            <Tabs defaultValue="upcoming" className="p-4">
              <TabsList className="rounded-xl bg-secondary">
                <TabsTrigger value="upcoming" className="rounded-lg text-[12px]">Upcoming</TabsTrigger>
                <TabsTrigger value="sent" className="rounded-lg text-[12px]">Sent</TabsTrigger>
                <TabsTrigger value="stopped" className="rounded-lg text-[12px]">Stopped</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="pt-3">
                <div className="divide-y divide-border/60">
                  {upcoming.map((u) => (
                    <div key={u.name} className="flex items-center gap-3 py-3">
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-secondary text-[11px]">{u.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-medium">{u.name}</div>
                        <div className="text-[11px] text-muted-foreground">{u.company}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-medium text-blue-700">{u.step}</div>
                        <div className="text-[10.5px] text-muted-foreground">{u.when}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="sent"><div className="py-6 text-center text-[12.5px] text-muted-foreground">142 follow-ups sent this month.</div></TabsContent>
              <TabsContent value="stopped"><div className="py-6 text-center text-[12.5px] text-muted-foreground">28 sequences ended · no response.</div></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
