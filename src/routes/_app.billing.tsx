import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Download, Loader2, CreditCard, LifeBuoy, XCircle } from "lucide-react";

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

const STRIPE_UNAVAILABLE = "Billing functionality will be available once Stripe is connected.";

function Billing() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | { title: string; description: string }>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [canceled, setCanceled] = useState(false);

  async function runAction(key: string, opts: { title: string; description?: string }) {
    setLoadingKey(key);
    await new Promise((r) => setTimeout(r, 700));
    setLoadingKey(null);
    setDialog({ title: opts.title, description: opts.description ?? STRIPE_UNAVAILABLE });
  }

  function handlePlan(plan: (typeof plans)[number]) {
    if (plan.current) {
      toast.info("You are already on the Pro plan.");
      return;
    }
    runAction(`plan:${plan.name}`, {
      title: plan.cta === "Upgrade" ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`,
    });
  }

  function handleDownloadInvoice(id: string) {
    setLoadingKey(`inv:${id}`);
    setTimeout(() => {
      setLoadingKey(null);
      toast.error(`Cannot download ${id}`, { description: STRIPE_UNAVAILABLE });
    }, 600);
  }

  async function confirmCancel() {
    setLoadingKey("cancel");
    await new Promise((r) => setTimeout(r, 800));
    setLoadingKey(null);
    setCanceled(true);
    setCancelOpen(false);
    toast.success("Subscription scheduled for cancellation", {
      description: "It will remain active until the end of the current billing period.",
    });
  }

  async function reactivate() {
    setLoadingKey("reactivate");
    await new Promise((r) => setTimeout(r, 700));
    setLoadingKey(null);
    setCanceled(false);
    toast.success("Subscription reactivated");
  }

  return (
    <div>
      <PageHeader title="Billing" description="Manage your plan, payment method, and invoices." />

      {/* Subscription status bar */}
      <div className="px-8">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[13.5px] font-semibold">
                  Pro plan · $99/mo
                  {canceled && <span className="ml-2 text-[11.5px] font-medium text-amber-600">Cancels Dec 15, 2026</span>}
                </div>
                <div className="text-[12px] text-muted-foreground">Next invoice on Dec 15, 2026</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl border-border/70 text-[12px]"
                onClick={() => runAction("manage", { title: "Manage subscription" })}
                disabled={loadingKey === "manage"}
              >
                {loadingKey === "manage" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Manage subscription
              </Button>
              {canceled ? (
                <Button
                  size="sm"
                  className="h-8 rounded-xl bg-[#0A0A0A] text-[12px] text-white hover:bg-[#262626]"
                  onClick={reactivate}
                  disabled={loadingKey === "reactivate"}
                >
                  {loadingKey === "reactivate" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Reactivate
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-xl border-border/70 text-[12px] text-destructive hover:text-destructive"
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 p-8 md:grid-cols-3">
        {plans.map((p) => {
          const key = `plan:${p.name}`;
          const busy = loadingKey === key;
          return (
            <Card key={p.name} className={`rounded-2xl border-border/60 bg-white shadow-none ${p.current ? "ring-2 ring-[#0A0A0A]" : ""}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-[15px] font-semibold">{p.name}</div>
                  {p.current && <Badge className="rounded-full bg-neutral-100 text-[10px] text-blue-700 hover:bg-neutral-100">Current</Badge>}
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
                <Button
                  onClick={() => handlePlan(p)}
                  disabled={busy}
                  className={`mt-5 h-9 w-full rounded-xl text-[12.5px] transition-all active:scale-[0.98] ${p.current ? "bg-secondary text-foreground hover:bg-secondary" : "bg-[#0A0A0A] text-white hover:bg-[#262626]"}`}
                >
                  {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  {p.cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 p-8 pt-0 lg:grid-cols-3">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="p-6">
            <div className="mb-1 text-[13.5px] font-semibold">Payment method</div>
            <div className="text-[12px] text-muted-foreground">Visa ending in 4242 · Expires 08/28</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl border-border/70 text-[12px]"
                onClick={() => runAction("update-card", { title: "Update payment method" })}
                disabled={loadingKey === "update-card"}
              >
                {loadingKey === "update-card" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Update card
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-xl text-[12px]"
                onClick={() => setSupportOpen(true)}
              >
                <LifeBuoy className="mr-1.5 h-3.5 w-3.5" />
                Contact support
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/60 bg-white shadow-none lg:col-span-2">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border/60 p-4">
              <div className="text-[13.5px] font-semibold">Invoices</div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl border-border/70 text-[12px]"
                onClick={() => runAction("export-all", { title: "Export all invoices" })}
                disabled={loadingKey === "export-all"}
              >
                {loadingKey === "export-all" ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1 h-3.5 w-3.5" />
                )}
                Export all
              </Button>
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
                {invoices.map((i) => {
                  const busy = loadingKey === `inv:${i.id}`;
                  return (
                    <TableRow key={i.id} className="border-border/60 hover:bg-secondary/40">
                      <TableCell className="text-[12.5px] font-medium">{i.id}</TableCell>
                      <TableCell className="text-[12.5px]">{i.date}</TableCell>
                      <TableCell className="text-[12.5px]">{i.amount}</TableCell>
                      <TableCell><Badge variant="secondary" className="rounded-full bg-emerald-50 text-[11px] text-emerald-700">{i.status}</Badge></TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg text-[12px]"
                          onClick={() => handleDownloadInvoice(i.id)}
                          disabled={busy}
                        >
                          {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1 h-3.5 w-3.5" />}
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Generic info dialog for Stripe-gated actions */}
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{dialog?.title}</DialogTitle>
            <DialogDescription>{dialog?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDialog(null)}
            >
              Close
            </Button>
            <Button
              className="rounded-xl bg-[#0A0A0A] text-white hover:bg-[#262626]"
              onClick={() => {
                setDialog(null);
                setSupportOpen(true);
              }}
            >
              Contact billing support
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Cancel subscription?</DialogTitle>
            <DialogDescription>
              Your Pro plan will remain active until the end of the current billing period (Dec 15, 2026). You can reactivate any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCancelOpen(false)}>Keep plan</Button>
            <Button
              className="rounded-xl bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmCancel}
              disabled={loadingKey === "cancel"}
            >
              {loadingKey === "cancel" && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Confirm cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Support dialog */}
      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Contact billing support</DialogTitle>
            <DialogDescription>
              Email us at <span className="font-medium text-foreground">billing@outrix.ai</span> and our team will reply within one business day.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setSupportOpen(false)}>Close</Button>
            <Button
              className="rounded-xl bg-[#0A0A0A] text-white hover:bg-[#262626]"
              onClick={() => {
                window.location.href = "mailto:billing@outrix.ai?subject=Billing%20support";
                setSupportOpen(false);
              }}
            >
              Open email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
