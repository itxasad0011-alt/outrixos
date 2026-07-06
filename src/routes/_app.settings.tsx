import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Linkedin, KeyRound, Shield, CreditCard, Zap, Bell, Users, Settings2 } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

const sections = [
  { id: "workspace", l: "Workspace", i: Settings2 },
  { id: "users", l: "Users & Permissions", i: Users },
  { id: "notifications", l: "Notifications", i: Bell },
  { id: "linkedin", l: "LinkedIn Accounts", i: Linkedin },
  { id: "ai", l: "AI Settings", i: Zap },
  { id: "integrations", l: "Integrations", i: Zap },
  { id: "api", l: "API Keys", i: KeyRound },
  { id: "security", l: "Security", i: Shield },
  { id: "billing", l: "Billing", i: CreditCard },
];

function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Workspace configuration, integrations, and billing." />
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-0.5">
          {sections.map((s, i) => (
            <button key={s.id} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[12.5px] font-medium transition ${i === 0 ? "bg-white shadow-sm" : "text-muted-foreground hover:bg-white"}`}>
              <s.i className="h-4 w-4" strokeWidth={1.75} />{s.l}
            </button>
          ))}
        </nav>

        <div className="space-y-4">
          <Card className="rounded-2xl border-border/60 bg-white shadow-none">
            <CardContent className="space-y-5 p-6">
              <div>
                <div className="text-[15px] font-semibold">Workspace</div>
                <div className="text-[12px] text-muted-foreground">General workspace settings.</div>
              </div>
              <Field label="Workspace name" defaultValue="Acme Studio" />
              <Field label="Workspace URL" defaultValue="acme.relay.app" />
              <Field label="Default timezone" defaultValue="Pacific · GMT-8" />
              <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                <div>
                  <div className="text-[13px] font-medium">Human-safe outreach mode</div>
                  <div className="text-[11.5px] text-muted-foreground">Randomize send times, enforce daily caps.</div>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-white shadow-none">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-semibold">LinkedIn Accounts</div>
                  <div className="text-[12px] text-muted-foreground">Connect and manage the accounts your AI acts on.</div>
                </div>
                <Button className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]">+ Connect account</Button>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border/60 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0A66C2] text-white"><Linkedin className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">Alex Morgan</div>
                  <div className="text-[11.5px] text-muted-foreground">Connected · Last sync 2 min ago</div>
                </div>
                <Badge className="rounded-full bg-emerald-50 text-[11px] text-emerald-700 hover:bg-emerald-50">Healthy</Badge>
                <Button variant="outline" size="sm" className="h-8 rounded-lg border-border/70 text-[12px]">Manage</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-white shadow-none">
            <CardContent className="p-6">
              <div className="mb-3 text-[15px] font-semibold">Billing</div>
              <div className="rounded-xl border border-border/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-semibold">Pro plan · $99 / mo</div>
                    <div className="text-[11.5px] text-muted-foreground">Renews Dec 15 · 3 seats · unlimited leads</div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 rounded-lg border-border/70 text-[12px]">Change plan</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">{label}</label>
      <Input defaultValue={defaultValue} className="h-9 rounded-xl border-border/70 text-[13px]" />
    </div>
  );
}
