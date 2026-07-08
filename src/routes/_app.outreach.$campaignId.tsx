import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getCampaign, saveSequence, generateConnectionNote, generateMessage,
  importLeads, importLeadsFromUrls, removeCampaignLead, setCampaignLeadPaused,
  bulkUpdateCampaignLeads, launchCampaign, getCampaignPerformance,
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
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft, ChevronRight, Sparkles, Loader2, Upload, LinkIcon, UserPlus, ListPlus,
  MoreHorizontal, Play, Pause, ExternalLink, Trash2, Rocket, Eye, MessageSquare, UserPlus2,
  ArrowUp, ArrowDown, Copy, Clock, Plus, Search, Download, Filter, TrendingUp, Lightbulb,
  Mail, Building2, User, X,
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
  const statusTone: Record<string, string> = {
    draft: "bg-neutral-100 text-neutral-700",
    running: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paused: "bg-amber-50 text-amber-700 border-amber-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
    archived: "bg-neutral-100 text-neutral-500",
  };

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
              <Badge variant="outline" className={`h-5 rounded-md px-1.5 text-[10.5px] capitalize ${statusTone[c.status] ?? ""}`}>
                {c.status}
              </Badge>
              <span className="text-[11.5px] text-muted-foreground">· {data.leads.length} leads · {data.steps.length} steps</span>
            </div>
            {c.description && <p className="mt-0.5 text-[13px] text-muted-foreground">{c.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="h-9 rounded-lg">
              <Link to="/outreach"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back</Link>
            </Button>
            {(c.status === "draft" || c.status === "paused") && (
              <Button
                onClick={() => navigate({ to: "/outreach/$campaignId", params: { campaignId }, search: { tab: "launch" } })}
                className="h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]"
              >
                <Rocket className="mr-1.5 h-3.5 w-3.5" /> Launch
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => navigate({ to: "/outreach/$campaignId", params: { campaignId }, search: { tab: v as any } })}>
        <div className="border-b border-border/60 bg-white/50 px-8">
          <TabsList className="h-11 gap-1 bg-transparent p-0">
            {[
              { v: "sequence", l: "Sequence" },
              { v: "leads", l: "Leads list" },
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
            <LeadsTab campaignId={campaignId} leads={data.leads} steps={data.steps} onChanged={refetch} />
          </TabsContent>
          <TabsContent value="launch" className="mt-0">
            <LaunchTab campaign={c} steps={data.steps} leads={data.leads} onLaunched={refetch} />
          </TabsContent>
          <TabsContent value="performance" className="mt-0">
            <PerformanceTab campaignId={campaignId} leads={data.leads} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

/* ============================================================
   SEQUENCE TAB
============================================================ */

type StepType = "visit_profile" | "connection_request" | "message";
type Step = {
  id?: string;
  step_order: number;
  type: StepType;
  delay_hours: number;
  config: Record<string, any>;
};

const DEFAULT_STEPS: Step[] = [
  { step_order: 1, type: "visit_profile", delay_hours: 0, config: { human_delay: true, enabled: true } },
  { step_order: 2, type: "connection_request", delay_hours: 12, config: { note: "", enabled: true, mode: "custom" } },
  { step_order: 3, type: "message", delay_hours: 48, config: { name: "Intro", body: "", enabled: true, mode: "custom" } },
];

function SequenceTab({ campaignId, initialSteps, onSaved }: {
  campaignId: string; initialSteps: any[]; onSaved: () => void;
}) {
  const [steps, setSteps] = useState<Step[]>(() =>
    (initialSteps.length ? initialSteps : DEFAULT_STEPS).map((s: any) => ({
      step_order: s.step_order,
      type: s.type,
      delay_hours: s.delay_hours,
      config: { enabled: true, ...(s.config ?? {}) },
    })),
  );
  const [editorIdx, setEditorIdx] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);

  const save = useServerFn(saveSequence);
  const saveM = useMutation({
    mutationFn: () => save({ data: { campaign_id: campaignId, steps } }),
    onSuccess: () => { toast.success("Sequence saved"); setDirty(false); onSaved(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function mutate(fn: (prev: Step[]) => Step[]) {
    setSteps((prev) => fn(prev).map((s, i) => ({ ...s, step_order: i + 1 })));
    setDirty(true);
  }
  function updateStep(idx: number, patch: Partial<Step>) {
    mutate((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }
  function updateConfig(idx: number, patch: Record<string, any>) {
    mutate((prev) => prev.map((s, i) => i === idx ? { ...s, config: { ...s.config, ...patch } } : s));
  }
  function remove(idx: number) {
    if (steps.length <= 1) { toast.error("Keep at least one step"); return; }
    mutate((prev) => prev.filter((_, i) => i !== idx));
  }
  function duplicate(idx: number) {
    mutate((prev) => {
      const copy = { ...prev[idx], id: undefined, config: { ...prev[idx].config } };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }
  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= steps.length) return;
    mutate((prev) => {
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }
  function addStep(type: StepType) {
    const defaultDelay = type === "visit_profile" ? 0 : type === "connection_request" ? 12 : 48;
    const config: Record<string, any> = { enabled: true };
    if (type === "connection_request") { config.note = ""; config.mode = "custom"; }
    if (type === "message") { config.name = `Follow-up ${steps.filter(s => s.type === "message").length + 1}`; config.body = ""; config.mode = "custom"; }
    if (type === "visit_profile") config.human_delay = true;
    mutate((prev) => [...prev, { step_order: prev.length + 1, type, delay_hours: defaultDelay, config }]);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Sequence</h2>
          <p className="text-[12.5px] text-muted-foreground">Design your outreach workflow. Only Profile Visit, Invitation, Message, and Wait are supported.</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-[11.5px] text-amber-600">Unsaved changes</span>}
          <Button onClick={() => saveM.mutate()} disabled={saveM.isPending || !dirty} className="h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
            {saveM.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Save sequence
          </Button>
        </div>
      </div>

      {steps.map((s, idx) => (
        <div key={idx}>
          <StepCard
            step={s}
            index={idx}
            total={steps.length}
            onDelay={(v) => updateStep(idx, { delay_hours: v })}
            onConfig={(p) => updateConfig(idx, p)}
            onEdit={() => setEditorIdx(idx)}
            onRemove={() => remove(idx)}
            onDuplicate={() => duplicate(idx)}
            onUp={() => move(idx, -1)}
            onDown={() => move(idx, 1)}
          />
          {idx < steps.length - 1 && (
            <div className="my-2 flex items-center justify-center gap-2">
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-2.5 py-0.5 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" /> Wait {formatDelay(steps[idx + 1].delay_hours)}
              </div>
              <div className="h-4 w-px bg-border" />
            </div>
          )}
        </div>
      ))}

      <div className="pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-10 w-full rounded-xl border-dashed">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add step
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 rounded-xl">
            <DropdownMenuItem onSelect={() => addStep("visit_profile")}>
              <Eye className="mr-2 h-3.5 w-3.5" /> Visit profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => addStep("connection_request")}>
              <UserPlus2 className="mr-2 h-3.5 w-3.5" /> Send invitation
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => addStep("message")}>
              <MessageSquare className="mr-2 h-3.5 w-3.5" /> Send message
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {editorIdx !== null && (
        <MessageEditor
          campaignId={campaignId}
          step={steps[editorIdx]}
          onClose={() => setEditorIdx(null)}
          onSave={(patch) => { updateConfig(editorIdx, patch); setEditorIdx(null); }}
        />
      )}
    </div>
  );
}

function formatDelay(hours: number) {
  if (hours <= 0) return "immediately";
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function StepCard({ step, index, total, onDelay, onConfig, onEdit, onRemove, onDuplicate, onUp, onDown }: {
  step: Step; index: number; total: number;
  onDelay: (v: number) => void;
  onConfig: (p: Record<string, any>) => void;
  onEdit: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onUp: () => void; onDown: () => void;
}) {
  const label = step.type === "visit_profile" ? "Visit profile"
    : step.type === "connection_request" ? "Send invitation"
    : (step.config.name || "Send message");
  const Icon = step.type === "visit_profile" ? Eye : step.type === "connection_request" ? UserPlus2 : MessageSquare;
  const enabled = step.config.enabled !== false;
  const modeChip = step.type !== "visit_profile" ? (step.config.mode === "ai" ? "AI generated" : "Custom") : null;
  const preview = step.type === "connection_request" ? (step.config.note || "").trim()
    : step.type === "message" ? (step.config.body || "").trim() : "";

  return (
    <Card className={`rounded-2xl border-border/70 bg-white transition-opacity ${enabled ? "" : "opacity-60"}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-900 text-white">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate text-[13.5px] font-semibold tracking-tight">{index + 1}. {label}</div>
                {modeChip && (
                  <Badge variant="outline" className="h-4.5 rounded-md px-1.5 text-[10px]">{modeChip}</Badge>
                )}
              </div>
              <div className="text-[11.5px] text-muted-foreground">
                {index === 0 ? "Starts immediately after launch" : `Wait ${formatDelay(step.delay_hours)} after previous step`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 pr-1">
              <span className="text-[10.5px] text-muted-foreground">On</span>
              <Switch checked={enabled} onCheckedChange={(v) => onConfig({ enabled: v })} />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onUp} disabled={index === 0}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onDown} disabled={index === total - 1}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onSelect={onDuplicate}><Copy className="mr-2 h-3.5 w-3.5" /> Duplicate</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onRemove} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
          <div>
            {step.type === "visit_profile" && (
              <p className="text-[12px] text-muted-foreground">
                Visits the lead's LinkedIn profile to warm them up before the invitation.
              </p>
            )}
            {step.type === "connection_request" && (
              <div className="rounded-xl border border-border/70 bg-neutral-50 p-3 text-[12.5px] leading-relaxed text-neutral-700 line-clamp-2">
                {preview || <span className="text-muted-foreground italic">No connection note yet — click Edit to write one.</span>}
              </div>
            )}
            {step.type === "message" && (
              <div className="rounded-xl border border-border/70 bg-neutral-50 p-3 text-[12.5px] leading-relaxed text-neutral-700 line-clamp-3 whitespace-pre-wrap">
                {preview || <span className="text-muted-foreground italic">Empty message — click Edit to compose.</span>}
              </div>
            )}
          </div>
          <div className="flex items-start gap-2">
            {index > 0 && (
              <div className="w-32">
                <Label className="mb-1 block text-[10.5px] text-muted-foreground">Wait (hours)</Label>
                <Input type="number" min={0} value={step.delay_hours}
                  onChange={(e) => onDelay(Math.max(0, Number(e.target.value)))}
                  className="h-8 rounded-lg text-[12.5px]" />
              </div>
            )}
            {step.type !== "visit_profile" && (
              <Button variant="outline" onClick={onEdit} className="h-8 rounded-lg text-[12px]">Edit</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------ Message Editor Dialog ------------- */

const VARIABLES = [
  { k: "{{first_name}}", label: "First name" },
  { k: "{{last_name}}", label: "Last name" },
  { k: "{{company}}", label: "Company" },
  { k: "{{job_title}}", label: "Job title" },
  { k: "{{industry}}", label: "Industry" },
  { k: "{{location}}", label: "Location" },
  { k: "{{sender_name}}", label: "Sender name" },
];

function MessageEditor({ campaignId, step, onClose, onSave }: {
  campaignId: string; step: Step;
  onClose: () => void; onSave: (patch: Record<string, any>) => void;
}) {
  const isNote = step.type === "connection_request";
  const bodyKey = isNote ? "note" : "body";
  const [mode, setMode] = useState<"ai" | "custom">((step.config.mode as any) || "custom");
  const [name, setName] = useState<string>(step.config.name ?? "");
  const [text, setText] = useState<string>(step.config[bodyKey] ?? "");
  const [aiHint, setAiHint] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const genNote = useServerFn(generateConnectionNote);
  const genMsg = useServerFn(generateMessage);

  async function generate() {
    setBusy(true);
    try {
      const r = isNote
        ? await genNote({ data: { campaign_id: campaignId, hint: aiHint || undefined } })
        : await genMsg({ data: { campaign_id: campaignId, step_order: step.step_order, hint: aiHint || undefined } });
      setText(r.text);
      toast.success("AI draft ready — review and save");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI failed");
    } finally {
      setBusy(false);
    }
  }

  function insertVar(v: string) {
    const el = ref.current;
    if (!el) { setText((t) => t + v); return; }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    setText(text.slice(0, start) + v + text.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + v.length;
    });
  }

  const limit = isNote ? 300 : 2000;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle className="text-[15px]">
            {isNote ? "Edit invitation note" : "Edit message"}
          </DialogTitle>
          <DialogDescription className="text-[12.5px]">
            {isNote
              ? "Short LinkedIn connection note sent with the invitation. Max 300 characters."
              : "Message sent after the lead accepts your invitation."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {!isNote && (
            <div className="space-y-1.5">
              <Label className="text-[11.5px]">Step name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-lg" />
            </div>
          )}

          <div className="inline-flex rounded-xl border border-border/70 bg-neutral-50 p-1">
            {[
              { v: "custom" as const, l: "Custom message" },
              { v: "ai" as const, l: "AI generated" },
            ].map((t) => (
              <button
                key={t.v}
                onClick={() => setMode(t.v)}
                className={`rounded-lg px-3 py-1 text-[12px] transition ${mode === t.v ? "bg-white shadow-sm" : "text-muted-foreground"}`}
              >
                {t.l}
              </button>
            ))}
          </div>

          {mode === "ai" ? (
            <div className="space-y-2 rounded-xl border border-border/70 bg-white p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 text-neutral-500" />
                <p className="text-[12px] text-muted-foreground">
                  A unique message is generated per lead using their name, title, company, industry, your Sales Brain,
                  profile, tone, and knowledge base. No two leads receive identical copy.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11.5px]">Optional angle / intent (helps the AI)</Label>
                <Input value={aiHint} onChange={(e) => setAiHint(e.target.value)}
                  placeholder="e.g. Congratulate on recent raise, then offer a 15-min chat"
                  className="h-9 rounded-lg" />
              </div>
              <Button onClick={generate} disabled={busy} variant="outline" className="h-8 rounded-lg text-[12px]">
                {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                Preview sample
              </Button>
              {text && (
                <div className="rounded-lg border border-border/70 bg-neutral-50 p-3 text-[12.5px] whitespace-pre-wrap">
                  {text}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10.5px] uppercase tracking-wider text-muted-foreground mr-1">Insert variable</span>
                {VARIABLES.map((v) => (
                  <button key={v.k} onClick={() => insertVar(v.k)}
                    className="rounded-md border border-border/70 bg-white px-1.5 py-0.5 text-[10.5px] hover:bg-neutral-50">
                    {v.k}
                  </button>
                ))}
              </div>
              <Textarea
                ref={ref}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, limit))}
                className={`rounded-lg text-[13px] ${isNote ? "min-h-[120px]" : "min-h-[200px]"}`}
                placeholder={isNote
                  ? "Hi {{first_name}}, love what you're building at {{company}} — would be great to connect."
                  : "Hi {{first_name}}, thanks for connecting. I noticed {{company}} is scaling in {{industry}} and…"}
              />
              <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
                <span>Personalization variables are replaced per lead when sent.</span>
                <span>{text.length}/{limit}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/60 px-6 py-3">
          <Button variant="ghost" onClick={onClose} className="rounded-lg">Cancel</Button>
          <Button
            onClick={() => onSave({ mode, [bodyKey]: text, ...(isNote ? {} : { name }) })}
            className="rounded-lg bg-[#0A0A0A] hover:bg-[#262626]"
          >
            Save step
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   LEADS LIST TAB
============================================================ */

function LeadsTab({ campaignId, leads, steps, onChanged }: {
  campaignId: string; leads: any[]; steps: any[]; onChanged: () => void;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string>("created");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    let out = leads.filter((cl) => {
      const l = cl.lead;
      if (!l) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "paused" ? !cl.paused : cl.status !== statusFilter) return false;
      }
      if (!q) return true;
      return (l.full_name?.toLowerCase().includes(q)
        || l.company?.toLowerCase().includes(q)
        || l.role?.toLowerCase().includes(q)
        || l.email?.toLowerCase().includes(q));
    });
    out = [...out].sort((a, b) => {
      if (sortKey === "name") return (a.lead?.full_name ?? "").localeCompare(b.lead?.full_name ?? "");
      if (sortKey === "company") return (a.lead?.company ?? "").localeCompare(b.lead?.company ?? "");
      if (sortKey === "score") return (b.lead?.icp_score ?? 0) - (a.lead?.icp_score ?? 0);
      if (sortKey === "step") return b.current_step - a.current_step;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return out;
  }, [leads, query, statusFilter, sortKey]);

  const rem = useServerFn(removeCampaignLead);
  const pause = useServerFn(setCampaignLeadPaused);
  const bulk = useServerFn(bulkUpdateCampaignLeads);

  const remM = useMutation({
    mutationFn: (id: string) => rem({ data: { id } }),
    onSuccess: () => { toast.success("Lead removed"); onChanged(); },
  });
  const pauseM = useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) => pause({ data: { id, paused } }),
    onSuccess: () => { toast.success("Updated"); onChanged(); },
  });
  const bulkM = useMutation({
    mutationFn: (action: "pause" | "resume" | "remove") => bulk({ data: { ids: [...selected], action } }),
    onSuccess: (r) => { toast.success(`${r.count} lead${r.count === 1 ? "" : "s"} updated`); setSelected(new Set()); onChanged(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function toggleAll(v: boolean) {
    if (v) setSelected(new Set(filtered.map((cl) => cl.id)));
    else setSelected(new Set());
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exportCsv() {
    const cols = ["Name", "Company", "Job Title", "LinkedIn", "Email", "Status", "Current Step", "Score"];
    const rows = filtered.map((cl) => [
      cl.lead?.full_name ?? "", cl.lead?.company ?? "", cl.lead?.role ?? "",
      cl.lead?.linkedin_url ?? "", cl.lead?.email ?? "",
      cl.paused ? "paused" : cl.status, String(cl.current_step),
      String(cl.lead?.icp_score ?? ""),
    ]);
    const csv = [cols, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `campaign-${campaignId}-leads.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const drawerLead = drawerId ? leads.find((cl) => cl.id === drawerId) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Leads ({leads.length})</h2>
          <p className="text-[12.5px] text-muted-foreground">Manage everyone enrolled in this campaign. Automation only touches them after launch.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCsv} className="h-9 rounded-lg text-[12.5px]">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button onClick={() => setImportOpen(true)} className="h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
            <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add leads
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, company, role, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-72 rounded-xl bg-white pl-8 text-[13px]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-40 rounded-xl bg-white text-[12.5px]">
            <Filter className="mr-1.5 h-3.5 w-3.5" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="meeting_booked">Meeting booked</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="h-9 w-40 rounded-xl bg-white text-[12.5px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created">Newest</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
            <SelectItem value="company">Company (A–Z)</SelectItem>
            <SelectItem value="score">Score (high → low)</SelectItem>
            <SelectItem value="step">Current step</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-neutral-50 px-3 py-2">
          <div className="text-[12.5px]">{selected.size} selected</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => bulkM.mutate("pause")} className="h-8 rounded-lg text-[12px]">
              <Pause className="mr-1.5 h-3 w-3" /> Pause
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkM.mutate("resume")} className="h-8 rounded-lg text-[12px]">
              <Play className="mr-1.5 h-3 w-3" /> Resume
            </Button>
            <Button size="sm" variant="outline" onClick={() => bulkM.mutate("remove")}
              className="h-8 rounded-lg text-[12px] text-destructive hover:text-destructive">
              <Trash2 className="mr-1.5 h-3 w-3" /> Remove
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="h-8 rounded-lg text-[12px]">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <Card className="rounded-2xl border-border/70 bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60">
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onCheckedChange={(v) => toggleAll(Boolean(v))}
                  />
                </TableHead>
                {["Name", "Company", "Job title", "Email", "Status", "Step", "Last activity", "Next action", "Score", "Sender", ""].map((h) => (
                  <TableHead key={h} className="text-[11.5px] font-medium">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-14 text-center text-[13px] text-muted-foreground">
                    {leads.length === 0 ? (
                      <>No leads yet. <button onClick={() => setImportOpen(true)} className="underline">Add some</button> to start.</>
                    ) : "No leads match your filters."}
                  </TableCell>
                </TableRow>
              ) : filtered.map((cl) => {
                const l = cl.lead;
                const isSel = selected.has(cl.id);
                return (
                  <TableRow key={cl.id}
                    data-state={isSel ? "selected" : undefined}
                    className="cursor-pointer border-border/60 hover:bg-neutral-50/60"
                    onClick={() => setDrawerId(cl.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSel} onCheckedChange={() => toggle(cl.id)} />
                    </TableCell>
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
                          {l.headline && <div className="max-w-[220px] truncate text-[11px] text-muted-foreground">{l.headline}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[12.5px]">{l.company ?? "—"}</TableCell>
                    <TableCell className="text-[12.5px]">{l.role ?? "—"}</TableCell>
                    <TableCell className="text-[12.5px]">
                      {l.email ? <span className="truncate">{l.email}</span> : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={cl.paused ? "paused" : cl.status} />
                    </TableCell>
                    <TableCell className="text-[12.5px]">
                      {cl.current_step}/{steps.length}
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{fmtDate(cl.last_activity_at)}</TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">{fmtDate(cl.next_action_at)}</TableCell>
                    <TableCell className="text-[12.5px]">
                      {typeof l.icp_score === "number" ? (
                        <span className="inline-flex items-center rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium">{l.icp_score}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">—</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                          <DropdownMenuSeparator />
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

      {importOpen && (
        <Dialog open onOpenChange={(v) => !v && setImportOpen(false)}>
          <DialogContent className="max-w-2xl rounded-2xl p-0">
            <DialogHeader className="border-b border-border/60 px-6 py-4">
              <DialogTitle className="text-[15px]">Add leads to this campaign</DialogTitle>
              <DialogDescription className="text-[12.5px]">
                Import leads via CSV, LinkedIn URLs, or manually. Nothing is contacted until launch.
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-5">
              <LeadImportPanel campaignId={campaignId} onDone={() => { setImportOpen(false); onChanged(); }} onCancel={() => setImportOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <LeadDrawer
        open={Boolean(drawerLead)}
        onClose={() => setDrawerId(null)}
        cl={drawerLead}
        steps={steps}
      />
    </div>
  );
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  const now = Date.now();
  const diff = d.getTime() - now;
  const absH = Math.abs(diff) / 36e5;
  if (absH < 24) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    pending: "bg-neutral-100 text-neutral-700",
    running: "bg-blue-50 text-blue-700 border-blue-200",
    replied: "bg-emerald-50 text-emerald-700 border-emerald-200",
    meeting_booked: "bg-violet-50 text-violet-700 border-violet-200",
    completed: "bg-neutral-100 text-neutral-500",
    paused: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <Badge variant="outline" className={`h-5 rounded-md px-1.5 text-[10.5px] capitalize ${tone[status] ?? ""}`}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function LeadDrawer({ open, onClose, cl, steps }: { open: boolean; onClose: () => void; cl: any; steps: any[] }) {
  const l = cl?.lead;
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        {l && (
          <>
            <SheetHeader className="border-b border-border/60 px-6 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={l.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-neutral-900 text-[12px] text-white">
                    {(l.full_name ?? "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-[15px]">{l.full_name}</SheetTitle>
                  <div className="text-[12px] text-muted-foreground truncate">{l.headline || l.role}</div>
                </div>
                <StatusBadge status={cl.paused ? "paused" : cl.status} />
              </div>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-88px)]">
              <div className="space-y-5 px-6 py-5">
                <section className="grid grid-cols-2 gap-3 text-[12.5px]">
                  <DrawerField icon={Building2} label="Company" value={l.company} />
                  <DrawerField icon={User} label="Role" value={l.role} />
                  <DrawerField icon={Mail} label="Email" value={l.email} />
                  <DrawerField icon={LinkIcon} label="LinkedIn" value={l.linkedin_url}
                    href={l.linkedin_url} />
                  <DrawerField label="Industry" value={l.industry} />
                  <DrawerField label="Location" value={l.country} />
                  <DrawerField label="Score" value={l.icp_score != null ? String(l.icp_score) : null} />
                  <DrawerField label="Source" value={l.source} />
                </section>

                <section>
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Sequence position</div>
                  <div className="rounded-xl border border-border/70 bg-white p-3 text-[12.5px]">
                    Currently on step <span className="font-medium">{cl.current_step}</span> of {steps.length}.
                    <div className="mt-1 text-[11.5px] text-muted-foreground">
                      Next action: {fmtDate(cl.next_action_at)} · Last activity: {fmtDate(cl.last_activity_at)}
                    </div>
                  </div>
                </section>

                {l.ai_notes && (
                  <section>
                    <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">AI notes</div>
                    <div className="rounded-xl border border-border/70 bg-neutral-50 p-3 text-[12.5px] whitespace-pre-wrap">
                      {l.ai_notes}
                    </div>
                  </section>
                )}

                <section>
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Timeline</div>
                  <div className="rounded-xl border border-border/70 bg-white p-3 text-[12.5px] text-muted-foreground">
                    Conversation history and event timeline appear here once automation starts.
                  </div>
                </section>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DrawerField({ icon: Icon, label, value, href }: { icon?: any; label: string; value?: string | null; href?: string | null }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[10.5px] uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </div>
      <div className="mt-0.5 truncate text-[12.5px]">
        {href ? <a href={href} target="_blank" rel="noreferrer" className="underline">{value ?? "—"}</a> : (value || <span className="text-muted-foreground">—</span>)}
      </div>
    </div>
  );
}

/* ------- Lead import panel (reused) ------- */

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
    <div>
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
          <Label className="text-[12px]">Upload CSV (columns: full_name, company, role, industry, linkedin_url, email)</Label>
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
    </div>
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

/* ============================================================
   LAUNCH TAB
============================================================ */

function LaunchTab({ campaign, steps, leads, onLaunched }: {
  campaign: any; steps: any[]; leads: any[]; onLaunched: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const launch = useServerFn(launchCampaign);
  const launchM = useMutation({
    mutationFn: () => launch({ data: { id: campaign.id } }),
    onSuccess: (r) => {
      toast.success("Campaign launched");
      if (!r.n8n_configured) toast.message("Automation engine (n8n) not connected. Campaign is marked running — configure N8N_TRIGGER_URL to start execution.");
      setConfirmOpen(false);
      onLaunched();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const messageCount = steps.filter((s) => s.type === "message" || s.type === "connection_request").length;
  const totalDelayHours = steps.reduce((s, x) => s + x.delay_hours, 0);
  const days = Math.ceil((leads.length / Math.max(campaign.daily_limit, 1)) + totalDelayHours / 24);
  const canLaunch = leads.length > 0 && steps.length >= 1 && (campaign.status === "draft" || campaign.status === "paused");

  const problems: string[] = [];
  if (leads.length === 0) problems.push("Add at least one lead in the Leads list tab.");
  if (steps.length < 1) problems.push("Design at least one step in the Sequence tab.");
  if (steps.some((s) => (s.type === "connection_request" || s.type === "message") && !(s.config?.note || s.config?.body) && s.config?.mode !== "ai")) {
    problems.push("Some message steps are empty. Fill them or switch to AI generated.");
  }
  if (campaign.status === "running") problems.push("Campaign is already running.");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card className="rounded-2xl border-border/70 bg-white">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Ready to launch</div>
              <div className="mt-1 text-[18px] font-semibold tracking-tight">{campaign.name}</div>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Review everything below. Nothing is contacted until you press Launch.
              </p>
            </div>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!canLaunch}
              className="h-10 rounded-xl bg-[#0A0A0A] px-5 hover:bg-[#262626]"
            >
              <Rocket className="mr-1.5 h-3.5 w-3.5" /> Launch campaign
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 border-y border-border/60 py-4 text-[13px] md:grid-cols-3">
            <Stat label="Total leads" value={leads.length} />
            <Stat label="Sequence steps" value={steps.length} />
            <Stat label="Messages / notes" value={messageCount} />
            <Stat label="Daily limit" value={`${campaign.daily_limit}/day`} />
            <Stat label="Working hours" value={`${campaign.working_hours_start}–${campaign.working_hours_end} ${campaign.timezone}`} />
            <Stat label="Est. completion" value={`~${days} day${days === 1 ? "" : "s"}`} />
            <Stat label="LinkedIn sender" value={campaign.sender_account || "Not set"} />
            <Stat label="Status" value={campaign.status} />
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Sequence summary</div>
            <ol className="space-y-1.5">
              {steps.map((s, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg border border-border/60 bg-neutral-50 px-3 py-2 text-[12.5px]">
                  <span className="inline-grid h-5 w-5 place-items-center rounded-md bg-neutral-900 text-[10.5px] text-white">{i + 1}</span>
                  <span className="font-medium capitalize">{s.type.replace("_", " ")}</span>
                  {s.config?.name && <span className="text-muted-foreground">· {s.config.name}</span>}
                  <span className="ml-auto text-muted-foreground">
                    {i === 0 ? "immediately" : `wait ${formatDelay(s.delay_hours)}`}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {problems.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
              <div className="mb-1 font-medium">Before you launch:</div>
              <ul className="list-inside list-disc space-y-0.5">
                {problems.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Launch this campaign?</DialogTitle>
            <DialogDescription className="text-[12.5px]">
              The sequence will start automatically for {leads.length} lead{leads.length === 1 ? "" : "s"} using your daily limit of {campaign.daily_limit}/day.
              Once launched, LinkedIn actions will begin — this cannot be undone easily.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border/70 bg-neutral-50 p-3 text-[12.5px] space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Campaign</span><span className="font-medium">{campaign.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Leads</span><span>{leads.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Steps</span><span>{steps.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Daily limit</span><span>{campaign.daily_limit}/day</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Est. completion</span><span>~{days} day{days === 1 ? "" : "s"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Sender</span><span>{campaign.sender_account || "—"}</span></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} className="rounded-lg">Cancel</Button>
            <Button
              onClick={() => launchM.mutate()}
              disabled={launchM.isPending || !canLaunch}
              className="rounded-lg bg-[#0A0A0A] hover:bg-[#262626]"
            >
              {launchM.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Rocket className="mr-1.5 h-3.5 w-3.5" />}
              Launch campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-[14px] font-medium capitalize">{value}</div>
    </div>
  );
}

/* ============================================================
   PERFORMANCE TAB
============================================================ */

function PerformanceTab({ campaignId, leads }: { campaignId: string; leads: any[] }) {
  const perf = useServerFn(getCampaignPerformance);
  const { data, isLoading } = useQuery({
    queryKey: ["campaign-perf", campaignId],
    queryFn: () => perf({ data: { id: campaignId } }),
  });
  const [range, setRange] = useState<"7" | "30" | "90" | "all">("30");

  if (isLoading || !data) return <div className="grid place-items-center py-16"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  const { funnel, totals } = data;
  const interested = leads.filter((cl) => cl.status === "replied").length;
  const meetings = leads.filter((cl) => cl.status === "meeting_booked").length;

  const kpis = [
    { l: "Total leads", v: totals.total },
    { l: "Profile visits", v: funnel.visited },
    { l: "Invitations", v: funnel.invited },
    { l: "Accepted", v: funnel.connected },
    { l: "Messages sent", v: funnel.messaged },
    { l: "Replies", v: funnel.replied },
    { l: "Reply rate", v: `${Math.round(totals.reply_rate * 100)}%` },
    { l: "Interested", v: interested },
    { l: "Meetings booked", v: meetings },
    { l: "Conversion rate", v: `${Math.round(totals.conversion_rate * 100)}%` },
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

  const now = Date.now();
  const cutoff = range === "all" ? 0 : now - Number(range) * 86400000;
  const daily = (data.daily as any[]).filter((d) => new Date(d.date).getTime() >= cutoff);
  const dmax = Math.max(...daily.map((x: any) => x.count), 1);

  // AI insights (derived)
  const insights: string[] = [];
  if (funnel.invited && totals.acceptance_rate < 0.2) insights.push("Acceptance rate is below 20%. Try softening your connection note or targeting a warmer audience.");
  if (funnel.messaged && totals.reply_rate < 0.05) insights.push("Reply rate is under 5%. Test a shorter first message with a single clear question.");
  if (funnel.visited > funnel.invited * 2 && funnel.invited > 0) insights.push("Many profiles are visited but not invited — consider tightening the wait between Visit and Invitation.");
  if (funnel.connected && funnel.messaged === 0) insights.push("You have connections but no messages sent yet. Enable or edit the first message step.");
  if (insights.length === 0) insights.push("Everything looks healthy so far. Once more events flow in, tailored recommendations will appear here.");

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Performance</h2>
          <p className="text-[12.5px] text-muted-foreground">Live analytics from your campaign events.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as any)}>
            <SelectTrigger className="h-9 w-36 rounded-xl bg-white text-[12.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCsv} className="h-9 rounded-lg text-[12.5px]">
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.l} className="rounded-2xl border-border/70 bg-white">
            <CardContent className="p-4">
              <div className="text-[11px] text-muted-foreground">{k.l}</div>
              <div className="mt-1 text-[20px] font-semibold tracking-tight">{k.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/70 bg-white">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[13.5px] font-semibold tracking-tight">Funnel</div>
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
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

        <Card className="rounded-2xl border-border/70 bg-white">
          <CardContent className="p-5">
            <div className="mb-3 text-[13.5px] font-semibold tracking-tight">Daily activity</div>
            {daily.length === 0 ? (
              <div className="grid h-32 place-items-center text-[12px] text-muted-foreground">No activity in this range yet.</div>
            ) : (
              <div className="flex items-end gap-1.5 pt-4" style={{ height: 140 }}>
                {daily.map((d: any) => (
                  <div key={d.date} className="flex-1 rounded-t bg-neutral-900" style={{ height: `${(d.count / dmax) * 100}%` }} title={`${d.date}: ${d.count}`} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/70 bg-white">
        <CardContent className="p-5">
          <div className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold tracking-tight">
            <Lightbulb className="h-3.5 w-3.5" /> AI insights & recommendations
          </div>
          <ul className="space-y-1.5 text-[12.5px] text-neutral-700">
            {insights.map((i, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-1 w-1 rounded-full bg-neutral-500" />
                <span>{i}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
