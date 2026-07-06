import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShieldOff, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_app/not-interested")({
  component: NotInterested,
});

const rows = [
  { name: "David Ortiz", role: "COO · Vantage", reason: "Not the right time — revisit Q1", tags: ["Timing", "Later"], date: "3d ago" },
  { name: "Amir Zaid", role: "CRO · Kite", reason: "Uses a competitor and is happy", tags: ["Competitor"], date: "1w ago" },
  { name: "Lena Vogel", role: "Founder · Rove", reason: "Not the target buyer", tags: ["Bad fit"], date: "2w ago" },
  { name: "Rico Alvarez", role: "Head of Ops · Bloom", reason: "Requested to stop contact", tags: ["Do not contact"], date: "1mo ago" },
];

function NotInterested() {
  return (
    <div>
      <PageHeader
        title="Not Interested"
        description="Blocked from future outreach — permanently. Reasons stored so the AI can learn."
      />
      <div className="grid grid-cols-1 gap-3 p-8">
        {rows.map((r) => (
          <Card key={r.name} className="rounded-2xl border-border/60 bg-white shadow-none">
            <CardContent className="flex items-center gap-4 p-4">
              <Avatar className="h-10 w-10"><AvatarFallback className="bg-secondary text-[11.5px]">{r.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-semibold">{r.name}</span>
                  <span className="text-[11.5px] text-muted-foreground">· {r.role}</span>
                  {r.tags.map(t => <Badge key={t} variant="secondary" className={`h-5 rounded-full text-[10.5px] ${t === "Do not contact" ? "bg-rose-50 text-rose-700" : "bg-secondary text-muted-foreground"}`}>{t}</Badge>)}
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">{r.reason}</div>
              </div>
              <span className="text-[11px] text-muted-foreground">{r.date}</span>
              <Badge variant="secondary" className="h-6 gap-1 rounded-full bg-rose-50 text-[11px] text-rose-700"><ShieldOff className="h-3 w-3" />Blocked</Badge>
              <Button variant="outline" size="sm" className="h-8 rounded-lg border-border/70 text-[12px]"><RotateCcw className="mr-1 h-3.5 w-3.5" />Reopen</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
