import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getCampaign, saveSequence, generateConnectionNote, generateMessage,
  importLeads, importLeadsFromUrls, removeCampaignLead, setCampaignLeadPaused,
  launchCampaign, getCampaignPerformance,
} from "@/lib/campaigns.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft, ChevronRight, Sparkles, Loader2, Upload, LinkIcon, UserPlus, ListPlus,
  MoreHorizontal, Play, Pause, ExternalLink, Trash2, Rocket, CheckCircle2, Eye, MessageSquare, UserPlus2,
} from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  tab: z.enum(["sequence", "leads", "launch", "performance"]).optional(),
});

export const Route = createFileRoute("/_app/outreach/$campaignId")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  component: CampaignWorkspace,
});

function CampaignWorkspace() {
  const { campaignId } = Route.useParams();
  const { tab = "sequence" } = Route.useSearch();
  const navigate = useNavigate();

  const get = useServerFn(getCampaign);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => get({ data: { id: campaignId } }),
  });

  if (isLoading || !data) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const c = data.campaign;

  return (
    <div>
      <div className="border-b border-border/60 bg-white/70 px-8 py-5">
        <div className="mb-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Link to="/outreach" className="hover:text-foreground">Outreach</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{c.name}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-semibold tracking-tight">{c.name}</h1>
              <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10.5px] capitalize">
                {c.status}
              </Badge>
            </div>
            {c.description && <p className="mt-0.5 text-[13px] text-muted-foreground">{c.description}</p>}
          </div>
          <Button variant="ghost" asChild className="h-9 rounded-lg">
            <Link to="/outreach"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back</Link>
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => navigate({ to: "/outreach/$campaignId", params: { campaignId }, search: { tab: v as any } })}>
        <div className="border-b border-border/60 bg-white/50 px-8">
          <TabsList className="h-11 gap-1 bg-transparent p-0">
            {[
              { v: "sequence", l: "Sequence" },
              { v: "leads", l: "Lead list" },
              { v: "launch", l: "Launch" },
              { v: "performance", l: "Performance" },
            ].map((t) => (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="h-11 rounded-none border-b-2 border-transparent bg-transparent px-3 text-[13px] font-medium text-muted-foreground data-[state=active]:border-neutral-900 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {t.l}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="px-8 py-6">
          <TabsContent value="sequence" className="mt-0">
            <SequenceTab campaignId={campaignId} initialSteps={data.steps} onSaved={refetch} />
          </TabsContent>
          <TabsContent value="leads" className="mt-0">
            <LeadsTab campaignId={campaignId} leads={data.leads} onChanged={refetch} />
          </TabsContent>
          <TabsContent value="launch" className="mt-0">
            <LaunchTab campaign={c} steps={data.steps} leads={data.leads} onLaunched={refetch} />
          </TabsContent>
          <TabsContent value="performance" className="mt-0">
            <PerformanceTab campaignId={campaignId} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

/* ---------------- Sequence Tab ---------------- */

type Step = {
  id?: string; step_order: number;
  type: "visit_profile" | "connection_request" | "message";
  delay_hours: number; config: Record<string, any>;
};

function SequenceTab({ campaignId, initialSteps, onSaved }: {
  campaignId: string; initialSteps: any[]; onSaved: () => void;
}) {
  const [steps, setSteps] = useState<Step[]>(() =>
    (initialSteps.length ? initialSteps : [
      { step_order: 1, type: "visit_profile", delay_hours: 0, config: { human_delay: true } },
      { step_order: 2, type: "connection_request", delay_hours: 12, config: { note: "" } },
      { step_order: 3, type: "message", delay_hours: 48, config: { name: "Intro", body: "" } },
    ]).map((s: any) => ({ step_order: s.step_order, type: s.type, delay_hours: s.delay_hours, config: s.config ?? {} })),
  );

  const save = useServerFn(saveSequence);
  const genNote = useServerFn(generateConnectionNote);
  const genMsg = useServerFn(generateMessage);

  const saveM = useMutation({
    mutationFn: () => save({ data: { campaign_id: campaignId, steps } }),
    onSuccess: () => { toast.success("Sequence saved"); onSaved(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function updateStep(idx: number, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }
  function updateConfig(idx: number, patch: Record<string, any>) {
    setSteps((prev) => prev.map((s, i) => i === idx ? { ...s, config: { ...s.config, ...patch } } : s));
  }
  function addMessage() {
    setSteps((prev) => [...prev, {
      step_order: prev.length + 1, type: "message", delay_hours: 48,
      config: { name: `Message ${prev.filter(s => s.type === "message").length + 1}`, body: "" },
    }]);
  }
  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_order: i + 1 })));
  }

  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  async function aiFill(idx: number) {
    setBusyIdx(idx);
    try {
      const s = steps[idx];
      if (s.type === "connection_request") {
        const { text } = await genNote({ data: { campaign_id: campaignId } });
        updateConfig(idx, { note: text });
      } else if (s.type === "message") {
        const { text } = await genMsg({ data: { campaign_id: campaignId, step_order: s.step_order } });
        updateConfig(idx, { body: text });
      }
      toast.success("Generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setBusyIdx(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Sequence</h2>
          <p className="text-[12.5px] text-muted-foreground">Visit → Connect → Message. Keep it simple, human, and consistent.</p>
        </div>
        <Button onClick={() => saveM.mutate()} disabled={saveM.isPending} className="h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
          {saveM.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Save sequence
        </Button>
      </div>

      {steps.map((s, idx) => (
        <div key={idx} className="relative">
          <StepCard
            step={s}
            index={idx}
            onDelay={(v) => updateStep(idx, { delay_hours: v })}
            onConfig={(p) => updateConfig(idx, p)}
            onAi={() => aiFill(idx)}
            aiBusy={busyIdx === idx}
            onRemove={idx > 2 ? () => removeStep(idx) : undefined}
          />
          {idx < steps.length - 1 && (
            <div className="my-1 flex justify-center">
              <div className="h-6 w-px bg-border/70" />
            </div>
          )}
        </div>
      ))}

      <div className="pt-2">
        <Button variant="outline" onClick={addMessage} className="h-9 w-full rounded-xl border-dashed">
          <ListPlus className="mr-1.5 h-3.5 w-3.5" /> Add message step
        </Button>
      </div>
    </div>
  );
}

function StepCard({ step, index, onDelay, onConfig, onAi, aiBusy, onRemove }: {
  step: Step; index: number;
  onDelay: (v: number) => void;
  onConfig: (p: Record<string, any>) => void;
  onAi: () => void; aiBusy: boolean;
  onRemove?: () => void;
}) {
  const label = step.type === "visit_profile" ? "Visit profile"
    : step.type === "connection_request" ? "Connection request"
    : (step.config.name || "Message");
  const Icon = step.type === "visit_profile" ? Eye : step.type === "connection_request" ? UserPlus2 : MessageSquare;

  return (
    <Card className="rounded-2xl border-border/70 bg-white">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-neutral-900 text-white">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[13.5px] font-semibold tracking-tight">{index + 1}. {label}</div>
              <div className="text-[11.5px] text-muted-foreground capitalize">{step.type.replace("_", " ")}</div>
            </div>
          </div>
          {onRemove && (
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11.5px]">Delay before this step (hours)</Label>
            <Input type="number" min={0} value={step.delay_hours}
              onChange={(e) => onDelay(Math.max(0, Number(e.target.value)))}
              className="h-9 rounded-lg" />
          </div>
          {step.type === "visit_profile" && (
            <div className="flex items-end gap-2 pb-1">
              <Checkbox
                checked={Boolean(step.config.human_delay)}
                onCheckedChange={(v) => onConfig({ human_delay: Boolean(v) })}
                id={`hd-${index}`}
              />
              <Label htmlFor={`hd-${index}`} className="text-[12px]">Human-like random delay</Label>
            </div>
          )}
          {step.type === "message" && (
            <div className="space-y-1.5">
              <Label className="text-[11.5px]">Message name</Label>
              <Input value={step.config.name ?? ""} onChange={(e) => onConfig({ name: e.target.value })} className="h-9 rounded-lg" />
            </div>
          )}
        </div>

        {step.type === "connection_request" && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[11.5px]">Connection note (≤300 chars)</Label>
              <Button size="sm" variant="ghost" onClick={onAi} disabled={aiBusy} className="h-7 rounded-md text-[11.5px]">
                {aiBusy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />} Generate with AI
              </Button>
            </div>
            <Textarea maxLength={300} value={step.config.note ?? ""} onChange={(e) => onConfig({ note: e.target.value })}
              className="min-h-[90px] rounded-lg text-[13px]"
              placeholder="Hi {{first_name}}, love what you're doing at {{company}}…" />
            <div className="text-right text-[10.5px] text-muted-foreground">{(step.config.note ?? "").length}/300</div>
            <div className="text-[10.5px] text-muted-foreground">Variables: {"{{first_name}} {{company}} {{job_title}}"}</div>
          </div>
        )}

        {step.type === "message" && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[11.5px]">Message body</Label>
              <Button size="sm" variant="ghost" onClick={onAi} disabled={aiBusy} className="h-7 rounded-md text-[11.5px]">
                {aiBusy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />} Generate with AI
              </Button>
            </div>
            <Textarea value={step.config.body ?? ""} onChange={(e) => onConfig({ body: e.target.value })}
              className="min-h-[140px] rounded-lg text-[13px]"
              placeholder="Hi {{first_name}}, following up on my note. I noticed {{company}}…" />
            <div className="text-[10.5px] text-muted-foreground">
              Variables: {"{{first_name}} {{company}} {{role}} {{industry}} {{headline}}"}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Leads Tab ---------------- */

function LeadsTab({ campaignId, leads, onChanged }: {
  campaignId: string; leads: any[]; onChanged: () => void;
}) {
  const [importOpen, setImportOpen] = useState(leads.length === 0);
  const [query, setQuery] = useState("");
  const filtered = leads.filter((cl) => {
    const l = cl.lead;
    if (!l) return false;
    if (query.trim() === "") return true;
    const q = query.toLowerCase();
    return (l.full_name?.toLowerCase().includes(q) || l.company?.toLowerCase().includes(q));
  });

  const rem = useServerFn(removeCampaignLead);
  const pause = useServerFn(setCampaignLeadPaused);
  const remM = useMutation({
    mutationFn: (id: string) => rem({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); onChanged(); },
  });
  const pauseM = useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) => pause({ data: { id, paused } }),
    onSuccess: () => { toast.success("Updated"); onChanged(); },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Leads ({leads.length})</h2>
          <p className="text-[12.5px] text-muted-foreground">Manually import leads. Automation only touches them after you launch.</p>
        </div>
        <Button onClick={() => setImportOpen(true)} className="h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
          <Upload className="mr-1.5 h-3.5 w-3.5" /> Import leads
        </Button>
      </div>

      {importOpen && (
        <LeadImportPanel campaignId={campaignId} onDone={() => { setImportOpen(false); onChanged(); }} onCancel={() => setImportOpen(false)} />
      )}

      <div className="flex items-center gap-2">
        <Input placeholder="Search name or company…" value={query} onChange={(e) => setQuery(e.target.value)}
          className="h-9 max-w-sm rounded-xl bg-white text-[13px]" />
      </div>

      <Card className="rounded-2xl border-border/70 bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60">
                <TableHead className="text-[11.5px] font-medium">Name</TableHead>
                <TableHead className="text-[11.5px] font-medium">Company</TableHead>
                <TableHead className="text-[11.5px] font-medium">Role</TableHead>
                <TableHead className="text-[11.5px] font-medium">Status</TableHead>
                <TableHead className="text-[11.5px] font-medium">Step</TableHead>
                <TableHead className="text-[11.5px] font-medium">Score</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-[13px] text-muted-foreground">
                    No leads yet. Click "Import leads" to add some.
                  </TableCell>
                </TableRow>
              ) : filtered.map((cl) => {
                const l = cl.lead;
                return (
                  <TableRow key={cl.id} className="border-border/60">
                    <TableCell className="text-[13px]">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={l.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-neutral-900 text-[10px] text-white">
                            {(l.full_name ?? "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{l.full_name}</div>
                          {l.headline && <div className="truncate text-[11px] text-muted-foreground">{l.headline}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[12.5px]">{l.company ?? "—"}</TableCell>
                    <TableCell className="text-[12.5px]">{l.role ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10.5px] capitalize">
                        {cl.paused ? "paused" : cl.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[12.5px]">{cl.current_step}</TableCell>
                    <TableCell className="text-[12.5px]">{l.icp_score ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          {l.linkedin_url && (
                            <DropdownMenuItem onSelect={() => window.open(l.linkedin_url, "_blank")}>
                              <ExternalLink className="mr-2 h-3.5 w-3.5" /> Open LinkedIn
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => pauseM.mutate({ id: cl.id, paused: !cl.paused })}>
                            {cl.paused ? <><Play className="mr-2 h-3.5 w-3.5" /> Resume</> : <><Pause className="mr-2 h-3.5 w-3.5" /> Pause</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => remM.mutate(cl.id)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function LeadImportPanel({ campaignId, onDone, onCancel }: { campaignId: string; onDone: () => void; onCancel: () => void }) {
  const [method, setMethod] = useState<"csv" | "urls" | "manual" | "bulk">("urls");
  const [text, setText] = useState("");
  const [manual, setManual] = useState({ full_name: "", company: "", role: "", industry: "", linkedin_url: "" });
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const importUrls = useServerFn(importLeadsFromUrls);
  const importL = useServerFn(importLeads);

  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    try {
      if (method === "urls" || method === "bulk") {
        const urls = text.split(/[\s,]+/).map((s) => s.trim()).filter((s) => s.startsWith("http"));
        if (urls.length === 0) throw new Error("No LinkedIn URLs found");
        const r = await importUrls({ data: { campaign_id: campaignId, urls } });
        toast.success(`Imported ${r.count} leads`);
      } else if (method === "manual") {
        if (!manual.full_name.trim()) throw new Error("Full name is required");
        const r = await importL({ data: { campaign_id: campaignId, leads: [{
          full_name: manual.full_name.trim(),
          company: manual.company || undefined,
          role: manual.role || undefined,
          industry: manual.industry || undefined,
          linkedin_url: manual.linkedin_url || undefined,
        }] } });
        toast.success(`Imported ${r.count} lead`);
      } else if (method === "csv") {
        if (!csvFile) throw new Error("Choose a CSV file");
        const rows = await parseCsv(csvFile);
        if (rows.length === 0) throw new Error("Empty CSV");
        const r = await importL({ data: { campaign_id: campaignId, leads: rows } });
        toast.success(`Imported ${r.count} leads`);
      }
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="rounded-2xl border-border/70 bg-white">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[14px] font-semibold tracking-tight">Import leads</div>
            <div className="text-[12px] text-muted-foreground">Four ways to add leads. No auto-discovery.</div>
          </div>
          <Button variant="ghost" onClick={onCancel} className="h-8 rounded-lg text-[12.5px]">Close</Button>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-1.5">
          {[
            { v: "csv", l: "CSV", i: Upload },
            { v: "urls", l: "Paste URLs", i: LinkIcon },
            { v: "manual", l: "Manual", i: UserPlus },
            { v: "bulk", l: "Bulk paste", i: ListPlus },
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => setMethod(t.v as any)}
              className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[12.5px] transition-colors ${
                method === t.v ? "border-neutral-900 bg-neutral-900 text-white" : "border-border/70 bg-white hover:bg-neutral-50"
              }`}
            >
              <t.i className="h-3.5 w-3.5" /> {t.l}
            </button>
          ))}
        </div>

        {method === "csv" && (
          <div className="space-y-2">
            <Label className="text-[12px]">Upload CSV (columns: full_name, company, role, industry, linkedin_url)</Label>
            <Input type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} className="rounded-lg" />
          </div>
        )}
        {(method === "urls" || method === "bulk") && (
          <div className="space-y-2">
            <Label className="text-[12px]">Paste LinkedIn profile URLs (one per line)</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)}
              className="min-h-[140px] rounded-lg text-[12.5px] font-mono"
              placeholder="https://www.linkedin.com/in/janedoe/&#10;https://www.linkedin.com/in/johnsmith/" />
          </div>
        )}
        {method === "manual" && (
          <div className="grid grid-cols-2 gap-3">
            {[
              ["full_name", "Full name"], ["company", "Company"],
              ["role", "Role"], ["industry", "Industry"],
            ].map(([k, l]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-[12px]">{l}</Label>
                <Input value={(manual as any)[k]} onChange={(e) => setManual({ ...manual, [k]: e.target.value })} className="h-9 rounded-lg" />
              </div>
            ))}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-[12px]">LinkedIn URL</Label>
              <Input value={manual.linkedin_url} onChange={(e) => setManual({ ...manual, linkedin_url: e.target.value })} className="h-9 rounded-lg" />
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} className="rounded-lg">Cancel</Button>
          <Button onClick={submit} disabled={pending} className="rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
            {pending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Import
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

async function parseCsv(file: File): Promise<any[]> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: any = {};
    header.forEach((h, i) => { if (cols[i]) row[h] = cols[i]; });
    return row;
  }).filter((r) => r.full_name);
}

/* ---------------- Launch Tab ---------------- */

function LaunchTab({ campaign, steps, leads, onLaunched }: {
  campaign: any; steps: any[]; leads: any[]; onLaunched: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const launch = useServerFn(launchCampaign);
  const launchM = useMutation({
    mutationFn: () => launch({ data: { id: campaign.id } }),
    onSuccess: (r) => {
      toast.success("Campaign launched");
      if (!r.n8n_configured) toast.message("Automation engine (n8n) not connected. Campaign is marked running — configure N8N_TRIGGER_URL to start execution.");
      onLaunched();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const totalDelayHours = steps.reduce((s, x) => s + x.delay_hours, 0);
  const days = Math.ceil((leads.length / Math.max(campaign.daily_limit, 1)) + totalDelayHours / 24);
  const connectionStep = steps.find((s) => s.type === "connection_request");
  const firstMessage = steps.find((s) => s.type === "message");

  const canLaunch = leads.length > 0 && steps.length >= 2 && (campaign.status === "draft" || campaign.status === "paused");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="rounded-2xl border-border/70 bg-white">
        <CardContent className="space-y-4 p-6">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Ready to launch</div>
            <div className="mt-1 text-[18px] font-semibold tracking-tight">{campaign.name}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y border-border/60 py-4 text-[13px]">
            <Stat label="Total leads" value={leads.length} />
            <Stat label="Sequence steps" value={steps.length} />
            <Stat label="Daily limit" value={`${campaign.daily_limit}/day`} />
            <Stat label="Working hours" value={`${campaign.working_hours_start}–${campaign.working_hours_end}`} />
            <Stat label="Timezone" value={campaign.timezone} />
            <Stat label="Est. completion" value={`~${days} day${days === 1 ? "" : "s"}`} />
          </div>

          {connectionStep?.config?.note && (
            <PreviewBlock label="Connection note preview" text={connectionStep.config.note} />
          )}
          {firstMessage?.config?.body && (
            <PreviewBlock label="First message preview" text={firstMessage.config.body} />
          )}

          <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-neutral-50 p-3">
            <Checkbox id="confirm" checked={confirm} onCheckedChange={(v) => setConfirm(Boolean(v))} className="mt-0.5" />
            <Label htmlFor="confirm" className="text-[12.5px] leading-relaxed">
              I've reviewed the sequence, leads, and messages. Automation will begin only after I press Launch.
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="rounded-lg" disabled={launchM.isPending}>Cancel</Button>
            <Button
              onClick={() => launchM.mutate()}
              disabled={!confirm || !canLaunch || launchM.isPending}
              className="rounded-lg bg-[#0A0A0A] hover:bg-[#262626]"
            >
              {launchM.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Rocket className="mr-1.5 h-3.5 w-3.5" />}
              Launch campaign
            </Button>
          </div>

          {!canLaunch && (
            <div className="text-[11.5px] text-muted-foreground">
              {leads.length === 0 && "Add at least one lead. "}
              {steps.length < 2 && "Add at least two sequence steps. "}
              {campaign.status !== "draft" && campaign.status !== "paused" && "Campaign is already running or completed."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[14px] font-medium">{value}</div>
    </div>
  );
}

function PreviewBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="rounded-xl border border-border/70 bg-neutral-50 p-3 text-[12.5px] leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
    </div>
  );
}

/* ---------------- Performance Tab ---------------- */

function PerformanceTab({ campaignId }: { campaignId: string }) {
  const perf = useServerFn(getCampaignPerformance);
  const { data, isLoading } = useQuery({
    queryKey: ["campaign-perf", campaignId],
    queryFn: () => perf({ data: { id: campaignId } }),
  });

  if (isLoading || !data) return <div className="grid place-items-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  const { funnel, totals } = data;
  const kpis = [
    { l: "Total leads", v: totals.total },
    { l: "Invitations sent", v: funnel.invited },
    { l: "Acceptance rate", v: `${Math.round(totals.acceptance_rate * 100)}%` },
    { l: "Messages sent", v: funnel.messaged },
    { l: "Reply rate", v: `${Math.round(totals.reply_rate * 100)}%` },
    { l: "Meetings booked", v: funnel.meetings },
  ];

  const funnelRows = [
    { l: "Profiles visited", v: funnel.visited },
    { l: "Invitations sent", v: funnel.invited },
    { l: "Connected", v: funnel.connected },
    { l: "Messages sent", v: funnel.messaged },
    { l: "Replied", v: funnel.replied },
    { l: "Meetings booked", v: funnel.meetings },
  ];
  const max = Math.max(...funnelRows.map((r) => r.v), 1);

  function exportCsv() {
    const rows = [["stage", "count"], ...funnelRows.map((r) => [r.l, String(r.v)])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `campaign-${campaignId}-performance.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Performance</h2>
          <p className="text-[12.5px] text-muted-foreground">Live data from Supabase. Events flow in as your automation runs.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} className="h-9 rounded-lg">Export CSV</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.l} className="rounded-2xl border-border/70 bg-white">
            <CardContent className="p-4">
              <div className="text-[11px] text-muted-foreground">{k.l}</div>
              <div className="mt-1 text-[20px] font-semibold tracking-tight">{k.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-border/70 bg-white">
        <CardContent className="p-5">
          <div className="mb-3 text-[13.5px] font-semibold tracking-tight">Funnel</div>
          <div className="space-y-2.5">
            {funnelRows.map((r) => (
              <div key={r.l}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span>{r.l}</span>
                  <span className="text-muted-foreground">{r.v}</span>
                </div>
                <Progress value={(r.v / max) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {data.daily.length > 0 && (
        <Card className="rounded-2xl border-border/70 bg-white">
          <CardContent className="p-5">
            <div className="mb-3 text-[13.5px] font-semibold tracking-tight">Daily activity</div>
            <div className="flex items-end gap-1.5 pt-4" style={{ height: 120 }}>
              {data.daily.map((d: any) => {
                const dmax = Math.max(...data.daily.map((x: any) => x.count), 1);
                return (
                  <div key={d.date} className="flex-1 rounded-t bg-neutral-900" style={{ height: `${(d.count / dmax) * 100}%` }} title={`${d.date}: ${d.count}`} />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
