import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Search, Linkedin, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/manual-leads")({
  component: ManualLeads,
});

const rows = [
  { name: "Elena Vasquez", role: "Head of Design", company: "Notion", url: "linkedin.com/in/elenavasquez", added: "2h ago" },
  { name: "Tom Bradley", role: "Founder", company: "Kite", url: "linkedin.com/in/tombradley", added: "yesterday" },
  { name: "Maya Chen", role: "VP Growth", company: "Descript", url: "linkedin.com/in/mayachen", added: "3d ago" },
];

function ManualLeads() {
  return (
    <div>
      <PageHeader
        title="Manual Leads"
        description="Add leads yourself — the AI will still enrich and score them."
        actions={
          <>
            <Button variant="outline" className="h-9 rounded-xl border-border/70 bg-white text-[12.5px]"><Upload className="mr-1.5 h-3.5 w-3.5" />Import CSV</Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]"><Plus className="mr-1.5 h-3.5 w-3.5" />Add lead</Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl sm:max-w-md">
                <DialogHeader><DialogTitle className="text-[15px]">Add a lead manually</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Field label="LinkedIn URL" placeholder="https://linkedin.com/in/…" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Full name" placeholder="Jane Doe" />
                    <Field label="Company" placeholder="Acme Inc" />
                  </div>
                  <Field label="Role" placeholder="Head of Growth" />
                  <div>
                    <label className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">Note for AI (optional)</label>
                    <Textarea rows={3} placeholder="Warm intro from a mutual friend — prioritize this lead." className="rounded-xl border-border/70 text-[13px]" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" className="rounded-xl border-border/70">Cancel</Button>
                  <Button className="rounded-xl bg-[#2563EB] hover:bg-[#1d4fd0]">Add & queue</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />
      <div className="p-8">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 border-b border-border/60 p-4">
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search leads" className="h-9 rounded-xl border-border/70 pl-8 text-[13px]" />
              </div>
              <Badge variant="secondary" className="ml-auto rounded-full bg-secondary text-[11px]">{rows.length} leads · manually added</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Lead</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Company</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Role</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">LinkedIn</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Added</TableHead>
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
                    <TableCell className="text-[12.5px] text-muted-foreground">{r.role}</TableCell>
                    <TableCell><a className="inline-flex items-center gap-1 text-[12px] text-blue-700 hover:underline" href="#"><Linkedin className="h-3 w-3" />{r.url}</a></TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{r.added}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-rose-600"><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
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

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">{label}</label>
      <Input placeholder={placeholder} className="h-9 rounded-xl border-border/70 text-[13px]" />
    </div>
  );
}
