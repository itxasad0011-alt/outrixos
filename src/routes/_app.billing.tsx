import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Download } from "lucide-react";

export const Route = createFileRoute("/_app/billing")({
  component: Billing,
});

const plans = [
  { name: "Starter", price: "$29", period: "/ mo", features: ["100 leads / month", "AI outreach", "Basic analytics"], cta: "Downgrade" },
  { name: "Pro", price: "$99", period: "/ mo", features: ["Unlimited leads", "AI Sales Brain", "Follow-ups + Memory", "Priority support"], cta: "Current plan", current: true },
  { name: "Growth", price: "$249", period: "/ mo", features: ["Everything in Pro", "1 teammate seat", "Custom AI tone", "SLA support"], cta: "Upgrade" },
];

const invoices = [
  { id: "INV-1042", date: "Nov 15, 2026", amount: "$99.00", status: "Paid" },
  { id: "INV-1031", date: "Oct 15, 2026", amount: "$99.00", status: "Paid" },
  { id: "INV-1019", date: "Sep 15, 2026", amount: "$99.00", status: "Paid" },
];

function Billing() {
  return (
    <div>
      <PageHeader title="Billing" description="Manage your plan, payment method, and invoices." />
      <div className="grid grid-cols-1 gap-3 p-8 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.name} className={`rounded-2xl border-border/60 bg-white shadow-none ${p.current ? "ring-2 ring-[#2563EB]" : ""}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-[15px] font-semibold">{p.name}</div>
                {p.current && <Badge className="rounded-full bg-blue-50 text-[10px] text-blue-700 hover:bg-blue-50">Current</Badge>}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-[28px] font-semibold tracking-tight">{p.price}</span>
                <span className="text-[12px] text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-4 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12.5px]"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{f}</li>
                ))}
              </ul>
              <Button className={`mt-5 h-9 w-full rounded-xl text-[12.5px] ${p.current ? "bg-secondary text-foreground hover:bg-secondary" : "bg-[#2563EB] text-white hover:bg-[#1d4fd0]"}`}>{p.cta}</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 p-8 pt-0 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="p-6">
            <div className="mb-1 text-[13.5px] font-semibold">Payment method</div>
            <div className="text-[12px] text-muted-foreground">Visa ending in 4242 · Expires 08/28</div>
            <Button variant="outline" size="sm" className="mt-4 h-8 rounded-xl border-border/70 text-[12px]">Update card</Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/60 bg-white shadow-none lg:col-span-2">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border/60 p-4">
              <div className="text-[13.5px] font-semibold">Invoices</div>
              <Button variant="outline" size="sm" className="h-8 rounded-xl border-border/70 text-[12px]"><Download className="mr-1 h-3.5 w-3.5" />Export all</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-border/60">
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Invoice</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Date</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id} className="border-border/60 hover:bg-secondary/40">
                    <TableCell className="text-[12.5px] font-medium">{i.id}</TableCell>
                    <TableCell className="text-[12.5px]">{i.date}</TableCell>
                    <TableCell className="text-[12.5px]">{i.amount}</TableCell>
                    <TableCell><Badge variant="secondary" className="rounded-full bg-emerald-50 text-[11px] text-emerald-700">{i.status}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="sm" className="h-8 rounded-lg text-[12px]">Download</Button></TableCell>
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
