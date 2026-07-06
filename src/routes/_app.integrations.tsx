import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Linkedin, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/integrations")({
  component: Integrations,
});

function Integrations() {
  const [linkedinConnected, setLinkedinConnected] = useState(true);
  const [calendly, setCalendly] = useState("https://calendly.com/asad-farooq/30min");

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Two connections are all the AI needs to run your outreach end-to-end."
      />
      <div className="mx-auto grid max-w-3xl gap-4 p-8">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="flex items-start gap-4 p-6">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-white">
              <Linkedin className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold">LinkedIn</span>
                <Badge className="rounded-full bg-neutral-100 text-[10px] text-black hover:bg-neutral-100">Required</Badge>
                {linkedinConnected && (
                  <Badge className="rounded-full bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Connected
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                The primary channel. The AI uses your account to discover leads, send connection requests, message prospects, and handle replies — with safe, human-like pacing.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant={linkedinConnected ? "outline" : "default"}
                  onClick={() => {
                    setLinkedinConnected(!linkedinConnected);
                    toast.success(linkedinConnected ? "LinkedIn disconnected" : "LinkedIn connected");
                  }}
                  className={
                    linkedinConnected
                      ? "h-8 rounded-xl border-border/70 text-[12px]"
                      : "h-8 rounded-xl bg-black text-[12px] text-white hover:bg-neutral-800"
                  }
                >
                  {linkedinConnected ? "Disconnect" : "Connect LinkedIn"}
                </Button>
                <span className="text-[11.5px] text-muted-foreground">
                  Signed in as Asad Farooq
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="flex items-start gap-4 p-6">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-900 text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold">Calendly</span>
                {calendly && (
                  <Badge className="rounded-full bg-emerald-50 text-[10px] text-emerald-700 hover:bg-emerald-50">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Linked
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                When a prospect asks about pricing or shows intent, the AI shares this link to book a meeting automatically.
              </p>
              <div className="mt-4 space-y-2">
                <Label className="text-[12px]">Calendly link</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={calendly}
                    onChange={(e) => setCalendly(e.target.value)}
                    placeholder="https://calendly.com/your-handle/30min"
                    className="h-9 rounded-lg"
                  />
                  <Button
                    size="sm"
                    onClick={() => toast.success("Calendly link saved")}
                    className="h-9 rounded-lg bg-black text-[12px] text-white hover:bg-neutral-800"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
