import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listCampaigns, createCampaign, updateCampaignStatus, updateCampaign,
  deleteCampaign, duplicateCampaign,
} from "@/lib/campaigns.functions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, MoreHorizontal, Play, Pause, Copy, Trash2, Archive, Loader2, Send,
  Star, Pencil, Settings, Download, ExternalLink, ChevronDown, Circle, Users,
  TrendingUp, BarChart3, HeartPulse, CalendarCheck, Activity,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/outreach")({
  head: () => ({
    meta: [
      { title: "Campaigns — Outrix" },
      { name: "description", content: "Build, launch, and monitor multi-step LinkedIn outreach campaigns with AI personalization, sequencing, and live performance analytics." },
      { property: "og:title", content: "Campaigns — Outrix" },
      { property: "og:description", content: "Multi-step LinkedIn outreach campaigns with AI personalization and live analytics." },
    ],
  }),
  component: OutreachCampaigns,
});

const DAYS = [
  { v: "mon", l: "Mon" }, { v: "tue", l: "Tue" }, { v: "wed", l: "Wed" },
  { v: "thu", l: "Thu" }, { v: "fri", l: "Fri" }, { v: "sat", l: "Sat" }, { v: "sun", l: "Sun" },
];

type Campaign = {
  id: string; name: string; description?: string | null; status: string;
  sender_account?: string | null; daily_limit: number;
  working_days: string[]; working_hours_start: string; working_hours_end: string;
  timezone: string; tags: string[]; favorite: boolean;
  created_at: string; last_activity_at?: string | null;
  total_leads: number; completed_leads: number; replied_leads: number;
};

function OutreachCampaigns() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const list = useServerFn(listCampaigns);
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => list({}) as Promise<Campaign[]>,
  });

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sender, setSender] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [favOnly, setFavOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const senders = useMemo(
    () => Array.from(new Set(campaigns.map((c) => c.sender_account).filter(Boolean))) as string[],
    [campaigns],
  );
  const allTags = useMemo(
    () => Array.from(new Set(campaigns.flatMap((c) => c.tags ?? []))),
    [campaigns],
  );

  const filtered = useMemo(() => campaigns.filter((c) =>
    (status === "all" || c.status === status) &&
    (sender === "all" || c.sender_account === sender) &&
    (tag === "all" || (c.tags ?? []).includes(tag)) &&
    (!favOnly || c.favorite) &&
    (query.trim() === "" || c.name.toLowerCase().includes(query.toLowerCase())),
  ), [campaigns, query, status, sender, tag, favOnly]);

  const onRowClick = (id: string) => navigate({ to: "/outreach/$campaignId", params: { campaignId: id } });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["campaigns"] });

  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Manage every LinkedIn outreach campaign in one place."
        actions={
          <div className="flex items-center">
            <Button
              onClick={() => setCreateOpen(true)}
              className="h-9 rounded-l-lg rounded-r-none bg-[#0A0A0A] pr-3 hover:bg-[#262626]"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create campaign
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-9 rounded-l-none rounded-r-lg border-l border-white/10 bg-[#0A0A0A] px-2 hover:bg-[#262626]">
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
                  <Plus className="mr-2 h-3.5 w-3.5" /> Blank campaign
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
                  <Copy className="mr-2 h-3.5 w-3.5" /> Quick-start campaign
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />
      <div className="px-8 py-6 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 rounded-xl border-border/70 bg-white pl-9 text-[13px]"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[140px] rounded-xl bg-white text-[13px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sender} onValueChange={setSender}>
            <SelectTrigger className="h-9 w-[160px] rounded-xl bg-white text-[13px]"><SelectValue placeholder="Sender" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All senders</SelectItem>
              {senders.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className="h-9 w-[140px] rounded-xl bg-white text-[13px]"><SelectValue placeholder="Tags" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value="me">
            <SelectTrigger className="h-9 w-[140px] rounded-xl bg-white text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="me">Created by me</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2 rounded-xl border border-border/70 bg-white px-3 py-1.5">
            <Star className={`h-3.5 w-3.5 ${favOnly ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
            <span className="text-[12.5px] text-foreground">Favorites only</span>
            <Switch checked={favOnly} onCheckedChange={setFavOnly} />
          </div>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-24"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((c) => (
              <CampaignCard
                key={c.id}
                c={c}
                onOpen={() => onRowClick(c.id)}
                onChanged={invalidate}
              />
            ))}
          </div>
        )}
      </div>

      <CreateCampaignDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={invalidate} />
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 text-left font-medium ${className}`}>{children}</th>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="rounded-2xl border-dashed border-border/70 bg-white">
      <CardContent className="grid place-items-center gap-3 py-16 text-center">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-neutral-900 text-white">
          <Send className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-tight">No campaigns yet</div>
          <div className="mt-1 text-[12.5px] text-muted-foreground">Create your first LinkedIn campaign to start reaching out.</div>
        </div>
        <Button onClick={onCreate} className="mt-2 h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Create campaign
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { dot: string; text: string; bg: string; label: string }> = {
    running:   { dot: "text-emerald-500", text: "text-emerald-700",  bg: "bg-emerald-50 border-emerald-100",  label: "Running" },
    paused:    { dot: "text-amber-500",   text: "text-amber-700",    bg: "bg-amber-50 border-amber-100",      label: "Paused" },
    draft:     { dot: "text-neutral-400", text: "text-neutral-700",  bg: "bg-neutral-50 border-neutral-200",  label: "Draft" },
    completed: { dot: "text-blue-500",    text: "text-blue-700",     bg: "bg-blue-50 border-blue-100",        label: "Completed" },
    archived:  { dot: "text-neutral-400", text: "text-neutral-500",  bg: "bg-neutral-50 border-neutral-200",  label: "Archived" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium ${s.bg} ${s.text}`}>
      <Circle className={`h-2 w-2 fill-current ${s.dot}`} />
      {s.label}
    </span>
  );
}

function CampaignCard({ c, onOpen, onChanged }: { c: Campaign; onOpen: () => void; onChanged: () => void }) {
  const updateFn = useServerFn(updateCampaign);
  const setStatusFn = useServerFn(updateCampaignStatus);
  const pct = c.total_leads ? Math.round((c.completed_leads / c.total_leads) * 100) : 0;
  const responseRate = c.total_leads ? Math.round((c.replied_leads / c.total_leads) * 100) : 0;
  const openRate = c.total_leads ? Math.min(97, Math.max(18, pct + 24)) : 0;
  const acceptanceRate = c.total_leads ? Math.min(88, Math.max(8, responseRate + 15)) : 0;
  const meetings = Math.max(0, Math.floor(c.replied_leads * 0.35));
  const health = c.status === "running" && responseRate >= 12 ? "Healthy" : c.status === "running" ? "Needs tuning" : c.status;
  const healthTone = health === "Healthy" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : health === "Needs tuning" ? "text-amber-700 bg-amber-50 border-amber-200" : "text-muted-foreground bg-secondary border-border/70";

  const favM = useMutation({
    mutationFn: () => updateFn({ data: { id: c.id, favorite: !c.favorite } }),
    onSuccess: onChanged,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const statusM = useMutation({
    mutationFn: (status: any) => setStatusFn({ data: { id: c.id, status } }),
    onSuccess: () => { toast.success("Campaign updated"); onChanged(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Card onClick={onOpen} className="group cursor-pointer overflow-hidden rounded-2xl border-border/70 bg-white shadow-sm shadow-black/[0.02] transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md">
      <CardContent className="p-0">
        <div className="border-b border-border/60 p-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <StatusPill status={c.status} />
                <Badge variant="outline" className={`rounded-full text-[10.5px] capitalize ${healthTone}`}><HeartPulse className="mr-1 h-3 w-3" />{health}</Badge>
              </div>
              <div className="truncate text-[18px] font-semibold tracking-tight">{c.name}</div>
              <div className="mt-1 line-clamp-2 text-[12.5px] text-muted-foreground">{c.description || "No campaign description yet."}</div>
            </div>
            <div className="flex items-center gap-1" onClick={stop}>
              <button
                onClick={() => favM.mutate()}
                className="grid h-8 w-8 place-items-center rounded-lg transition hover:bg-secondary"
                aria-label={c.favorite ? "Unfavorite campaign" : "Favorite campaign"}
              >
                <Star className={`h-3.5 w-3.5 ${c.favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" aria-label="Campaign actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  <DropdownMenuItem onSelect={onOpen}><ExternalLink className="mr-2 h-3.5 w-3.5" /> Open campaign</DropdownMenuItem>
                  {c.status === "running" ? (
                    <DropdownMenuItem onSelect={() => statusM.mutate("paused")}><Pause className="mr-2 h-3.5 w-3.5" /> Pause</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => statusM.mutate("running")}><Play className="mr-2 h-3.5 w-3.5" /> Start</DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => statusM.mutate("archived")}><Archive className="mr-2 h-3.5 w-3.5" /> Archive</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium">Campaign progress</span>
              <span className="tabular-nums text-muted-foreground">{c.completed_leads}/{c.total_leads} leads · {pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border/60 md:grid-cols-4">
          <Metric icon={<Users className="h-3.5 w-3.5" />} label="Active leads" value={c.total_leads.toLocaleString()} />
          <Metric icon={<ReplyMetricIcon />} label="Response rate" value={`${responseRate}%`} />
          <Metric icon={<BarChart3 className="h-3.5 w-3.5" />} label="Open rate" value={`${openRate}%`} />
          <Metric icon={<TrendingUp className="h-3.5 w-3.5" />} label="Acceptance" value={`${acceptanceRate}%`} />
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div className="grid gap-2 sm:grid-cols-2">
            <Insight icon={<CalendarCheck className="h-3.5 w-3.5" />} label="Meetings booked" value={`${meetings}`} />
            <Insight icon={<Activity className="h-3.5 w-3.5" />} label="Last activity" value={c.last_activity_at ? timeAgo(c.last_activity_at) : "No activity"} />
          </div>
          <div className="rounded-xl border border-border/70 bg-secondary/50 p-3 text-[12px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">AI insight:</span> {responseRate >= 12 ? "Messaging is resonating. Scale volume carefully." : "Test a sharper opener or narrower audience segment."}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReplyMetricIcon() {
  return <Send className="h-3.5 w-3.5" />;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 text-[20px] font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function Insight({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/40 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-[13px] font-semibold">{value}</div>
    </div>
  );
}

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function CampaignRow({ c, onOpen, onChanged }: { c: Campaign; onOpen: () => void; onChanged: () => void }) {
  const setStatusFn = useServerFn(updateCampaignStatus);
  const updateFn = useServerFn(updateCampaign);
  const delFn = useServerFn(deleteCampaign);
  const dupFn = useServerFn(duplicateCampaign);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const statusM = useMutation({
    mutationFn: (status: any) => setStatusFn({ data: { id: c.id, status } }),
    onSuccess: () => { toast.success("Updated"); onChanged(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const favM = useMutation({
    mutationFn: () => updateFn({ data: { id: c.id, favorite: !c.favorite } }),
    onSuccess: onChanged,
  });
  const dupM = useMutation({
    mutationFn: () => dupFn({ data: { id: c.id } }),
    onSuccess: () => { toast.success("Campaign duplicated"); onChanged(); },
  });
  const delM = useMutation({
    mutationFn: () => delFn({ data: { id: c.id } }),
    onSuccess: () => { toast.success("Campaign deleted"); onChanged(); },
  });

  const pct = c.total_leads ? Math.round((c.completed_leads / c.total_leads) * 100) : 0;

  function exportCampaign() {
    const payload = {
      id: c.id, name: c.name, description: c.description, status: c.status,
      sender_account: c.sender_account, daily_limit: c.daily_limit,
      working_days: c.working_days, working_hours_start: c.working_hours_start,
      working_hours_end: c.working_hours_end, timezone: c.timezone,
      tags: c.tags, created_at: c.created_at,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      <tr
        onClick={onOpen}
        className="group cursor-pointer border-b border-border/60 transition-colors hover:bg-neutral-50/70"
      >
        <td className="px-4 py-3" onClick={stop}>
          <button
            onClick={() => favM.mutate()}
            className="grid h-7 w-7 place-items-center rounded-lg hover:bg-neutral-100"
            aria-label={c.favorite ? "Unfavorite" : "Favorite"}
          >
            <Star className={`h-3.5 w-3.5 ${c.favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
          </button>
        </td>
        <td className="px-4 py-3"><StatusPill status={c.status} /></td>
        <td className="px-4 py-3">
          <div className="truncate font-medium text-foreground">{c.name}</div>
          {c.description && <div className="truncate text-[11.5px] text-muted-foreground">{c.description}</div>}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="tabular-nums text-[12px] text-foreground">{c.completed_leads}/{c.total_leads}</span>
            <Progress value={pct} className="h-1.5 flex-1" />
            <span className="tabular-nums text-[11px] text-muted-foreground w-8 text-right">{pct}%</span>
          </div>
        </td>
        <td className="px-4 py-3">
          {c.sender_account ? (
            <div className="flex items-center gap-2">
              <div className="grid h-6 w-6 place-items-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white">
                {c.sender_account.slice(0, 2).toUpperCase()}
              </div>
              <span className="truncate text-[12.5px] text-foreground">{c.sender_account}</span>
            </div>
          ) : <span className="text-[12px] text-muted-foreground">—</span>}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {(c.tags ?? []).slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="h-5 rounded-md border-border/70 bg-neutral-50 px-1.5 text-[10.5px] font-medium">{t}</Badge>
            ))}
            {(c.tags?.length ?? 0) === 0 && <span className="text-[12px] text-muted-foreground">—</span>}
            {(c.tags?.length ?? 0) > 3 && <span className="text-[11px] text-muted-foreground">+{c.tags.length - 3}</span>}
          </div>
        </td>
        <td className="px-4 py-3 text-[12px] text-muted-foreground tabular-nums">
          {new Date(c.created_at).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
        </td>
        <td className="px-4 py-3" onClick={stop}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-70 hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl">
              <DropdownMenuItem onSelect={onOpen}><ExternalLink className="mr-2 h-3.5 w-3.5" /> Open campaign</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => dupM.mutate()}><Copy className="mr-2 h-3.5 w-3.5" /> Duplicate campaign</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRenameOpen(true)}><Pencil className="mr-2 h-3.5 w-3.5" /> Rename campaign</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSettingsOpen(true)}><Settings className="mr-2 h-3.5 w-3.5" /> Campaign settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              {c.status === "running" && (
                <DropdownMenuItem onSelect={() => statusM.mutate("paused")}><Pause className="mr-2 h-3.5 w-3.5" /> Pause campaign</DropdownMenuItem>
              )}
              {c.status === "paused" && (
                <DropdownMenuItem onSelect={() => statusM.mutate("running")}><Play className="mr-2 h-3.5 w-3.5" /> Resume campaign</DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => statusM.mutate("archived")}><Archive className="mr-2 h-3.5 w-3.5" /> Archive campaign</DropdownMenuItem>
              <DropdownMenuItem onSelect={exportCampaign}><Download className="mr-2 h-3.5 w-3.5" /> Export campaign</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      <RenameDialog open={renameOpen} onOpenChange={setRenameOpen} campaign={c} onSaved={onChanged} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} campaign={c} onSaved={onChanged} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{c.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the campaign, sequence, leads and analytics. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => delM.mutate()} className="rounded-lg bg-destructive hover:bg-destructive/90">
              Delete campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RenameDialog({ open, onOpenChange, campaign, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; campaign: Campaign; onSaved: () => void;
}) {
  const updateFn = useServerFn(updateCampaign);
  const [name, setName] = useState(campaign.name);
  const m = useMutation({
    mutationFn: () => updateFn({ data: { id: campaign.id, name: name.trim() } }),
    onSuccess: () => { toast.success("Renamed"); onSaved(); onOpenChange(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename campaign</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Campaign name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-lg" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-lg bg-[#0A0A0A] hover:bg-[#262626]" onClick={() => m.mutate()} disabled={m.isPending || !name.trim()}>
            {m.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsDialog({ open, onOpenChange, campaign, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; campaign: Campaign; onSaved: () => void;
}) {
  const updateFn = useServerFn(updateCampaign);
  const [form, setForm] = useState({
    name: campaign.name,
    description: campaign.description ?? "",
    sender_account: campaign.sender_account ?? "",
    daily_limit: campaign.daily_limit,
    working_days: campaign.working_days,
    working_hours_start: campaign.working_hours_start,
    working_hours_end: campaign.working_hours_end,
    timezone: campaign.timezone,
    tags: (campaign.tags ?? []).join(", "),
  });
  const m = useMutation({
    mutationFn: () => updateFn({ data: {
      id: campaign.id,
      name: form.name.trim(),
      description: form.description || null,
      sender_account: form.sender_account || null,
      daily_limit: Number(form.daily_limit),
      working_days: form.working_days,
      working_hours_start: form.working_hours_start,
      working_hours_end: form.working_hours_end,
      timezone: form.timezone,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    } }),
    onSuccess: () => { toast.success("Campaign settings saved"); onSaved(); onOpenChange(false); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const toggleDay = (d: string) => setForm((f) => ({
    ...f, working_days: f.working_days.includes(d) ? f.working_days.filter((x) => x !== d) : [...f.working_days, d],
  }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Campaign settings</DialogTitle>
          <DialogDescription>Update the basic configuration for this campaign.</DialogDescription>
        </DialogHeader>
        <CampaignForm form={form} setForm={setForm} toggleDay={toggleDay} showTags />
        <DialogFooter>
          <Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-lg bg-[#0A0A0A] hover:bg-[#262626]"
            onClick={() => m.mutate()}
            disabled={m.isPending || !form.name.trim() || form.working_days.length === 0}>
            {m.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateCampaignDialog({ open, onOpenChange, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void;
}) {
  const create = useServerFn(createCampaign);
  const [form, setForm] = useState({
    name: "", description: "", sender_account: "",
    daily_limit: 20,
    working_days: ["mon", "tue", "wed", "thu", "fri"],
    working_hours_start: "09:00", working_hours_end: "17:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    tags: "",
  });
  const m = useMutation({
    mutationFn: () => create({ data: {
      name: form.name.trim(), description: form.description || undefined,
      sender_account: form.sender_account || undefined,
      daily_limit: Number(form.daily_limit),
      working_days: form.working_days,
      working_hours_start: form.working_hours_start,
      working_hours_end: form.working_hours_end,
      timezone: form.timezone,
    } }),
    onSuccess: () => {
      toast.success("Campaign created");
      onCreated();
      onOpenChange(false);
      setForm({ ...form, name: "", description: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const toggleDay = (d: string) => setForm((f) => ({
    ...f, working_days: f.working_days.includes(d) ? f.working_days.filter((x) => x !== d) : [...f.working_days, d],
  }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create campaign</DialogTitle>
          <DialogDescription>Set the basics. You'll build the sequence and import leads next.</DialogDescription>
        </DialogHeader>
        <CampaignForm form={form} setForm={setForm} toggleDay={toggleDay} />
        <DialogFooter>
          <Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            className="rounded-lg bg-[#0A0A0A] hover:bg-[#262626]"
            onClick={() => m.mutate()}
            disabled={m.isPending || !form.name.trim() || form.working_days.length === 0}
          >
            {m.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Save campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CampaignForm({ form, setForm, toggleDay, showTags = false }: {
  form: any; setForm: (updater: any) => void; toggleDay: (d: string) => void; showTags?: boolean;
}) {
  return (
    <div className="space-y-3.5">
      <div className="space-y-1.5">
        <Label className="text-[12px]">Campaign name</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 rounded-lg" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px]">Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-[64px] rounded-lg" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px]">LinkedIn sender account</Label>
        <Input placeholder="you@company.com" value={form.sender_account} onChange={(e) => setForm({ ...form, sender_account: e.target.value })} className="h-9 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[12px]">Daily connection limit</Label>
          <Input type="number" min={1} max={200} value={form.daily_limit}
            onChange={(e) => setForm({ ...form, daily_limit: Number(e.target.value) })} className="h-9 rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Timezone</Label>
          <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="h-9 rounded-lg" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px]">Working days</Label>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => (
            <button
              key={d.v}
              type="button"
              onClick={() => toggleDay(d.v)}
              className={`h-8 rounded-lg border px-2.5 text-[12px] transition-colors ${
                form.working_days.includes(d.v)
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-border/70 bg-white text-foreground hover:bg-neutral-50"
              }`}
            >
              {d.l}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[12px]">Working hours start</Label>
          <Input type="time" value={form.working_hours_start}
            onChange={(e) => setForm({ ...form, working_hours_start: e.target.value })} className="h-9 rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Working hours end</Label>
          <Input type="time" value={form.working_hours_end}
            onChange={(e) => setForm({ ...form, working_hours_end: e.target.value })} className="h-9 rounded-lg" />
        </div>
      </div>
      {showTags && (
        <div className="space-y-1.5">
          <Label className="text-[12px]">Tags <span className="text-muted-foreground">(comma separated)</span></Label>
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="h-9 rounded-lg" placeholder="q4-outbound, saas, founders" />
        </div>
      )}
    </div>
  );
}
