import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GripVertical, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/queue")({
  component: LeadQueue,
});

type Card = { name: string; role: string; tag?: string };
const cols: { title: string; tint: string; cards: Card[] }[] = [
  { title: "New", tint: "bg-slate-400", cards: [{ name: "Sarah Chen", role: "Head of Growth · Loom" }, { name: "Amir Zaid", role: "CRO · Kite" }] },
  { title: "Ready", tint: "bg-blue-400", cards: [{ name: "Marcus Reed", role: "VP Sales · Ramp" }] },
  { title: "Sent", tint: "bg-indigo-400", cards: [{ name: "Priya Shah", role: "Founder · Northwind" }, { name: "Alex Kim", role: "COO · Vantage" }] },
  { title: "Connected", tint: "bg-cyan-400", cards: [{ name: "Julia Park", role: "RevOps · Blend" }] },
  { title: "Conversation", tint: "bg-violet-500", cards: [{ name: "Ethan Wolfe", role: "Partnerships · Cascade", tag: "Warm" }] },
  { title: "Follow-up", tint: "bg-amber-500", cards: [{ name: "Nadia Ivanov", role: "Founder · Sift" }] },
  { title: "Interested", tint: "bg-emerald-500", cards: [{ name: "Ryan Ho", role: "Head of Ops · Grid", tag: "Hot" }] },
  { title: "Meeting Booked", tint: "bg-green-600", cards: [{ name: "Sarah Chen", role: "Loom · Tue 10am" }] },
  { title: "Cold", tint: "bg-slate-300", cards: [] },
  { title: "Not Interested", tint: "bg-rose-400", cards: [{ name: "David Ortiz", role: "COO · Vantage" }] },
];

function LeadQueue() {
  return (
    <div>
      <PageHeader
        title="Lead Queue"
        description="Kanban of every lead your AI is working on. Drag to move between stages."
        actions={<Button className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]"><Plus className="mr-1.5 h-3.5 w-3.5" /> Add lead</Button>}
      />
      <div className="overflow-x-auto p-6">
        <div className="flex gap-3 pb-4" style={{ minWidth: "1600px" }}>
          {cols.map((c) => (
            <div key={c.title} className="flex w-[260px] shrink-0 flex-col rounded-2xl border border-border/60 bg-secondary/40">
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${c.tint}`} />
                  <span className="text-[12.5px] font-semibold">{c.title}</span>
                  <span className="text-[11px] text-muted-foreground">{c.cards.length}</span>
                </div>
                <button className="text-muted-foreground hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex-1 space-y-2 px-2 pb-2">
                {c.cards.map((card, i) => (
                  <div key={i} className="group cursor-grab rounded-xl border border-border/60 bg-white p-3 shadow-sm transition hover:shadow-md">
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100" />
                      <Avatar className="h-7 w-7"><AvatarFallback className="bg-secondary text-[10px]">{card.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-medium">{card.name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{card.role}</div>
                      </div>
                    </div>
                    {card.tag && <Badge variant="secondary" className="mt-2 h-5 rounded-full bg-emerald-50 text-[10px] text-emerald-700">{card.tag}</Badge>}
                  </div>
                ))}
                {c.cards.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/70 py-6 text-center text-[11px] text-muted-foreground">Empty</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
