import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { analyzeProfile, savePersonalDetails } from "@/lib/ai/agent.functions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Linkedin, Sparkles, CheckCircle2, Brain, User, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const tabSchema = z.object({
  tab: z.enum(["general", "brain", "linkedin"]).optional(),
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
          </TabsList>

          <TabsContent value="general" className="m-0"><GeneralTab /></TabsContent>
          <TabsContent value="brain" className="m-0"><BrainTab onGoToLinkedIn={() => setTab("linkedin")} /></TabsContent>
          <TabsContent value="linkedin" className="m-0"><LinkedInTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ---------- Shared profile query ---------- */

function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data;
    },
  });
}

function useBrain() {
  return useQuery({
    queryKey: ["brain"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("sales_brain").select("*").eq("user_id", u.user.id).maybeSingle();
      return data;
    },
  });
}

/* ---------- General ---------- */

const GENDERS = ["Prefer not to say", "Female", "Male", "Non-binary", "Other"];
const LANGUAGES = ["English", "Français", "Español", "Deutsch", "Italiano", "Português", "العربية", "中文", "日本語"];
const TIMEZONES = [
  "UTC", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
];

function GeneralTab() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();

  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("");
  const [language, setLanguage] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setHeadline(profile.headline ?? "");
    setAbout(profile.about ?? "");
    setGender((profile as any).gender ?? "");
    setCountry((profile as any).country ?? "");
    setTimezone((profile as any).timezone ?? "");
    setLanguage((profile as any).language ?? "");
  }, [profile]);

  const saveFn = useServerFn(savePersonalDetails);
  const save = useMutation({
    mutationFn: () => saveFn({ data: {
      full_name: fullName || undefined,
      headline: headline || undefined,
      about: about || undefined,
      gender: gender || undefined,
      country: country || undefined,
      timezone: timezone || undefined,
      language: language || undefined,
    } }),
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="rounded-2xl border-border/70">
        <CardHeader className="pb-3">
          <div className="text-[14px] font-semibold">Personal information</div>
          <div className="text-[11.5px] text-muted-foreground">The essentials that show up across the app.</div>
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
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70">
        <CardHeader className="pb-3">
          <div className="text-[14px] font-semibold">Personal details</div>
          <div className="text-[11.5px] text-muted-foreground">Used to localize the app and personalize outreach.</div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Country</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} className="h-9 rounded-lg" placeholder="United States" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}
            className="h-9 w-full rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- LinkedIn ---------- */

function LinkedInTab() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();

  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");

  useEffect(() => {
    if (!profile) return;
    setLinkedinUrl(profile.linkedin_url ?? "");
    setFullName(profile.full_name ?? "");
    setHeadline(profile.headline ?? "");
    setAbout(profile.about ?? "");
  }, [profile]);

  const analyze = useServerFn(analyzeProfile);
  const runAnalyze = useMutation({
    mutationFn: () => analyze({
      data: {
        linkedin_url: linkedinUrl || undefined,
        full_name: fullName || undefined,
        headline: headline || undefined,
        about: about || undefined,
      },
    }),
    onSuccess: () => {
      toast.success("LinkedIn analyzed · AI Sales Brain updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["brain"] });
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
              <div className="text-[11.5px] text-muted-foreground">
                {connected ? "Connected · profile analyzed" : "Connect and analyze to build your AI Sales Brain"}
              </div>
            </div>
          </div>
          {connected && <Badge className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Live</Badge>}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">LinkedIn URL</Label>
            <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} className="h-9 rounded-lg" placeholder="https://linkedin.com/in/…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-9 rounded-lg" placeholder="Alex Morgan" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Headline</Label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} className="h-9 rounded-lg" placeholder="Founder @ Acme · Helping SaaS companies…" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">About</Label>
            <Textarea value={about} onChange={(e) => setAbout(e.target.value)} rows={5} className="rounded-lg" placeholder="Paste your LinkedIn About section for a richer analysis…" />
          </div>
          <Button
            onClick={() => runAnalyze.mutate()}
            disabled={runAnalyze.isPending}
            className="h-9 w-full rounded-lg bg-[#0A0A0A] hover:bg-[#262626]"
          >
            {runAnalyze.isPending
              ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Analyzing profile…</>
              : connected
                ? <><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Re-sync & rebuild AI Sales Brain</>
                : <><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Connect & analyze</>}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/70">
        <CardHeader className="pb-3">
          <div className="text-[14px] font-semibold">What the AI does after you connect</div>
          <div className="text-[11.5px] text-muted-foreground">Fully automatic — no manual setup required.</div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-[12.5px]">
            {[
              "Analyze your complete profile",
              "Detect industry, niche and positioning",
              "Identify services and offers",
              "Understand your ICP and target audience",
              "Extract value proposition and expertise",
              "Analyze skills and experience",
              "Learn your writing style and communication tone",
              "Build a Sales Brain used across the app",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border border-dashed border-border/70 p-3 text-[11.5px] text-muted-foreground">
            Re-sync anytime to keep the Sales Brain aligned with your latest LinkedIn positioning.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- AI Sales Brain (read-only) ---------- */

function BrainTab({ onGoToLinkedIn }: { onGoToLinkedIn: () => void }) {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: brain } = useBrain();

  const analyze = useServerFn(analyzeProfile);
  const rebuild = useMutation({
    mutationFn: () => analyze({ data: {
      linkedin_url: profile?.linkedin_url ?? undefined,
      full_name: profile?.full_name ?? undefined,
      headline: profile?.headline ?? undefined,
      about: profile?.about ?? undefined,
    } }),
    onSuccess: () => {
      toast.success("Sales Brain refreshed");
      qc.invalidateQueries({ queryKey: ["brain"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const empty = !brain?.generated_at;
  const b: any = brain ?? {};
  const p: any = profile ?? {};

  const powers = [
    "Lead Discovery", "Lead Scoring", "AI Message Generation", "Personalization",
    "Campaign Targeting", "Outreach Copy", "Follow-ups", "Recommendations",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-neutral-800 text-white">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[14px] font-semibold">AI Sales Brain</div>
            <div className="text-[11.5px] text-muted-foreground">
              {empty
                ? "Not built yet — connect LinkedIn to generate it automatically."
                : `Auto-generated · Updated ${new Date(b.generated_at).toLocaleString()}`}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {empty ? (
            <Button onClick={onGoToLinkedIn} className="h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
              <Linkedin className="mr-1.5 h-3.5 w-3.5" /> Connect LinkedIn
            </Button>
          ) : (
            <Button
              onClick={() => rebuild.mutate()}
              disabled={rebuild.isPending || !profile?.linkedin_connected}
              variant="outline"
              className="h-9 rounded-lg"
            >
              {rebuild.isPending
                ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Rebuilding…</>
                : <><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Re-sync from LinkedIn</>}
            </Button>
          )}
        </div>
      </div>

      {empty ? (
        <Card className="rounded-2xl border-border/70">
          <CardContent className="grid place-items-center gap-3 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-neutral-100">
              <Brain className="h-5 w-5 text-neutral-500" />
            </div>
            <div className="text-[14px] font-semibold">Your Sales Brain is empty</div>
            <p className="max-w-md text-[12.5px] text-muted-foreground">
              The AI Sales Brain is generated automatically from your LinkedIn profile.
              Connect and analyze your LinkedIn to build it — no manual configuration needed.
            </p>
            <Button onClick={onGoToLinkedIn} className="mt-1 h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Connect LinkedIn
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <BrainCard title="Industry & niche">
              <BrainField label="Industry" value={p.industry} />
              <BrainField label="Niche" value={b.niche} />
              <BrainField label="Positioning" value={b.positioning} />
            </BrainCard>

            <BrainCard title="Offer">
              <BrainList label="Services" values={p.services} />
              <BrainList label="Offers" values={b.offers} />
              <BrainField label="Value proposition" value={p.value_proposition} />
            </BrainCard>

            <BrainCard title="Target audience & ICP">
              <BrainField label="Target audience" value={p.target_audience} />
              <BrainField label="ICP roles" value={arr(b.icp?.roles)} />
              <BrainField label="ICP industries" value={arr(b.icp?.industries)} />
              <BrainField label="Company size" value={b.icp?.company_size} />
              <BrainField label="Buying signals" value={arr(b.icp?.signals)} />
            </BrainCard>

            <BrainCard title="Expertise & experience">
              <BrainList label="Expertise" values={b.expertise} />
              <BrainList label="Skills" values={b.skills ?? p.skills} />
              <BrainField label="Experience" value={p.experience_years ? `${p.experience_years} years` : undefined} />
            </BrainCard>

            <BrainCard title="Style & tone">
              <BrainField label="Communication style" value={b.communication_style} />
              <BrainField label="Outreach tone" value={b.outreach_tone} />
              <BrainField label="Messaging strategy" value={b.messaging_strategy} />
            </BrainCard>

            <BrainCard title="Summaries">
              <BrainField label="Company summary" value={b.company_summary} multiline />
              <BrainField label="Personal brand" value={b.personal_brand_summary} multiline />
            </BrainCard>
          </div>

          <Card className="rounded-2xl border-border/70">
            <CardHeader className="pb-3">
              <div className="text-[14px] font-semibold">Powering across the app</div>
              <div className="text-[11.5px] text-muted-foreground">Your Sales Brain is used automatically here.</div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {powers.map((p) => (
                  <Badge key={p} variant="outline" className="rounded-full border-border/70 bg-neutral-50 px-2.5 py-0.5 text-[11.5px] font-normal">
                    <Sparkles className="mr-1 h-3 w-3" /> {p}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function arr(v?: unknown): string | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) return v.length ? v.join(" · ") : undefined;
  return String(v);
}

function BrainCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-border/70">
      <CardHeader className="pb-3"><div className="text-[13.5px] font-semibold">{title}</div></CardHeader>
      <CardContent className="space-y-3 text-[13px]">{children}</CardContent>
    </Card>
  );
}

function BrainField({ label, value, multiline }: { label: string; value?: string | null; multiline?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">{label}</div>
      {value ? (
        multiline
          ? <div className="mt-1 whitespace-pre-wrap rounded-lg bg-neutral-50 p-2.5 text-[12.5px] leading-relaxed">{value}</div>
          : <div className="mt-0.5 text-foreground capitalize">{value}</div>
      ) : (
        <div className="mt-0.5 text-muted-foreground/60">—</div>
      )}
    </div>
  );
}

function BrainList({ label, values }: { label: string; values?: string[] | null }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">{label}</div>
      {values && values.length ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="rounded-md border border-border/70 bg-neutral-50 px-2 py-0.5 text-[11.5px]">{v}</span>
          ))}
        </div>
      ) : (
        <div className="mt-0.5 text-muted-foreground/60">—</div>
      )}
    </div>
  );
}
