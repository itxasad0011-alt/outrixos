import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Linkedin, Calendar, Mail, Slack, Chrome, Zap } from "lucide-react";

export const Route = createFileRoute("/_app/integrations")({
  component: Integrations,
});

const items = [
  { name: "LinkedIn", desc: "Primary channel — required for the AI agent.", icon: Linkedin, tint: "bg-[#0A0A0A] text-white", status: "Connected", primary: true },
  { name: "Google Calendar", desc: "Auto-book discovery calls and demos.", icon: Calendar, tint: "bg-red-500 text-white", status: "Connected" },
  { name: "Gmail", desc: "Send follow-ups by email when appropriate.", icon: Mail, tint: "bg-rose-500 text-white", status: "Not connected" },
  { name: "Slack", desc: "Get notified when leads reply or book meetings.", icon: Slack, tint: "bg-fuchsia-500 text-white", status: "Connected" },
  { name: "Calendly", desc: "Share your Calendly link inside AI messages.", icon: Zap, tint: "bg-neutral-1000 text-white", status: "Not connected" },
  { name: "Chrome Extension", desc: "Add any LinkedIn profile to Relay with one click.", icon: Chrome, tint: "bg-neutral-900 text-white", status: "Not installed" },
];

function Integrations() {
  return (
    <div>
      <PageHeader title="Integrations" description="Connect the tools your AI agent needs to work end-to-end." />
      <div className="grid grid-cols-1 gap-3 p-8 md:grid-cols-2">
        {items.map((i) => {
          const connected = i.status === "Connected";
          return (
            <Card key={i.name} className={`rounded-2xl border-border/60 bg-white shadow-none transition hover:shadow-md ${i.primary ? "ring-1 ring-blue-200" : ""}`}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`grid h-11 w-11 place-items-center rounded-xl ${i.tint}`}><i.icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold">{i.name}</span>
                    {i.primary && <Badge className="rounded-full bg-neutral-100 text-[10px] text-blue-700 hover:bg-neutral-100">Required</Badge>}
                  </div>
                  <div className="text-[12px] text-muted-foreground">{i.desc}</div>
                </div>
                <Badge variant="secondary" className={`rounded-full text-[11px] ${connected ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>
                  {i.status}
                </Badge>
                <Button size="sm" variant={connected ? "outline" : "default"} className={connected ? "h-8 rounded-xl border-border/70 text-[12px]" : "h-8 rounded-xl bg-[#0A0A0A] text-[12px] hover:bg-[#262626]"}>
                  {connected ? "Manage" : "Connect"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
