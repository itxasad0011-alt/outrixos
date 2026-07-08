import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  listLeads, leadKpis, leadFacets, updateLead, bulkLeadAction,
  addLeadsToCampaigns, importLeadsUnified, importLinkedinUrls,
  generateLeadAiSummary, deleteLead, leadTimeline,
} from "@/lib/leads.functions";
import { discoverLeads, runOutreach } from "@/lib/ai/agent.functions";
import { listCampaigns } from "@/lib/campaigns.functions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search, Plus, Filter, Download, Upload, RefreshCw, MoreHorizontal, Sparkles, Users,
  MessageSquare, Calendar, Trophy, LayoutGrid, Rows3, Trash2, Archive, Tag as TagIcon,
  ExternalLink, Building2, Globe, MapPin, Mail, Loader2, X, Send, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/leads")({ component: LeadsPage });

const STATUSES = ["new", "qualified", "contacted", "connected", "conversation", "interested", "meeting", "warm", "won", "not_interested", "archived"];
const SOURCES = [
  { v: "apollo", label: "Apollo" },
  { v: "linkedin", label: "LinkedIn" },
  { v: "csv", label: "CSV" },
  { v: "manual", label: "Manual" },
  { v: "crm", label: "CRM" },
  { v: "ai_discovery", label: "AI Discovery" },
  { v: "manual_import", label: "Import" },
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function scoreLabel(n: number | null) {
  const s = n ?? 0;
  if (s >= 90) return { label: "High Match", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (s >= 75) return { label: "Good Match", cls: "bg-neutral-100 text-neutral-800 border-neutral-200" };
  if (s >= 60) return { label: "Average Match", cls: "bg-amber-50 text-amber-800 border-amber-200" };
  return { label: "Low Priority", cls: "bg-muted text-muted-foreground border-border/60" };
}
function statusTone(s: string) {
  switch (s) {
    case "qualified": case "interested": case "won": case "warm":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "conversation": case "meeting": case "contacted": case "connected":
      return "bg-neutral-100 text-neutral-800 border-neutral-200";
    case "not_interested": case "archived":
      return "bg-muted text-muted-foreground border-border/60";
    default:
      return "bg-white text-neutral-700 border-neutral-200";
  }
}
function sourceBadge(src: string) {
  const found = SOURCES.find((s) => s.v === src);
  return found?.label ?? src;
}

function useViewPref() {
  const [view, setView] = useState<"card" | "table">(() => {
    if (typeof window === "undefined") return "card";
    return (localStorage.getItem("leads.view") as any) ?? "card";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("leads.view", view);
  }, [view]);
  return [view, setView] as const;
}

function LeadsPage() {
  const qc = useQueryClient();
  const [view, setView] = useViewPref();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(t); }, [search]);

  const [filters, setFilters] = useState<{
    sources: string[]; statuses: string[]; industries: string[]; countries: string[];
    tags: string[]; min_score?: number;
  }>({ sources: [], statuses: [], industries: [], countries: [], tags: [] });
  const [sort, setSort] = useState<"newest" | "oldest" | "score" | "activity" | "name">("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openLead, setOpenLead] = useState<any | null>(null);
  const [dialog, setDialog] = useState<null | "import" | "discover" | "apollo" | "addCampaign">(null);

  const list = useServerFn(listLeads);
  const kpis = useServerFn(leadKpis);
  const facets = useServerFn(leadFacets);

  const kpiQ = useQuery({ queryKey: ["leads.kpis"], queryFn: () => kpis({}) });
  const facetQ = useQuery({ queryKey: ["leads.facets"], queryFn: () => facets({}) });

  const listQ = useQuery({
    queryKey: ["leads.list", debounced, filters, sort, page, pageSize],
    queryFn: () => list({ data: { search: debounced, ...filters, sort, page, page_size: pageSize } }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["leads.list"] });
    qc.invalidateQueries({ queryKey: ["leads.kpis"] });
    qc.invalidateQueries({ queryKey: ["leads.facets"] });
  };

  const rows = listQ.data?.rows ?? [];
  const total = listQ.data?.total ?? 0;
  const allSelected = rows.length > 0 && rows.every((r: any) => selected.has(r.id));

  function toggleAll() {
    if (allSelected) {
      const next = new Set(selected);
      rows.forEach((r: any) => next.delete(r.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      rows.forEach((r: any) => next.add(r.id));
      setSelected(next);
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  }

  function exportCsv() {
    const cols = ["full_name", "role", "job_title", "company", "industry", "country", "location", "company_size", "email", "linkedin_url", "source", "status", "icp_score", "tags", "created_at"];
    const header = cols.join(",");
    const escape = (v: any) => {
      if (v == null) return "";
      const s = Array.isArray(v) ? v.join("|") : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = rows.map((r: any) => cols.map((c) => escape(r[c])).join(",")).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const activeFilterCount =
    filters.sources.length + filters.statuses.length + filters.industries.length +
    filters.countries.length + filters.tags.length + (filters.min_score ? 1 : 0);

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Manage every lead in one place. Discover, import, organize, qualify and track every prospect from a single workspace."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-9 rounded-lg" onClick={refresh}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="h-9 rounded-lg" onClick={exportCsv}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 rounded-lg">
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Import <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onSelect={() => setDialog("import")}>Import CSV / manual / LinkedIn</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDialog("apollo")}>Discover from Apollo</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDialog("discover")}>AI Discover leads</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" className="h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]" onClick={() => setDialog("import")}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add lead
            </Button>
          </div>
        }
      />

      <div className="px-8 py-6 space-y-5">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Total leads" value={kpiQ.data?.total ?? 0} icon={<Users className="h-3.5 w-3.5" />} />
          <Kpi label="Qualified" value={kpiQ.data?.qualified ?? 0} icon={<Sparkles className="h-3.5 w-3.5" />} />
          <Kpi label="Conversations" value={kpiQ.data?.conversations ?? 0} icon={<MessageSquare className="h-3.5 w-3.5" />} />
          <Kpi label="Interested" value={kpiQ.data?.interested ?? 0} icon={<Sparkles className="h-3.5 w-3.5" />} />
          <Kpi label="Meetings" value={kpiQ.data?.meetings ?? 0} icon={<Calendar className="h-3.5 w-3.5" />} />
          <Kpi label="Won clients" value={kpiQ.data?.won ?? 0} icon={<Trophy className="h-3.5 w-3.5" />} />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, company, role, email, LinkedIn…"
              className="h-9 rounded-xl border-border/70 bg-white pl-9 text-[13px]"
            />
          </div>

          <FilterPopover
            filters={filters}
            setFilters={(f: any) => { setFilters(f); setPage(1); }}
            facets={facetQ.data}
            activeCount={activeFilterCount}
          />

          <Select value={sort} onValueChange={(v: any) => setSort(v)}>
            <SelectTrigger className="h-9 w-[160px] rounded-xl bg-white text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="score">Highest score</SelectItem>
              <SelectItem value="activity">Recent activity</SelectItem>
              <SelectItem value="name">Name A→Z</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-1 rounded-xl border border-border/70 bg-white p-0.5">
            <button
              onClick={() => setView("card")}
              className={`grid h-8 w-8 place-items-center rounded-lg transition ${view === "card" ? "bg-neutral-900 text-white" : "text-muted-foreground hover:text-foreground"}`}
              title="Card view"
            ><LayoutGrid className="h-3.5 w-3.5" /></button>
            <button
              onClick={() => setView("table")}
              className={`grid h-8 w-8 place-items-center rounded-lg transition ${view === "table" ? "bg-neutral-900 text-white" : "text-muted-foreground hover:text-foreground"}`}
              title="Table view"
            ><Rows3 className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <BulkBar
            count={selected.size}
            onClear={() => setSelected(new Set())}
            onDone={() => { setSelected(new Set()); refresh(); }}
            ids={[...selected]}
            openAddCampaign={() => setDialog("addCampaign")}
          />
        )}

        {/* Content */}
        {listQ.isLoading ? (
          <div className="grid place-items-center py-24"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <EmptyState onImport={() => setDialog("import")} onDiscover={() => setDialog("discover")} />
        ) : view === "card" ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((l: any) => (
              <LeadCard
                key={l.id}
                lead={l}
                selected={selected.has(l.id)}
                onToggle={() => toggleOne(l.id)}
                onOpen={() => setOpenLead(l)}
              />
            ))}
          </div>
        ) : (
          <LeadsTable rows={rows} selected={selected} allSelected={allSelected} toggleAll={toggleAll} toggleOne={toggleOne} onOpen={setOpenLead} />
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <div>
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[100px] rounded-lg bg-white text-[12px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                  <SelectItem value="250">250 / page</SelectItem>
                  <SelectItem value="500">500 / page</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="h-8 rounded-lg" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" className="h-8 rounded-lg" disabled={page * pageSize >= total} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <LeadDrawer lead={openLead} onClose={() => setOpenLead(null)} onChanged={refresh} />

      <ImportDialog open={dialog === "import"} onClose={() => setDialog(null)} onDone={refresh} />
      <DiscoverDialog open={dialog === "discover"} onClose={() => setDialog(null)} onDone={refresh} kind="ai" />
      <DiscoverDialog open={dialog === "apollo"} onClose={() => setDialog(null)} onDone={refresh} kind="apollo" />
      <AddToCampaignDialog
        open={dialog === "addCampaign"}
        onClose={() => setDialog(null)}
        leadIds={[...selected]}
        onDone={() => { setDialog(null); setSelected(new Set()); refresh(); }}
      />
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-border/70 bg-white">
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">{icon}{label}</div>
        <div className="mt-1 text-[22px] font-semibold tracking-tight">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onImport, onDiscover }: { onImport: () => void; onDiscover: () => void }) {
  return (
    <Card className="rounded-2xl border-dashed border-border/70 bg-white">
      <CardContent className="grid place-items-center gap-3 py-16 text-center">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-900 text-white"><Users className="h-5 w-5" /></div>
        <div>
          <div className="text-[15px] font-semibold tracking-tight">No leads yet</div>
          <div className="mt-1 text-[12.5px] text-muted-foreground">Import a CSV, paste LinkedIn URLs, add manually, or let AI discover matches.</div>
        </div>
        <div className="mt-2 flex gap-2">
          <Button variant="outline" size="sm" className="rounded-lg" onClick={onImport}><Upload className="mr-1.5 h-3.5 w-3.5" /> Import</Button>
          <Button size="sm" className="rounded-lg bg-[#0A0A0A] hover:bg-[#262626]" onClick={onDiscover}><Sparkles className="mr-1.5 h-3.5 w-3.5" /> AI Discover</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterPopover({ filters, setFilters, facets, activeCount }: any) {
  const toggle = (key: string, v: string) => {
    const cur = new Set<string>(filters[key]);
    if (cur.has(v)) cur.delete(v); else cur.add(v);
    setFilters({ ...filters, [key]: [...cur] });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 rounded-xl bg-white">
          <Filter className="mr-1.5 h-3.5 w-3.5" /> Filters
          {activeCount > 0 && <Badge className="ml-1.5 h-4 rounded-full bg-neutral-900 px-1.5 text-[10px] text-white">{activeCount}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[420px] rounded-2xl p-0">
        <div className="max-h-[70vh] overflow-y-auto p-4">
          <FilterGroup title="Lead source" options={SOURCES.map((s) => ({ v: s.v, l: s.label }))} value={filters.sources} onToggle={(v) => toggle("sources", v)} />
          <FilterGroup title="Status" options={STATUSES.map((s) => ({ v: s, l: s.replace("_", " ") }))} value={filters.statuses} onToggle={(v) => toggle("statuses", v)} />
          {facets?.industries?.length > 0 && (
            <FilterGroup title="Industry" options={facets.industries.map((v: string) => ({ v, l: v }))} value={filters.industries} onToggle={(v) => toggle("industries", v)} />
          )}
          {facets?.countries?.length > 0 && (
            <FilterGroup title="Country" options={facets.countries.map((v: string) => ({ v, l: v }))} value={filters.countries} onToggle={(v) => toggle("countries", v)} />
          )}
          {facets?.tags?.length > 0 && (
            <FilterGroup title="Tags" options={facets.tags.map((v: string) => ({ v, l: v }))} value={filters.tags} onToggle={(v) => toggle("tags", v)} />
          )}
          <div className="mb-2">
            <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Minimum ICP score</div>
            <div className="flex flex-wrap gap-1.5">
              {[0, 60, 75, 90].map((n) => (
                <button key={n} onClick={() => setFilters({ ...filters, min_score: n === 0 ? undefined : n })}
                  className={`h-7 rounded-lg border px-2.5 text-[12px] ${((filters.min_score ?? 0) === n) ? "border-neutral-900 bg-neutral-900 text-white" : "border-border/70 bg-white"}`}>
                  {n === 0 ? "Any" : `${n}+`}
                </button>
              ))}
            </div>
          </div>
          <Separator className="my-3" />
          <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setFilters({ sources: [], statuses: [], industries: [], countries: [], tags: [], min_score: undefined })}>
            Clear all
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FilterGroup({ title, options, value, onToggle }: any) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o: any) => {
          const on = value.includes(o.v);
          return (
            <button key={o.v} onClick={() => onToggle(o.v)}
              className={`h-7 rounded-lg border px-2.5 text-[12px] capitalize transition ${on ? "border-neutral-900 bg-neutral-900 text-white" : "border-border/70 bg-white hover:bg-neutral-50"}`}>
              {o.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BulkBar({ count, onClear, onDone, ids, openAddCampaign }: any) {
  const bulk = useServerFn(bulkLeadAction);
  const m = useMutation({
    mutationFn: (payload: any) => bulk({ data: { ids, ...payload } }),
    onSuccess: () => { toast.success("Updated"); onDone(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-neutral-900 px-3 py-2 text-white">
      <div className="text-[13px] font-medium">{count} selected</div>
      <Separator orientation="vertical" className="mx-1 h-5 bg-white/20" />
      <Button size="sm" variant="ghost" className="h-8 rounded-lg text-white hover:bg-white/10" onClick={openAddCampaign}>
        <Send className="mr-1.5 h-3.5 w-3.5" /> Add to campaign
      </Button>
      <Select onValueChange={(v) => m.mutate({ action: "set_status", status: v })}>
        <SelectTrigger className="h-8 w-[150px] rounded-lg border-white/20 bg-white/10 text-[12px] text-white hover:bg-white/15">
          <SelectValue placeholder="Set status" />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button size="sm" variant="ghost" className="h-8 rounded-lg text-white hover:bg-white/10" onClick={() => m.mutate({ action: "archive" })}>
        <Archive className="mr-1.5 h-3.5 w-3.5" /> Archive
      </Button>
      <Button size="sm" variant="ghost" className="h-8 rounded-lg text-red-200 hover:bg-red-500/20 hover:text-red-100" onClick={() => m.mutate({ action: "delete" })}>
        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
      </Button>
      <button onClick={onClear} className="ml-auto text-[12px] text-white/70 hover:text-white"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function LeadCard({ lead, selected, onToggle, onOpen }: any) {
  const sc = scoreLabel(lead.icp_score);
  return (
    <div className={`group relative rounded-2xl border bg-white transition ${selected ? "border-neutral-900 shadow-sm" : "border-border/70 hover:border-foreground/20 hover:shadow-sm"}`}>
      <div className="absolute left-3 top-3 z-10">
        <Checkbox checked={selected} onCheckedChange={onToggle} onClick={(e) => e.stopPropagation()} />
      </div>
      <button onClick={onOpen} className="block w-full p-4 pl-10 text-left">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={lead.avatar_url ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-neutral-900 to-neutral-700 text-[11px] text-white">{initials(lead.full_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate text-[13.5px] font-semibold">{lead.full_name}</div>
              <Badge className={`h-4 rounded-full border px-1.5 text-[10px] ${sc.cls}`}>{lead.icp_score ?? 0}</Badge>
            </div>
            <div className="truncate text-[11.5px] text-muted-foreground">{lead.role ?? lead.job_title ?? "—"}{lead.company ? ` · ${lead.company}` : ""}</div>
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
              {[lead.industry, lead.country].filter(Boolean).join(" · ") || "—"}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={`h-5 rounded-md border px-1.5 text-[10.5px] capitalize ${statusTone(lead.status)}`}>{lead.status.replace("_", " ")}</Badge>
          <Badge variant="outline" className="h-5 rounded-md border-border/60 bg-white px-1.5 text-[10.5px]">{sourceBadge(lead.source)}</Badge>
          {lead.tags?.slice(0, 2).map((t: string) => (
            <Badge key={t} variant="secondary" className="h-5 rounded-md px-1.5 text-[10.5px]">{t}</Badge>
          ))}
          <span className="ml-auto text-[10.5px] text-muted-foreground">{timeAgo(lead.last_activity_at ?? lead.created_at)}</span>
        </div>
      </button>
    </div>
  );
}

function LeadsTable({ rows, selected, allSelected, toggleAll, toggleOne, onOpen }: any) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-neutral-50/60 hover:bg-neutral-50/60">
            <TableHead className="w-8"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Name</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Company</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Role</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Industry</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Country</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Score</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Source</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</TableHead>
            <TableHead className="text-[11px] uppercase tracking-wide text-muted-foreground">Last activity</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((l: any) => (
            <TableRow key={l.id} className="cursor-pointer" onClick={() => onOpen(l)}>
              <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selected.has(l.id)} onCheckedChange={() => toggleOne(l.id)} /></TableCell>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={l.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-neutral-900 text-[10px] text-white">{initials(l.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="text-[13px] font-medium">{l.full_name}</div>
                </div>
              </TableCell>
              <TableCell className="text-[12.5px]">{l.company ?? "—"}</TableCell>
              <TableCell className="text-[12.5px] text-muted-foreground">{l.role ?? l.job_title ?? "—"}</TableCell>
              <TableCell className="text-[12.5px] text-muted-foreground">{l.industry ?? "—"}</TableCell>
              <TableCell className="text-[12.5px] text-muted-foreground">{l.country ?? "—"}</TableCell>
              <TableCell><Badge className={`rounded-full border ${scoreLabel(l.icp_score).cls}`}>{l.icp_score ?? 0}</Badge></TableCell>
              <TableCell><Badge variant="outline" className="rounded-md text-[10.5px]">{sourceBadge(l.source)}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={`rounded-md text-[10.5px] capitalize ${statusTone(l.status)}`}>{l.status.replace("_", " ")}</Badge></TableCell>
              <TableCell className="text-[11.5px] text-muted-foreground">{timeAgo(l.last_activity_at ?? l.created_at)}</TableCell>
              <TableCell><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ================= DRAWER ================= */

function LeadDrawer({ lead, onClose, onChanged }: { lead: any | null; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const update = useServerFn(updateLead);
  const del = useServerFn(deleteLead);
  const gen = useServerFn(generateLeadAiSummary);
  const outreach = useServerFn(runOutreach);
  const timelineFn = useServerFn(leadTimeline);

  const [tab, setTab] = useState("overview");
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    setTab("overview");
    setNotes(lead?.notes ?? "");
    setTags(lead?.tags ?? []);
  }, [lead?.id]);

  const timelineQ = useQuery({
    queryKey: ["lead.timeline", lead?.id],
    queryFn: () => timelineFn({ data: { id: lead!.id } }),
    enabled: !!lead,
  });

  const saveNotes = useMutation({
    mutationFn: () => update({ data: { id: lead.id, patch: { notes } } }),
    onSuccess: () => { toast.success("Notes saved"); onChanged(); },
  });
  const saveTags = useMutation({
    mutationFn: (next: string[]) => update({ data: { id: lead.id, patch: { tags: next } } }),
    onSuccess: () => { onChanged(); },
  });
  const setStatus = useMutation({
    mutationFn: (status: string) => update({ data: { id: lead.id, patch: { status } } }),
    onSuccess: (_, s) => { toast.success(`Marked ${s}`); onChanged(); },
  });
  const delM = useMutation({
    mutationFn: () => del({ data: { id: lead.id } }),
    onSuccess: () => { toast.success("Deleted"); onChanged(); onClose(); },
  });
  const genM = useMutation({
    mutationFn: () => gen({ data: { id: lead.id } }),
    onSuccess: () => { toast.success("Summary generated"); qc.invalidateQueries({ queryKey: ["leads.list"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const outM = useMutation({
    mutationFn: () => outreach({ data: { lead_id: lead.id } }),
    onSuccess: () => { toast.success("Outreach started"); onChanged(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    const next = [...new Set([...tags, t])];
    setTags(next); setTagInput("");
    saveTags.mutate(next);
  }
  function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    saveTags.mutate(next);
  }

  if (!lead) return null;
  const sc = scoreLabel(lead.icp_score);

  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-[600px]">
        <SheetHeader className="border-b border-border/60 px-6 pb-4 pt-6">
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14">
              <AvatarImage src={lead.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-neutral-900 to-neutral-700 text-[13px] text-white">{initials(lead.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-[17px]">{lead.full_name}</SheetTitle>
              <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{lead.role ?? lead.job_title ?? "—"}{lead.company ? ` · ${lead.company}` : ""}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge className={`rounded-full border text-[10.5px] ${sc.cls}`}>{lead.icp_score ?? 0} · {sc.label}</Badge>
                <Badge variant="outline" className={`rounded-md text-[10.5px] capitalize ${statusTone(lead.status)}`}>{lead.status.replace("_", " ")}</Badge>
                <Badge variant="outline" className="rounded-md text-[10.5px]">{sourceBadge(lead.source)}</Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex flex-1 flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3 h-9 justify-start gap-1 bg-transparent p-0">
            {["overview", "timeline", "notes"].map((t) => (
              <TabsTrigger key={t} value={t} className="h-8 rounded-lg px-3 text-[12.5px] capitalize data-[state=active]:bg-neutral-900 data-[state=active]:text-white">{t}</TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="overview" className="m-0 space-y-4 p-6">
              <Section title="LinkedIn & contact">
                <div className="grid grid-cols-2 gap-2 text-[12.5px]">
                  <Field icon={<Building2 className="h-3 w-3" />} label="Company" value={lead.company} />
                  <Field icon={<Globe className="h-3 w-3" />} label="Website" value={lead.company_website} link />
                  <Field icon={<Mail className="h-3 w-3" />} label="Email" value={lead.email} />
                  <Field icon={<MapPin className="h-3 w-3" />} label="Location" value={lead.location ?? lead.country} />
                  <Field label="Industry" value={lead.industry} />
                  <Field label="Company size" value={lead.company_size} />
                </div>
                {lead.linkedin_url && (
                  <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[12px] text-foreground hover:underline">
                    View LinkedIn <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </Section>

              <Section title="AI summary" action={
                <Button variant="ghost" size="sm" className="h-7 rounded-lg text-[11.5px]" onClick={() => genM.mutate()} disabled={genM.isPending}>
                  {genM.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />} Generate
                </Button>
              }>
                <div className="whitespace-pre-line text-[12.5px] leading-relaxed">
                  {lead.ai_summary ?? <span className="text-muted-foreground">Click Generate to create an AI-crafted summary of this lead.</span>}
                </div>
              </Section>

              <Section title="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <button key={t} onClick={() => removeTag(t)} className="group inline-flex items-center gap-1 rounded-full border border-border/70 bg-white px-2 py-0.5 text-[11px]">
                      {t}<X className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100" />
                    </button>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="Add tag…"
                    className="h-6 rounded-full border border-dashed border-border/70 bg-transparent px-2 text-[11px] outline-none placeholder:text-muted-foreground focus:border-foreground"
                  />
                </div>
              </Section>

              <Section title="Campaigns">
                <div className="flex flex-wrap gap-1.5">
                  {timelineQ.data?.campaigns.length ? timelineQ.data.campaigns.map((cl: any) => (
                    <Link key={cl.id} to="/outreach/$campaignId" params={{ campaignId: cl.campaign?.id }}
                      className="rounded-full border border-border/70 bg-white px-2.5 py-0.5 text-[11px] hover:bg-neutral-50">
                      {cl.campaign?.name ?? "Campaign"} · <span className="text-muted-foreground capitalize">{cl.status}</span>
                    </Link>
                  )) : <span className="text-[12px] text-muted-foreground">Not in any campaign yet.</span>}
                </div>
              </Section>
            </TabsContent>

            <TabsContent value="timeline" className="m-0 space-y-2 p-6">
              {(timelineQ.data?.activity ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-[12px] text-muted-foreground">No activity yet.</div>
              ) : (
                <div className="space-y-3">
                  {timelineQ.data!.activity.map((a: any) => (
                    <div key={a.id} className="flex gap-3">
                      <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-900" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-medium">{a.title}</div>
                        {a.detail && <div className="text-[11.5px] text-muted-foreground">{a.detail}</div>}
                        <div className="text-[10.5px] text-muted-foreground/70">{new Date(a.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="m-0 p-6">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Private notes about this lead…" className="min-h-[220px] rounded-xl" />
              <div className="mt-2 flex justify-end">
                <Button size="sm" className="rounded-lg bg-[#0A0A0A] hover:bg-[#262626]" onClick={() => saveNotes.mutate()} disabled={saveNotes.isPending}>
                  {saveNotes.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null} Save notes
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex items-center gap-2 border-t border-border/60 p-4">
          <Button size="sm" className="h-9 flex-1 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]" onClick={() => outM.mutate()} disabled={outM.isPending}>
            <Send className="mr-1.5 h-3.5 w-3.5" /> Start outreach
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 rounded-lg">Mark as <ChevronDown className="ml-1 h-3 w-3" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              {["qualified", "contacted", "interested", "meeting", "won", "not_interested"].map((s) => (
                <DropdownMenuItem key={s} className="capitalize" onSelect={() => setStatus.mutate(s)}>{s.replace("_", " ")}</DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => delM.mutate()}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, action, children }: any) {
  return (
    <div className="rounded-xl border border-border/60 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}
function Field({ icon, label, value, link }: any) {
  if (!value) return <div><div className="text-[10.5px] uppercase tracking-wide text-muted-foreground/70">{label}</div><div className="text-muted-foreground">—</div></div>;
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground/70">{label}</div>
      <div className="flex items-center gap-1 truncate">
        {icon}
        {link ? <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer" className="truncate hover:underline">{value}</a> : <span className="truncate">{value}</span>}
      </div>
    </div>
  );
}

/* ================= IMPORT DIALOG ================= */

function ImportDialog({ open, onClose, onDone }: any) {
  const [tab, setTab] = useState("csv");
  const importFn = useServerFn(importLeadsUnified);
  const urlFn = useServerFn(importLinkedinUrls);

  // CSV
  const fileRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvName, setCsvName] = useState("");

  function parseCsv(text: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return [];
    const parseLine = (line: string) => {
      const out: string[] = []; let cur = ""; let q = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
        else { if (c === ",") { out.push(cur); cur = ""; } else if (c === '"') q = true; else cur += c; }
      }
      out.push(cur);
      return out;
    };
    const header = parseLine(lines[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const map: Record<string, string> = {
      name: "full_name", full_name: "full_name",
      company: "company", organization: "company",
      role: "role", title: "job_title", job_title: "job_title", position: "job_title",
      industry: "industry", country: "country", location: "location",
      email: "email", linkedin: "linkedin_url", linkedin_url: "linkedin_url",
      website: "company_website", headline: "headline",
      company_size: "company_size", size: "company_size",
    };
    return lines.slice(1).map((line) => {
      const cells = parseLine(line);
      const row: any = {};
      header.forEach((h, i) => {
        const key = map[h] ?? h;
        const val = (cells[i] ?? "").trim();
        if (val) row[key] = val;
      });
      if (!row.role && row.job_title) row.role = row.job_title;
      return row;
    }).filter((r) => r.full_name);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setCsvName(f.name);
    const text = await f.text();
    setCsvRows(parseCsv(text));
  }

  // LinkedIn URLs
  const [urlsText, setUrlsText] = useState("");
  const urls = useMemo(() => urlsText.split(/[\s,]+/).map((u) => u.trim()).filter((u) => /linkedin\.com\/in\//.test(u)), [urlsText]);

  // Manual
  const [manual, setManual] = useState({ full_name: "", role: "", company: "", industry: "", country: "", email: "", linkedin_url: "" });

  const runImport = useMutation({
    mutationFn: async () => {
      if (tab === "csv") {
        if (!csvRows.length) throw new Error("No CSV rows");
        return importFn({ data: { source: "csv", rows: csvRows } });
      }
      if (tab === "linkedin") {
        if (!urls.length) throw new Error("Paste LinkedIn URLs");
        return urlFn({ data: { urls } });
      }
      if (!manual.full_name.trim()) throw new Error("Full name required");
      return importFn({ data: { source: "manual", rows: [manual] } });
    },
    onSuccess: (r: any) => {
      toast.success(`Imported ${r.inserted}${r.updated ? ` · updated ${r.updated}` : ""}`);
      onDone(); onClose();
      setCsvRows([]); setCsvName(""); setUrlsText("");
      setManual({ full_name: "", role: "", company: "", industry: "", country: "", email: "", linkedin_url: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import leads</DialogTitle>
          <DialogDescription>Duplicates matched by LinkedIn URL, email, or Name + Company are updated instead of duplicated.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-9 rounded-lg bg-neutral-100">
            <TabsTrigger value="csv" className="rounded-md text-[12.5px]">CSV</TabsTrigger>
            <TabsTrigger value="linkedin" className="rounded-md text-[12.5px]">LinkedIn URLs</TabsTrigger>
            <TabsTrigger value="manual" className="rounded-md text-[12.5px]">Manual</TabsTrigger>
          </TabsList>
          <TabsContent value="csv" className="pt-4">
            <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFile} />
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1.5 h-3.5 w-3.5" /> {csvName || "Choose CSV file"}
              </Button>
              <div className="mt-2 text-[11.5px] text-muted-foreground">Headers: full_name, company, role, industry, country, email, linkedin_url…</div>
              {csvRows.length > 0 && <div className="mt-3 text-[12px]">{csvRows.length} rows ready</div>}
            </div>
          </TabsContent>
          <TabsContent value="linkedin" className="pt-4">
            <Textarea value={urlsText} onChange={(e) => setUrlsText(e.target.value)} placeholder="Paste LinkedIn profile URLs, one per line…" className="min-h-[160px] rounded-xl font-mono text-[12px]" />
            <div className="mt-2 text-[11.5px] text-muted-foreground">{urls.length} valid URL{urls.length === 1 ? "" : "s"} detected.</div>
          </TabsContent>
          <TabsContent value="manual" className="grid grid-cols-2 gap-3 pt-4">
            {[
              ["full_name", "Full name *"], ["role", "Role"], ["company", "Company"], ["industry", "Industry"],
              ["country", "Country"], ["email", "Email"], ["linkedin_url", "LinkedIn URL"],
            ].map(([k, l]) => (
              <div key={k} className="space-y-1.5">
                <Label className="text-[12px]">{l}</Label>
                <Input value={(manual as any)[k]} onChange={(e) => setManual({ ...manual, [k]: e.target.value })} className="h-9 rounded-lg" />
              </div>
            ))}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="ghost" className="rounded-lg" onClick={onClose}>Cancel</Button>
          <Button className="rounded-lg bg-[#0A0A0A] hover:bg-[#262626]" onClick={() => runImport.mutate()} disabled={runImport.isPending}>
            {runImport.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null} Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================= DISCOVER DIALOG ================= */

function DiscoverDialog({ open, onClose, onDone, kind }: any) {
  const discover = useServerFn(discoverLeads);
  const [count, setCount] = useState(8);
  const [filters, setFilters] = useState({ keywords: "", industry: "", country: "", job_title: "", company_size: "" });
  const m = useMutation({
    mutationFn: () => discover({ data: { count } }),
    onSuccess: (r: any) => { toast.success(`Discovered ${r.count} leads`); onDone(); onClose(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{kind === "apollo" ? "Discover from Apollo" : "AI discover leads"}</DialogTitle>
          <DialogDescription>{kind === "apollo" ? "We'll fetch matching prospects and add them to your workspace." : "Let AI generate ICP-matched leads using your Sales Brain."}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {(["keywords", "industry", "country", "job_title", "company_size"] as const).map((k) => (
            <div key={k} className="space-y-1.5">
              <Label className="text-[12px] capitalize">{k.replace("_", " ")}</Label>
              <Input value={filters[k]} onChange={(e) => setFilters({ ...filters, [k]: e.target.value })} className="h-9 rounded-lg" />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Count</Label>
            <Input type="number" min={1} max={15} value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-9 rounded-lg" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" className="rounded-lg" onClick={onClose}>Cancel</Button>
          <Button className="rounded-lg bg-[#0A0A0A] hover:bg-[#262626]" onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />} Discover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================= ADD TO CAMPAIGN DIALOG ================= */

function AddToCampaignDialog({ open, onClose, leadIds, onDone }: any) {
  const listC = useServerFn(listCampaigns);
  const addFn = useServerFn(addLeadsToCampaigns);
  const { data: campaigns = [] } = useQuery({ queryKey: ["campaigns"], queryFn: () => listC({}), enabled: open });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => { if (open) setSelected(new Set()); }, [open]);

  const m = useMutation({
    mutationFn: () => addFn({ data: { lead_ids: leadIds, campaign_ids: [...selected] } }),
    onSuccess: () => { toast.success("Added to campaigns"); onDone(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add {leadIds.length} lead{leadIds.length === 1 ? "" : "s"} to campaign</DialogTitle>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-1.5 overflow-y-auto">
          {campaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-[12px] text-muted-foreground">
              No campaigns yet. <Link to="/outreach" className="underline">Create one</Link>.
            </div>
          ) : campaigns.map((c: any) => {
            const on = selected.has(c.id);
            return (
              <button key={c.id} onClick={() => {
                const next = new Set(selected);
                if (on) next.delete(c.id); else next.add(c.id);
                setSelected(next);
              }} className={`flex w-full items-center gap-2.5 rounded-xl border p-3 text-left transition ${on ? "border-neutral-900 bg-neutral-50" : "border-border/70 bg-white hover:bg-neutral-50"}`}>
                <Checkbox checked={on} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{c.name}</div>
                  <div className="text-[11.5px] text-muted-foreground capitalize">{c.status} · {c.total_leads} leads</div>
                </div>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" className="rounded-lg" onClick={onClose}>Cancel</Button>
          <Button className="rounded-lg bg-[#0A0A0A] hover:bg-[#262626]" onClick={() => m.mutate()} disabled={m.isPending || selected.size === 0}>
            {m.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null} Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Silence unused import warnings for symbols referenced conditionally.
void supabase;
