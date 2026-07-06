import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, TrendingUp, DollarSign, Users } from "lucide-react";

export const Route = createFileRoute("/_app/won")({
  component: Won,
});

const rows = [
  { name: "Sarah Chen", company: "Loom", value: "$18,000", closed: "Nov 12", cycle: "24d" },
  { name: "Marcus Reed", company: "Ramp", value: "$32,500", closed: "Oct 28", cycle: "41d" },
  { name: "Julia Park", company: "Blend", value: "$12,000", closed: "Oct 14", cycle: "18d" },
  { name: "Nadia Ivanov", company: "Sift", value: "$46,000", closed: "Sep 30", cycle: "62d" },
];

function Won() {
  return (
    <div>
      <PageHeader
        title="Won Clients"
        description="Every deal closed with the help of your AI sales agent."
      />
      <div className="grid grid-cols-1 gap-3 p-8 md:grid-cols-4">
        {[
          { l: "Deals won", v: "21", i: Trophy, tint: "bg-amber-50 text-amber-600" },
          { l: "Pipeline value", v: "$284K", i: DollarSign, tint: "bg-emerald-50 text-emerald-600" },
          { l: "Avg. cycle", v: "34 days", i: TrendingUp, tint: "bg-blue-50 text-blue-600" },
          { l: "Active clients", v: "18", i: Users, tint: "bg-fuchsia-50 text-fuchsia-600" },
        ].map((k) => (
          <Card key={k.l} className="rounded-2xl border-border/60 bg-white shadow-none">
            <CardContent className="p-5">
              <div className={`mb-3 grid h-8 w-8 place-items-center rounded-xl ${k.tint}`}><k.i className="h-4 w-4" /></div>
              <div className="text-[11.5px] font-medium text-muted-foreground">{k.l}</div>
              <div className="text-[22px] font-semibold tracking-tight">{k.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="p-8 pt-0">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Client</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Company</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Deal value</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Closed</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Cycle</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.name} className="border-border/60 hover:bg-secondary/40">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8"><AvatarFallback className="bg-secondary text-[10.5px]">{r.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
                        <span className="text-[13px] font-medium">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[12.5px]">{r.company}</TableCell>
                    <TableCell className="text-[13px] font-semibold text-emerald-700">{r.value}</TableCell>
                    <TableCell className="text-[12.5px] text-muted-foreground">{r.closed}</TableCell>
                    <TableCell><Badge variant="secondary" className="rounded-full bg-secondary text-[11px]">{r.cycle}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm" className="h-8 rounded-lg text-[12px]">View</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
