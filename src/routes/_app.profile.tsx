import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { analyzeProfile } from "@/lib/ai/agent.functions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Linkedin, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({ component: ProfilePage });

function ProfilePage() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });

  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");

  const analyze = useServerFn(analyzeProfile);
  const runAnalyze = useMutation({
    mutationFn: () => analyze({
      data: {
        linkedin_url: linkedinUrl || undefined,
        full_name: fullName || profile?.full_name || undefined,
        headline: headline || undefined,
        about: about || undefined,
      },
    }),
    onSuccess: () => {
      toast.success("Profile analyzed. AI extracted your ICP.");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const connected = profile?.linkedin_connected;

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Connect LinkedIn. AI extracts your services, industry, target audience and value prop automatically."
      />
      <div className="grid gap-6 px-8 py-6 xl:grid-cols-2">
        <Card className="rounded-2xl border-border/70">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A0A0A] text-white">
                <Linkedin className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[14px] font-semibold">LinkedIn</div>
                <div className="text-[11.5px] text-muted-foreground">{connected ? "Connected · analyzed" : "Simulated connection"}</div>
              </div>
            </div>
            {connected && <Badge className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Live</Badge>}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Full name</Label>
              <Input value={fullName || profile?.full_name || ""} onChange={(e) => setFullName(e.target.value)} className="h-9 rounded-lg" placeholder="Alex Morgan" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">LinkedIn URL</Label>
              <Input value={linkedinUrl || profile?.linkedin_url || ""} onChange={(e) => setLinkedinUrl(e.target.value)} className="h-9 rounded-lg" placeholder="https://linkedin.com/in/…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Headline</Label>
              <Input value={headline || profile?.headline || ""} onChange={(e) => setHeadline(e.target.value)} className="h-9 rounded-lg" placeholder="Founder @ Acme · Helping SaaS companies…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">About</Label>
              <Textarea value={about || profile?.about || ""} onChange={(e) => setAbout(e.target.value)} rows={5} className="rounded-lg" placeholder="Paste your LinkedIn About section…" />
            </div>
            <Button
              onClick={() => runAnalyze.mutate()}
              disabled={runAnalyze.isPending}
              className="h-9 w-full rounded-lg bg-[#0A0A0A] hover:bg-[#262626]"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {runAnalyze.isPending ? "Analyzing…" : connected ? "Re-analyze profile" : "Connect & analyze"}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardHeader className="pb-3">
            <div className="text-[14px] font-semibold">AI Intelligence</div>
            <div className="text-[11.5px] text-muted-foreground">Extracted from your profile</div>
          </CardHeader>
          <CardContent className="space-y-4 text-[13px]">
            <Field label="Industry" value={profile?.industry} />
            <Field label="Services" value={profile?.services?.join(" · ")} />
            <Field label="Target Audience" value={profile?.target_audience} />
            <Field label="Value Proposition" value={profile?.value_proposition} />
            <Field label="Experience" value={profile?.experience_years ? `${profile.experience_years} years` : undefined} />
            {!connected && (
              <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-[12px] text-muted-foreground">
                Fill your details and click Connect & analyze — the AI will populate your ICP.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">{label}</div>
      <div className="mt-0.5 text-foreground">{value || <span className="text-muted-foreground/60">—</span>}</div>
    </div>
  );
}
