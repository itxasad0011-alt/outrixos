import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { addKnowledgeDoc } from "@/lib/ai/agent.functions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Link as LinkIcon, FileText, Quote, Award, BookOpen, Plus, Trash2,
  Upload, X, Check, ChevronsUpDown, ExternalLink, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/knowledge")({ component: KbPage });

const KINDS = [
  { id: "link", label: "Link", icon: LinkIcon, hint: "Add a webpage or article" },
  { id: "pdf", label: "PDF", icon: FileText, hint: "Upload a PDF file" },
  { id: "doc", label: "Doc", icon: BookOpen, hint: "Upload a Word document" },
  { id: "testimonial", label: "Testimonial", icon: Quote, hint: "Quote from a client" },
  { id: "case_study", label: "Case Study", icon: Award, hint: "Detailed project story" },
] as const;

type KindId = typeof KINDS[number]["id"];
type Lead = { id: string; full_name: string; company: string | null; avatar_url: string | null; linkedin_url: string | null };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function KbPage() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<KindId>("link");

  const { data: docs = [] } = useQuery({
    queryKey: ["kb"],
    queryFn: async () => {
      const { data } = await supabase.from("knowledge_docs").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  async function remove(id: string) {
    const { error } = await supabase.from("knowledge_docs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["kb"] });
  }

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        description="Feed the AI. Links, testimonials, case studies, and docs used during conversations."
      />
      <div className="grid gap-6 px-8 py-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* List */}
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-0">
            {docs.length === 0 ? (
              <div className="grid place-items-center gap-2 py-16 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-muted">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-[14px] font-medium">Nothing here yet</div>
                <div className="text-[12.5px] text-muted-foreground max-w-sm">
                  Add your first knowledge item — links, testimonials, case studies, or docs the AI can quote from.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {docs.map((d) => {
                  const Icon = KINDS.find((k) => k.id === d.kind)?.icon ?? LinkIcon;
                  return (
                    <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium">{d.title}</div>
                        <div className="truncate text-[11.5px] text-muted-foreground">
                          {d.url || d.content?.slice(0, 120) || d.kind}
                        </div>
                      </div>
                      {d.url && (
                        <a href={d.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => remove(d.id)} className="rounded-lg text-muted-foreground hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add card */}
        <Card className="rounded-2xl border-border/70 h-fit">
          <CardContent className="space-y-4 p-5">
            <div>
              <div className="text-[14px] font-semibold">Add to knowledge</div>
              <div className="text-[12px] text-muted-foreground mt-0.5">
                {KINDS.find((k) => k.id === kind)?.hint}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k.id}
                  onClick={() => setKind(k.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] transition ${
                    kind === k.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border/70 bg-background text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  <k.icon className="h-3 w-3" />{k.label}
                </button>
              ))}
            </div>

            <div key={kind} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
              {kind === "link" && <LinkForm onDone={() => qc.invalidateQueries({ queryKey: ["kb"] })} />}
              {kind === "pdf" && <FileForm kind="pdf" onDone={() => qc.invalidateQueries({ queryKey: ["kb"] })} />}
              {kind === "doc" && <FileForm kind="doc" onDone={() => qc.invalidateQueries({ queryKey: ["kb"] })} />}
              {kind === "testimonial" && <TestimonialForm onDone={() => qc.invalidateQueries({ queryKey: ["kb"] })} />}
              {kind === "case_study" && <CaseStudyForm onDone={() => qc.invalidateQueries({ queryKey: ["kb"] })} />}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- LINK ---------------- */

function LinkForm({ onDone }: { onDone: () => void }) {
  const add = useServerFn(addKnowledgeDoc);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  const m = useMutation({
    mutationFn: () => add({ data: { kind: "link", title: title.trim(), url: url.trim(), content: notes || undefined } }),
    onSuccess: () => {
      toast.success("Link added");
      setTitle(""); setUrl(""); setNotes("");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const canSubmit = title.trim() && url.trim();

  return (
    <div className="space-y-3">
      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 rounded-lg" placeholder="Playbook: cold outreach that works" />
      </Field>
      <Field label="URL">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} className="h-9 rounded-lg" placeholder="https://…" />
      </Field>
      <Field label="Context / notes" optional>
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-lg" placeholder="Why is this useful for the AI?" />
      </Field>
      <SubmitButton onClick={() => m.mutate()} disabled={!canSubmit || m.isPending} loading={m.isPending}>
        <LinkIcon className="mr-1.5 h-3.5 w-3.5" /> Add link
      </SubmitButton>
    </div>
  );
}

/* ---------------- PDF / DOC ---------------- */

const FILE_ACCEPT = { pdf: "application/pdf", doc: ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" };

function FileForm({ kind, onDone }: { kind: "pdf" | "doc"; onDone: () => void }) {
  const add = useServerFn(addKnowledgeDoc);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  function pickFile(f: File | null | undefined) {
    if (!f) return;
    if (kind === "pdf" && f.type !== "application/pdf") return toast.error("Please upload a PDF file");
    if (kind === "doc" && !/\.docx?$/i.test(f.name)) return toast.error("Please upload a .doc or .docx file");
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function upload() {
    if (!file) return;
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sign in required");
      const path = `${userData.user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("knowledge-files").upload(path, file, {
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("knowledge-files").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? path;
      await add({
        data: {
          kind,
          title: title.trim() || file.name,
          url,
          content: description || undefined,
        },
      });
      toast.success(`${kind === "pdf" ? "PDF" : "Document"} uploaded`);
      setFile(null); setTitle(""); setDescription("");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center cursor-pointer transition ${
          dragOver ? "border-foreground bg-muted/40" : "border-border/70 hover:border-foreground/30 hover:bg-muted/20"
        }`}
      >
        {file ? (
          <>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted">
              <FileText className="h-4 w-4" />
            </div>
            <div className="text-[13px] font-medium truncate max-w-[240px]">{file.name}</div>
            <div className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setFile(null); }}
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          </>
        ) : (
          <>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-muted">
              <Upload className="h-4 w-4" />
            </div>
            <div className="text-[13px] font-medium">Drop {kind === "pdf" ? "PDF" : "document"} here</div>
            <div className="text-[11.5px] text-muted-foreground">or click to browse</div>
          </>
        )}
        <input
          type="file"
          accept={FILE_ACCEPT[kind]}
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </label>

      <Field label="Title" optional>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 rounded-lg" placeholder="Auto-filled from file name" />
      </Field>
      <Field label="Description" optional>
        <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-lg" placeholder="What's inside this document?" />
      </Field>

      <SubmitButton onClick={upload} disabled={!file || uploading} loading={uploading}>
        <Upload className="mr-1.5 h-3.5 w-3.5" />
        {uploading ? "Uploading…" : kind === "pdf" ? "Upload PDF" : "Upload document"}
      </SubmitButton>
    </div>
  );
}

/* ---------------- TESTIMONIAL ---------------- */

const SOURCES = ["LinkedIn", "Email", "Website", "Upwork", "Fiverr", "Other"] as const;

function TestimonialForm({ onDone }: { onDone: () => void }) {
  const add = useServerFn(addKnowledgeDoc);
  const [lead, setLead] = useState<Lead | null>(null);
  const [body, setBody] = useState("");
  const [source, setSource] = useState<string>("");
  const [url, setUrl] = useState("");

  const m = useMutation({
    mutationFn: () => {
      if (!lead || !body.trim()) throw new Error("Client and testimonial are required");
      const payload = {
        lead_id: lead.id,
        name: lead.full_name,
        company: lead.company,
        source: source || null,
        body: body.trim(),
      };
      return add({
        data: {
          kind: "testimonial",
          title: `Testimonial · ${lead.full_name}${lead.company ? " — " + lead.company : ""}`,
          url: url.trim() || undefined,
          content: JSON.stringify(payload),
        },
      });
    },
    onSuccess: () => {
      toast.success("Testimonial saved");
      setLead(null); setBody(""); setSource(""); setUrl("");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <div className="space-y-3">
      <Field label="Client">
        <LeadCombobox value={lead} onChange={setLead} />
      </Field>

      {lead && <LeadPreview lead={lead} />}

      <Field label="Testimonial">
        <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} className="rounded-lg" placeholder="Paste the client's testimonial…" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Source" optional>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Testimonial URL" optional>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} className="h-9 rounded-lg" placeholder="https://…" />
        </Field>
      </div>

      <SubmitButton onClick={() => m.mutate()} disabled={!lead || !body.trim() || m.isPending} loading={m.isPending}>
        <Quote className="mr-1.5 h-3.5 w-3.5" /> Add testimonial
      </SubmitButton>
    </div>
  );
}

/* ---------------- CASE STUDY ---------------- */

function CaseStudyForm({ onDone }: { onDone: () => void }) {
  const add = useServerFn(addKnowledgeDoc);
  const [lead, setLead] = useState<Lead | null>(null);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [challenge, setChallenge] = useState("");
  const [solution, setSolution] = useState("");
  const [results, setResults] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  async function submit() {
    if (!lead) return toast.error("Select a client");
    if (!projectName.trim()) return toast.error("Project name is required");
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sign in required");
      const uploaded: { name: string; url: string }[] = [];
      for (const f of files) {
        const path = `${userData.user.id}/case-studies/${crypto.randomUUID()}-${f.name}`;
        const { error } = await supabase.storage.from("knowledge-files").upload(path, f);
        if (error) throw error;
        const { data: signed } = await supabase.storage.from("knowledge-files").createSignedUrl(path, 60 * 60 * 24 * 365);
        uploaded.push({ name: f.name, url: signed?.signedUrl ?? path });
      }
      const payload = {
        lead_id: lead.id,
        client: lead.full_name,
        company: lead.company,
        description: description.trim(),
        challenge: challenge.trim(),
        solution: solution.trim(),
        results: results.trim(),
        attachments: uploaded,
      };
      await add({
        data: {
          kind: "case_study",
          title: `${projectName.trim()} · ${lead.full_name}`,
          url: uploaded[0]?.url,
          content: JSON.stringify(payload),
        },
      });
      toast.success("Case study saved");
      setLead(null); setProjectName(""); setDescription("");
      setChallenge(""); setSolution(""); setResults(""); setFiles([]);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Client">
        <LeadCombobox value={lead} onChange={setLead} />
      </Field>
      {lead && <LeadPreview lead={lead} />}

      <Field label="Project name">
        <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="h-9 rounded-lg" placeholder="e.g. Acme onboarding overhaul" />
      </Field>
      <Field label="Short description" optional>
        <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-lg" placeholder="One or two sentences summarizing the project" />
      </Field>
      <Field label="Challenge">
        <Textarea rows={3} value={challenge} onChange={(e) => setChallenge(e.target.value)} className="rounded-lg" placeholder="What problem did the client face?" />
      </Field>
      <Field label="Solution">
        <Textarea rows={3} value={solution} onChange={(e) => setSolution(e.target.value)} className="rounded-lg" placeholder="What did you build or do?" />
      </Field>
      <Field label="Results">
        <Textarea rows={3} value={results} onChange={(e) => setResults(e.target.value)} className="rounded-lg" placeholder="Metrics, outcomes, wins…" />
      </Field>

      <Field label="Attachments" optional>
        <label className="flex items-center gap-2 rounded-lg border border-dashed border-border/70 px-3 py-2.5 text-[12px] text-muted-foreground cursor-pointer hover:border-foreground/30">
          <Upload className="h-3.5 w-3.5" />
          <span>{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} attached` : "Add images, PDFs, or supporting files"}</span>
          <input type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
        </label>
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {files.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]">
                {f.name}
                <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </Field>

      <SubmitButton onClick={submit} disabled={!lead || !projectName.trim() || uploading} loading={uploading}>
        <Award className="mr-1.5 h-3.5 w-3.5" /> Add case study
      </SubmitButton>
    </div>
  );
}

/* ---------------- Shared bits ---------------- */

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] flex items-center gap-1.5">
        {label}
        {optional && <span className="text-[10.5px] text-muted-foreground font-normal">optional</span>}
      </Label>
      {children}
    </div>
  );
}

function SubmitButton({ children, onClick, disabled, loading }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="h-9 w-full rounded-lg bg-foreground text-background hover:bg-foreground/90"
    >
      {loading ? "Working…" : children}
    </Button>
  );
}

function LeadCombobox({ value, onChange }: { value: Lead | null; onChange: (l: Lead | null) => void }) {
  const [open, setOpen] = useState(false);
  const { data: leads = [] } = useQuery({
    queryKey: ["leads-combobox"],
    queryFn: async () => {
      const { data } = await supabase.from("leads")
        .select("id, full_name, company, avatar_url, linkedin_url")
        .order("full_name");
      return (data ?? []) as Lead[];
    },
  });

  const sorted = useMemo(() => leads, [leads]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-[12.5px] hover:border-foreground/30"
        >
          {value ? (
            <span className="flex items-center gap-2 min-w-0">
              <Avatar className="h-5 w-5"><AvatarImage src={value.avatar_url ?? undefined} /><AvatarFallback className="text-[9px]">{initials(value.full_name)}</AvatarFallback></Avatar>
              <span className="truncate">{value.full_name}{value.company ? ` · ${value.company}` : ""}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Select a client…</span>
          )}
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search clients…" className="h-9" />
          <CommandList>
            <CommandEmpty>No clients found.</CommandEmpty>
            <CommandGroup>
              {sorted.map((l) => (
                <CommandItem
                  key={l.id}
                  value={`${l.full_name} ${l.company ?? ""}`}
                  onSelect={() => { onChange(l); setOpen(false); }}
                  className="gap-2"
                >
                  <Avatar className="h-6 w-6"><AvatarImage src={l.avatar_url ?? undefined} /><AvatarFallback className="text-[10px]">{initials(l.full_name)}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px]">{l.full_name}</div>
                    {l.company && <div className="truncate text-[10.5px] text-muted-foreground">{l.company}</div>}
                  </div>
                  {value?.id === l.id && <Check className="h-3.5 w-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function LeadPreview({ lead }: { lead: Lead }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
      <Avatar className="h-10 w-10">
        <AvatarImage src={lead.avatar_url ?? undefined} />
        <AvatarFallback>{initials(lead.full_name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{lead.full_name}</div>
        <div className="truncate text-[11.5px] text-muted-foreground">{lead.company ?? "—"}</div>
      </div>
      {lead.linkedin_url && (
        <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground">
          LinkedIn <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
