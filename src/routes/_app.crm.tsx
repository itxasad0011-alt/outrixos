import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Download, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/crm")({
  component: CRM,
});

const rows = [
  { name: "Sarah Chen", company: "Loom", role: "Head of Growth", stage: "Meeting Booked", last: "Today", next: "Meeting Tue 10am" },
  { name: "Marcus Reed", company: "Ramp", role: "VP Sales", stage: "Interested", last: "24m", next: "Send pricing" },
  { name: "Priya Shah", company: "Northwind", role: "Founder", stage: "Interested", last: "1h", next: "Follow-up Day 5" },
  { name: "Julia Park", company: "Blend", role: "RevOps", stage: "Interested", last: "yesterday", next: "Book demo" },
  { name: "Ethan Wolfe", company: "Cascade", role: "Partnerships", stage: "Follow-up", last: "2d", next: "Day 9 message" },
  { name: "David Ortiz", company: "Vantage", role: "COO", stage: "Not Interested", last: "3d", next: "Archive" },
  { name: "Nadia Ivanov", company: "Sift", role: "Founder", stage: "Cold", last: "1w", next: "Nurture" },
];

const stageTint: Record<string, string> = {
  "Meeting Booked": "bg-green-50 text-green-700",
  "Interested": "bg-emerald-50 text-emerald-700",
  "Follow-up": "bg-amber-50 text-amber-700",
  "Cold": "bg-slate-100 text-slate-600",
  "Not Interested": "bg-rose-50 text-rose-700",
};

function CRM() {
  return (
    <div>
      <PageHeader
        title="CRM"
        description="Every lead your AI has ever touched — synced in real time."
        actions={
          <>
            <Button variant="outline" className="h-9 rounded-xl border-border/70 bg-white text-[12.5px]"><Download className="mr-1.5 h-3.5 w-3.5" />Export</Button>
            <Button className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]"><Plus className="mr-1.5 h-3.5 w-3.5" />Add lead</Button>
          </>
        }
      />
      <div className="p-8">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="p-0">
            <div className="flex flex-wrap items-center gap-3 border-b border-border/60 p-4">
              <Tabs defaultValue="all">
                <TabsList className="rounded-xl bg-secondary">
                  <TabsTrigger value="all" className="rounded-lg text-[12px]">All · 1,240</TabsTrigger>
                  <TabsTrigger value="interested" className="rounded-lg text-[12px]">Interested · 48</TabsTrigger>
                  <TabsTrigger value="meeting" className="rounded-lg text-[12px]">Meeting Booked · 21</TabsTrigger>
                  <TabsTrigger value="cold" className="rounded-lg text-[12px]">Cold · 312</TabsTrigger>
                  <TabsTrigger value="no" className="rounded-lg text-[12px]">Not Interested</TabsTrigger>
                  <TabsTrigger value="archived" className="rounded-lg text-[12px]">Archived</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search leads" className="h-9 w-56 rounded-xl border-border/70 pl-8 text-[13px]" />
                </div>
                <Button variant="outline" size="sm" className="h-9 rounded-xl border-border/70 text-[12.5px]"><Filter className="mr-1.5 h-3.5 w-3.5" />Filter</Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Lead</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Company</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Role</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Stage</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Last contact</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Next action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.name} className="cursor-pointer border-border/60 hover:bg-secondary/40">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8"><AvatarFallback className="bg-secondary text-[10.5px]">{r.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
                        <span className="text-[13px] font-medium">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[12.5px]">{r.company}</TableCell>
                    <TableCell className="text-[12.5px] text-muted-foreground">{r.role}</TableCell>
                    <TableCell><Badge variant="secondary" className={`h-5 rounded-full text-[10.5px] ${stageTint[r.stage]}`}>{r.stage}</Badge></TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{r.last}</TableCell>
                    <TableCell className="text-[12px]">{r.next}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between border-t border-border/60 p-4 text-[12px] text-muted-foreground">
              <span>Showing 1–7 of 1,240</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 rounded-lg border-border/70 text-[11.5px]">Previous</Button>
                <Button variant="outline" size="sm" className="h-7 rounded-lg border-border/70 text-[11.5px]">Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
