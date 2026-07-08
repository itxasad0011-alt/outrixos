import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile", "integrations"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      const { data } = await supabase.from("profiles").select("id,email,full_name,linkedin_url,linkedin_connected").eq("id", user.user.id).maybeSingle();
      return data;
    },
  });
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [calendly, setCalendly] = useState(() => typeof window === "undefined" ? "" : localStorage.getItem("outrix.calendly") ?? "");

  useEffect(() => { setLinkedinUrl(profile?.linkedin_url ?? ""); }, [profile?.linkedin_url]);

  const linkedin = useMutation({
    mutationFn: async (connected: boolean) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Sign in required");
      const { error } = await supabase.from("profiles").update({ linkedin_connected: connected, linkedin_url: linkedinUrl || null }).eq("id", user.user.id);
      if (error) throw error;
    },
    onSuccess: (_d, connected) => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["profile", "integrations"] });
      toast.success(connected ? "LinkedIn connected" : "LinkedIn disconnected");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const saveCalendly = () => {
    if (!calendly.trim()) return toast.error("Enter a Calendly link");
    localStorage.setItem("outrix.calendly", calendly.trim());
    toast.success("Calendly link saved");
  };

  const linkedinConnected = !!profile?.linkedin_connected;

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
                  onClick={() => linkedin.mutate(!linkedinConnected)}
                  disabled={linkedin.isPending || (!linkedinConnected && !linkedinUrl.trim())}
                  className={
                    linkedinConnected
                      ? "h-8 rounded-xl border-border/70 text-[12px]"
                      : "h-8 rounded-xl bg-black text-[12px] text-white hover:bg-neutral-800"
                  }
                >
                  {linkedinConnected ? "Disconnect" : "Connect LinkedIn"}
                </Button>
                <Input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/your-profile"
                  className="h-8 max-w-xs rounded-xl text-[12px]"
                  aria-label="LinkedIn profile URL"
                />
                <span className="text-[11.5px] text-muted-foreground">
                  {profile?.full_name || profile?.email || "Signed in"}
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
                    onClick={saveCalendly}
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
