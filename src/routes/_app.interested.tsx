import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Calendar, MessagesSquare, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/interested")({
  component: Interested,
});

const leads = [
  { name: "Sarah Chen", role: "Head of Growth · Loom", intent: "Wants a demo Tue 10am", conf: 96, tag: "Hot" },
  { name: "Marcus Reed", role: "VP Sales · Ramp", intent: "Asked for pricing details", conf: 89, tag: "Pricing" },
  { name: "Priya Shah", role: "Founder · Northwind", intent: "Positive reply, wants intro deck", conf: 84, tag: "Warm" },
  { name: "Julia Park", role: "RevOps · Blend", intent: "Interested, waiting on team sync", conf: 78, tag: "Warm" },
];

function Interested() {
  return (
    <div>
      <PageHeader
        title="Interested Leads"
        description="Prospects the AI has flagged as ready to talk. Move them forward."
      />
      <div className="grid grid-cols-1 gap-3 p-8 md:grid-cols-2 xl:grid-cols-2">
        {leads.map((l) => (
          <Card key={l.name} className="rounded-2xl border-border/60 bg-white shadow-none transition hover:shadow-md">
            <CardContent className="flex items-start gap-4 p-5">
              <Avatar className="h-11 w-11"><AvatarFallback className="bg-secondary text-[12px]">{l.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold">{l.name}</span>
                  <Badge variant="secondary" className="h-5 rounded-full bg-emerald-50 text-[10.5px] text-emerald-700">{l.tag}</Badge>
                </div>
                <div className="text-[12px] text-muted-foreground">{l.role}</div>
                <div className="mt-2.5 rounded-xl border border-border/60 bg-gradient-to-br from-blue-50 to-white p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-blue-700">
                    <Sparkles className="h-3 w-3" /> AI intent · {l.conf}% confidence
                  </div>
                  <div className="text-[12.5px] text-foreground">{l.intent}</div>
                </div>
                <div className="mt-3 flex gap-1.5">
                  <Button size="sm" className="h-8 rounded-xl bg-[#2563EB] text-[12px] hover:bg-[#1d4fd0]"><Calendar className="mr-1 h-3.5 w-3.5" />Book meeting</Button>
                  <Button size="sm" variant="outline" className="h-8 rounded-xl border-border/70 text-[12px]"><MessagesSquare className="mr-1 h-3.5 w-3.5" />Open chat</Button>
                  <Button size="sm" variant="ghost" className="ml-auto h-8 rounded-xl text-[12px] text-muted-foreground">Details <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
