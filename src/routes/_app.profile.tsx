import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { analyzeProfile, generateSalesBrain, saveBrainPrefs } from "@/lib/ai/agent.functions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Linkedin, Sparkles, CheckCircle2, Brain, User, Settings2 } from "lucide-react";
import { toast } from "sonner";

const tabSchema = z.object({
  tab: z.enum(["general", "brain", "linkedin", "preferences"]).optional(),
});

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
  validateSearch: (s) => tabSchema.parse(s),
});

function ProfilePage() {
  const search = useSearch({ from: "/_app/profile" });
  const [tab, setTab] = useState<string>(search.tab ?? "general");
  useEffect(() => { if (search.tab) setTab(search.tab); }, [search.tab]);

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Manage your account, LinkedIn connection, and how the AI represents you."
      />
      <div className="px-8 py-6">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="h-10 rounded-xl bg-neutral-100/70 p-1">
            <TabsTrigger value="general" className="rounded-lg px-3 text-[12.5px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <User className="mr-1.5 h-3.5 w-3.5" /> General
            </TabsTrigger>
            <TabsTrigger value="brain" className="rounded-lg px-3 text-[12.5px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Brain className="mr-1.5 h-3.5 w-3.5" /> AI Sales Brain
            </TabsTrigger>
            <TabsTrigger value="linkedin" className="rounded-lg px-3 text-[12.5px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Linkedin className="mr-1.5 h-3.5 w-3.5" /> LinkedIn
            </TabsTrigger>
            <TabsTrigger value="preferences" className="rounded-lg px-3 text-[12.5px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="m-0"><GeneralTab /></TabsContent>
          <TabsContent value="brain" className="m-0"><BrainTab /></TabsContent>
          <TabsContent value="linkedin" className="m-0"><LinkedInTab /></TabsContent>
          <TabsContent value="preferences" className="m-0"><PreferencesTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ---------- General ---------- */

function GeneralTab() {
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

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setHeadline(profile.headline ?? "");
      setAbout(profile.about ?? "");
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles")
        .update({ full_name: fullName, headline, about })
        .eq("id", u.user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="rounded-2xl border-border/70">
        <CardHeader className="pb-3">
          <div className="text-[14px] font-semibold">Personal information</div>
          <div className="text-[11.5px] text-muted-foreground">How you appear across the app.</div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-9 rounded-lg" placeholder="Alex Morgan" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Email</Label>
            <Input value={profile?.email ?? ""} disabled className="h-9 rounded-lg bg-neutral-50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Headline</Label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} className="h-9 rounded-lg" placeholder="Founder @ Acme · Helping SaaS…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">About</Label>
            <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={5} className="rounded-lg" placeholder="Short bio…" />
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}
            className="h-9 w-full rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70">
        <CardHeader className="pb-3">
          <div className="text-[14px] font-semibold">AI Intelligence</div>
          <div className="text-[11.5px] text-muted-foreground">Extracted from your LinkedIn profile.</div>
        </CardHeader>
        <CardContent className="space-y-4 text-[13px]">
          <Field label="Industry" value={profile?.industry} />
          <Field label="Services" value={profile?.services?.join(" · ")} />
          <Field label="Target Audience" value={profile?.target_audience} />
          <Field label="Value Proposition" value={profile?.value_proposition} />
          <Field label="Experience" value={profile?.experience_years ? `${profile.experience_years} years` : undefined} />
          {!profile?.linkedin_connected && (
            <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-[12px] text-muted-foreground">
              Head over to the LinkedIn tab and analyze your profile to populate this section.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- LinkedIn ---------- */

function LinkedInTab() {
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
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="rounded-2xl border-border/70">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0A0A0A] text-white">
              <Linkedin className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[14px] font-semibold">LinkedIn account</div>
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
          <div className="text-[14px] font-semibold">Extracted intelligence</div>
          <div className="text-[11.5px] text-muted-foreground">Auto-populated from your LinkedIn profile.</div>
        </CardHeader>
        <CardContent className="space-y-4 text-[13px]">
          <Field label="Industry" value={profile?.industry} />
          <Field label="Services" value={profile?.services?.join(" · ")} />
          <Field label="Target Audience" value={profile?.target_audience} />
          <Field label="Value Proposition" value={profile?.value_proposition} />
          <Field label="Experience" value={profile?.experience_years ? `${profile.experience_years} years` : undefined} />
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- AI Sales Brain ---------- */

const TONES = ["professional", "founder", "friendly", "consultant"];

function BrainTab() {
  const qc = useQueryClient();
  const { data: brain } = useQuery({
    queryKey: ["brain"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("sales_brain").select("*").eq("user_id", u.user.id).maybeSingle();
      return data;
    },
  });

  const [tone, setTone] = useState("professional");
  const [website, setWebsite] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dos, setDos] = useState("");
  const [donts, setDonts] = useState("");

  useEffect(() => {
    if (brain) {
      setTone(brain.tone ?? "professional");
      setWebsite(brain.website ?? "");
      setInstructions(brain.custom_instructions ?? "");
      setDos((brain.dos ?? []).join("\n"));
      setDonts((brain.donts ?? []).join("\n"));
    }
  }, [brain]);

  const save = useServerFn(saveBrainPrefs);
  const generate = useServerFn(generateSalesBrain);

  const savePrefs = useMutation({
    mutationFn: () => save({
      data: {
        tone,
        website: website || undefined,
        custom_instructions: instructions || undefined,
        dos: dos.split("\n").map((s) => s.trim()).filter(Boolean),
        donts: donts.split("\n").map((s) => s.trim()).filter(Boolean),
      },
    }),
    onSuccess: () => { toast.success("Preferences saved"); qc.invalidateQueries({ queryKey: ["brain"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const runGen = useMutation({
    mutationFn: () => generate({}),
    onSuccess: () => { toast.success("Sales Brain generated"); qc.invalidateQueries({ queryKey: ["brain"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-neutral-800 text-white">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[14px] font-semibold">AI Sales Brain</div>
            <div className="text-[11.5px] text-muted-foreground">Optional. Tune tone, rules, and knowledge. The AI blends this with your profile.</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => savePrefs.mutate()} disabled={savePrefs.isPending} className="h-9 rounded-lg">
            {savePrefs.isPending ? "Saving…" : "Save preferences"}
          </Button>
          <Button onClick={() => runGen.mutate()} disabled={runGen.isPending} className="h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {runGen.isPending ? "Generating…" : "Generate Sales Brain"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl border-border/70">
          <CardHeader className="pb-3"><div className="text-[14px] font-semibold">Tone & writing style</div></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Tone</Label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button key={t} onClick={() => setTone(t)}
                    className={`rounded-full border px-3 py-1 text-[12px] capitalize ${tone === t ? "border-[#0A0A0A] bg-neutral-100 text-[#0A0A0A]" : "border-border/70 bg-white text-muted-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Custom instructions</Label>
              <Textarea rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} className="rounded-lg" placeholder="Anything specific the AI should know…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Do's (one per line)</Label>
                <Textarea rows={4} value={dos} onChange={(e) => setDos(e.target.value)} className="rounded-lg text-[12.5px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">Don'ts (one per line)</Label>
                <Textarea rows={4} value={donts} onChange={(e) => setDonts(e.target.value)} className="rounded-lg text-[12.5px]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardHeader className="pb-3">
            <div className="text-[14px] font-semibold">Portfolio, website & knowledge</div>
            <div className="text-[11.5px] text-muted-foreground">Give the AI sources it can reference.</div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Website</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="h-9 rounded-lg" placeholder="https://…" />
            </div>
            <div className="rounded-xl border border-dashed border-border/70 p-4 text-[12px] text-muted-foreground">
              Add FAQs, case studies, testimonials and portfolio links from the Knowledge Base — they're picked up automatically by the Sales Brain.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <div className="text-[14px] font-semibold">Generated intelligence</div>
              <div className="text-[11.5px] text-muted-foreground">{brain?.generated_at ? `Updated ${new Date(brain.generated_at).toLocaleString()}` : "Not generated yet"}</div>
            </div>
            {brain?.generated_at && <Badge className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">Ready</Badge>}
          </CardHeader>
          <CardContent className="grid gap-4 text-[13px] md:grid-cols-2">
            <Section title="Messaging Strategy" value={brain?.messaging_strategy} />
            <Section title="ICP" value={brain?.icp ? JSON.stringify(brain.icp, null, 2) : undefined} mono />
            <Section title="Conversation Rules" value={brain?.conversation_rules} />
            <Section title="Reply Strategy" value={brain?.reply_strategy} />
            <Section title="Follow-up Logic" value={brain?.followup_logic} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Preferences ---------- */

function PreferencesTab() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="rounded-2xl border-border/70">
        <CardHeader className="pb-3">
          <div className="text-[14px] font-semibold">Workspace preferences</div>
          <div className="text-[11.5px] text-muted-foreground">Coming soon — theme, language, and default views.</div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-[12.5px] text-muted-foreground">
            Preference options will appear here.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Shared ---------- */

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">{label}</div>
      <div className="mt-0.5 text-foreground">{value || <span className="text-muted-foreground/60">—</span>}</div>
    </div>
  );
}

function Section({ title, value, mono }: { title: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">{title}</div>
      {value ? (
        <div className={`mt-1 whitespace-pre-wrap rounded-lg bg-secondary/50 p-2.5 ${mono ? "font-mono text-[11.5px]" : ""}`}>{value}</div>
      ) : (
        <div className="mt-0.5 text-muted-foreground/60">—</div>
      )}
    </div>
  );
}
