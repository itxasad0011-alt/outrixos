import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as Cal, Video, Sparkles, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/meetings")({
  component: Meetings,
});

const upcoming = [
  { name: "Sarah Chen", company: "Loom", time: "Today · 10:00 – 10:30", type: "Discovery", by: "AI" },
  { name: "Julia Park", company: "Blend", time: "Tomorrow · 14:30 – 15:00", type: "Demo", by: "AI" },
  { name: "Ethan Wolfe", company: "Cascade", time: "Fri · 09:00 – 09:45", type: "Follow-up", by: "You" },
];

function Meetings() {
  const days = Array.from({ length: 35 }, (_, i) => i - 2);
  return (
    <div>
      <PageHeader
        title="Meetings"
        description="Calendar of every meeting your AI has booked and completed."
        actions={<Button className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]"><Plus className="mr-1.5 h-3.5 w-3.5" />New meeting</Button>}
      />
      <div className="grid grid-cols-1 gap-4 p-8 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-[15px] font-semibold">November 2026</CardTitle>
            <Tabs defaultValue="month"><TabsList className="rounded-xl bg-secondary"><TabsTrigger value="month" className="rounded-lg text-[12px]">Month</TabsTrigger><TabsTrigger value="week" className="rounded-lg text-[12px]">Week</TabsTrigger><TabsTrigger value="day" className="rounded-lg text-[12px]">Day</TabsTrigger></TabsList></Tabs>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 border-t border-l border-border/60 text-[11.5px]">
              {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => <div key={d} className="border-b border-r border-border/60 bg-secondary/40 p-2 font-medium text-muted-foreground">{d}</div>)}
              {days.map((d, i) => {
                const isThis = d > 0 && d <= 30;
                const isToday = d === 6;
                const hasEvent = [4, 6, 9, 15, 22].includes(d);
                return (
                  <div key={i} className={`min-h-[80px] border-b border-r border-border/60 p-2 ${isThis ? "bg-white" : "bg-secondary/20 text-muted-foreground/50"}`}>
                    <div className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${isToday ? "bg-[#2563EB] text-white font-semibold" : "font-medium"}`}>{isThis ? d : ""}</div>
                    {hasEvent && (
                      <div className="mt-1 space-y-1">
                        <div className="truncate rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">10:00 Sarah Chen</div>
                        {d === 15 && <div className="truncate rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">14:30 Demo</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardHeader className="pb-2"><CardTitle className="text-[15px] font-semibold">Upcoming</CardTitle></CardHeader>
          <CardContent className="space-y-2 pt-0">
            {upcoming.map((m) => (
              <div key={m.name} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[13.5px] font-semibold">{m.name}</div>
                  {m.by === "AI" && <Badge className="h-5 rounded-full bg-blue-50 text-[10px] text-blue-700 hover:bg-blue-50"><Sparkles className="mr-1 h-2.5 w-2.5" />Booked by AI</Badge>}
                </div>
                <div className="text-[11.5px] text-muted-foreground">{m.company} · {m.type}</div>
                <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                  <Cal className="h-3 w-3" />{m.time}
                </div>
                <div className="mt-3 flex gap-1.5">
                  <Button size="sm" className="h-7 flex-1 rounded-lg bg-[#2563EB] text-[11.5px] hover:bg-[#1d4fd0]"><Video className="mr-1 h-3 w-3" />Join</Button>
                  <Button size="sm" variant="outline" className="h-7 rounded-lg border-border/70 text-[11.5px]">Notes</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
