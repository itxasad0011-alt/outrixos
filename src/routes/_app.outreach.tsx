import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, Pause, Play, Zap } from "lucide-react";

export const Route = createFileRoute("/_app/outreach")({
  component: Outreach,
});

const queued = [
  { name: "Sarah Chen", role: "Head of Growth · Loom", when: "in 3 min" },
  { name: "Marcus Reed", role: "VP Sales · Ramp", when: "in 12 min" },
  { name: "Priya Shah", role: "Founder · Northwind", when: "in 24 min" },
  { name: "Julia Park", role: "RevOps · Blend", when: "in 41 min" },
  { name: "Ethan Wolfe", role: "Partnerships · Cascade", when: "in 58 min" },
];

function Outreach() {
  return (
    <div>
      <PageHeader
        title="Outreach"
        description="Safe, human-paced outreach across all your active campaigns."
        actions={
          <>
            <Button variant="outline" className="h-9 rounded-xl border-border/70 bg-white text-[12.5px]"><Pause className="mr-1.5 h-3.5 w-3.5" />Pause today</Button>
            <Button className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]"><Play className="mr-1.5 h-3.5 w-3.5" />Send next now</Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 p-8 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold">Today's progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div>
              <div className="mb-1.5 flex justify-between text-[12.5px]">
                <span className="text-muted-foreground">Connection requests</span>
                <span className="font-medium">36 / 50</span>
              </div>
              <Progress value={72} className="h-2" />
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-[12.5px]">
                <span className="text-muted-foreground">Follow-up messages</span>
                <span className="font-medium">18 / 40</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-[12.5px]">
                <span className="text-muted-foreground">Profile visits</span>
                <span className="font-medium">64 / 100</span>
              </div>
              <Progress value={64} className="h-2" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border/60 bg-secondary/40 p-3">
              {[
                { l: "Working hours", v: "9:00 – 18:00" },
                { l: "Timezone", v: "PST" },
                { l: "Days active", v: "Mon – Fri" },
              ].map((s) => (
                <div key={s.l}><div className="text-[11px] text-muted-foreground">{s.l}</div><div className="text-[13px] font-semibold">{s.v}</div></div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-semibold">Next outreach</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-blue-50 to-white p-4">
              <div className="mb-2 flex items-center gap-2 text-[11.5px] font-medium text-blue-700">
                <Zap className="h-3.5 w-3.5" /> Scheduled
              </div>
              <div className="text-[14.5px] font-semibold">Sarah Chen</div>
              <div className="text-[12px] text-muted-foreground">Head of Growth · Loom</div>
              <div className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Sending in 3 minutes
              </div>
              <Button className="mt-4 h-8 w-full rounded-xl bg-[#2563EB] text-[12px] hover:bg-[#1d4fd0]">Preview message</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-8 pt-0">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardHeader>
            <Tabs defaultValue="queued">
              <TabsList className="rounded-xl bg-secondary">
                <TabsTrigger value="queued" className="rounded-lg text-[12.5px]">Queued · 128</TabsTrigger>
                <TabsTrigger value="paused" className="rounded-lg text-[12.5px]">Paused · 4</TabsTrigger>
                <TabsTrigger value="rejected" className="rounded-lg text-[12.5px]">Rejected · 12</TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg text-[12.5px]">History</TabsTrigger>
              </TabsList>
              <TabsContent value="queued" className="pt-4">
                <div className="divide-y divide-border/60">
                  {queued.map((q) => (
                    <div key={q.name} className="flex items-center gap-3 py-3">
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-secondary text-[11px]">{q.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium">{q.name}</div>
                        <div className="text-[11.5px] text-muted-foreground">{q.role}</div>
                      </div>
                      <Badge variant="secondary" className="h-5 rounded-full bg-blue-50 text-[10.5px] text-blue-700">Q4 SaaS Founders</Badge>
                      <div className="w-24 text-right text-[12px] text-muted-foreground">{q.when}</div>
                      <Button variant="ghost" size="sm" className="h-8 rounded-lg text-[12px]">Skip</Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="paused"><div className="py-8 text-center text-[13px] text-muted-foreground">4 leads paused. Resume anytime.</div></TabsContent>
              <TabsContent value="rejected"><div className="py-8 text-center text-[13px] text-muted-foreground">12 rejected connections in the last 30 days.</div></TabsContent>
              <TabsContent value="history"><div className="py-8 text-center text-[13px] text-muted-foreground">Full outreach history.</div></TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
