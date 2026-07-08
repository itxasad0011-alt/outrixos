import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listCampaigns, createCampaign, updateCampaignStatus,
  deleteCampaign, duplicateCampaign,
} from "@/lib/campaigns.functions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Search, MoreHorizontal, Play, Pause, Copy, Trash2, Archive, Loader2, Users, Send,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/outreach")({ component: OutreachCampaigns });

const DAYS = [
  { v: "mon", l: "Mon" }, { v: "tue", l: "Tue" }, { v: "wed", l: "Wed" },
  { v: "thu", l: "Thu" }, { v: "fri", l: "Fri" }, { v: "sat", l: "Sat" }, { v: "sun", l: "Sun" },
];

function OutreachCampaigns() {
  const qc = useQueryClient();
  const list = useServerFn(listCampaigns);
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => list({}),
  });

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<string>("newest");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    let r = campaigns.filter((c: any) =>
      (status === "all" || c.status === status) &&
      (query.trim() === "" || c.name.toLowerCase().includes(query.toLowerCase())),
    );
    if (sort === "oldest") r = [...r].sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
    if (sort === "most_leads") r = [...r].sort((a: any, b: any) => b.total_leads - a.total_leads);
    if (sort === "reply_rate") r = [...r].sort((a: any, b: any) => (b.replied_leads / Math.max(b.total_leads, 1)) - (a.replied_leads / Math.max(a.total_leads, 1)));
    return r;
  }, [campaigns, query, status, sort]);

  return (
    <div>
      <PageHeader
        title="Outreach"
        description="Manage LinkedIn campaigns. Import leads, design a sequence, launch when ready."
        actions={
          <Button
            onClick={() => setOpen(true)}
            className="h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Create campaign
          </Button>
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
            <SelectTrigger className="h-9 w-[150px] rounded-xl bg-white text-[13px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-[170px] rounded-xl bg-white text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="most_leads">Most leads</SelectItem>
              <SelectItem value="reply_rate">Highest reply rate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-24 text-[13px] text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onCreate={() => setOpen(true)} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((c: any) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onChanged={() => qc.invalidateQueries({ queryKey: ["campaigns"] })}
              />
            ))}
          </div>
        )}
      </div>

      <CreateCampaignDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => qc.invalidateQueries({ queryKey: ["campaigns"] })}
      />
    </div>
  );
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
          <div className="mt-1 text-[12.5px] text-muted-foreground">
            Create your first LinkedIn campaign to start reaching out.
          </div>
        </div>
        <Button onClick={onCreate} className="mt-2 h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Create campaign
        </Button>
      </CardContent>
    </Card>
  );
}

function statusColor(s: string) {
  switch (s) {
    case "running": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "paused": return "bg-amber-50 text-amber-700 border-amber-200";
    case "completed": return "bg-neutral-100 text-neutral-700 border-neutral-200";
    case "archived": return "bg-neutral-50 text-neutral-500 border-neutral-200";
    default: return "bg-white text-neutral-600 border-neutral-200";
  }
}

function CampaignCard({ campaign: c, onChanged }: { campaign: any; onChanged: () => void }) {
  const setStatus = useServerFn(updateCampaignStatus);
  const del = useServerFn(deleteCampaign);
  const dup = useServerFn(duplicateCampaign);

  const setM = useMutation({
    mutationFn: (status: any) => setStatus({ data: { id: c.id, status } }),
    onSuccess: () => { toast.success("Updated"); onChanged(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const delM = useMutation({
    mutationFn: () => del({ data: { id: c.id } }),
    onSuccess: () => { toast.success("Deleted"); onChanged(); },
  });
  const dupM = useMutation({
    mutationFn: () => dup({ data: { id: c.id } }),
    onSuccess: () => { toast.success("Duplicated"); onChanged(); },
  });

  const pct = c.total_leads ? Math.round((c.completed_leads / c.total_leads) * 100) : 0;

  return (
    <Card className="rounded-2xl border-border/70 bg-white transition-shadow hover:shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              to="/outreach/$campaignId"
              params={{ campaignId: c.id }}
              className="block truncate text-[14.5px] font-semibold tracking-tight hover:underline"
            >
              {c.name}
            </Link>
            {c.description && (
              <div className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">{c.description}</div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem asChild>
                <Link to="/outreach/$campaignId" params={{ campaignId: c.id }}>Open</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => dupM.mutate()}><Copy className="mr-2 h-3.5 w-3.5" /> Duplicate</DropdownMenuItem>
              {c.status === "running" ? (
                <DropdownMenuItem onSelect={() => setM.mutate("paused")}><Pause className="mr-2 h-3.5 w-3.5" /> Pause</DropdownMenuItem>
              ) : c.status === "paused" ? (
                <DropdownMenuItem onSelect={() => setM.mutate("running")}><Play className="mr-2 h-3.5 w-3.5" /> Resume</DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={() => setM.mutate("archived")}><Archive className="mr-2 h-3.5 w-3.5" /> Archive</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => delM.mutate()} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Badge variant="outline" className={`h-5 rounded-md border px-1.5 text-[10.5px] font-medium capitalize ${statusColor(c.status)}`}>
            {c.status}
          </Badge>
          <div className="flex items-center gap-1 text-[11.5px] text-muted-foreground">
            <Users className="h-3 w-3" /> {c.total_leads} leads
          </div>
          <div className="text-[11.5px] text-muted-foreground">· {c.daily_limit}/day</div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progress</span><span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Created {new Date(c.created_at).toLocaleDateString()}</span>
          {c.last_activity_at && <span>Active {new Date(c.last_activity_at).toLocaleDateString()}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateCampaignDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const create = useServerFn(createCampaign);
  const [form, setForm] = useState({
    name: "", description: "", sender_account: "",
    daily_limit: 20,
    working_days: ["mon", "tue", "wed", "thu", "fri"],
    working_hours_start: "09:00", working_hours_end: "17:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  const m = useMutation({
    mutationFn: () => create({ data: form }),
    onSuccess: () => {
      toast.success("Campaign created");
      onCreated();
      onOpenChange(false);
      setForm({ ...form, name: "", description: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function toggleDay(d: string) {
    setForm((f) => ({
      ...f,
      working_days: f.working_days.includes(d) ? f.working_days.filter((x) => x !== d) : [...f.working_days, d],
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create campaign</DialogTitle>
          <DialogDescription>Set the basics. You'll build the sequence and import leads next.</DialogDescription>
        </DialogHeader>
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
            <Label className="text-[12px]">Sender LinkedIn account</Label>
            <Input placeholder="you@company.com" value={form.sender_account} onChange={(e) => setForm({ ...form, sender_account: e.target.value })} className="h-9 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Daily connection limit</Label>
              <Input type="number" min={1} max={200} value={form.daily_limit}
                onChange={(e) => setForm({ ...form, daily_limit: Number(e.target.value) })}
                className="h-9 rounded-lg" />
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
              <Input type="time" value={form.working_hours_start} onChange={(e) => setForm({ ...form, working_hours_start: e.target.value })} className="h-9 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Working hours end</Label>
              <Input type="time" value={form.working_hours_end} onChange={(e) => setForm({ ...form, working_hours_end: e.target.value })} className="h-9 rounded-lg" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-lg">Cancel</Button>
          <Button
            onClick={() => m.mutate()}
            disabled={m.isPending || !form.name.trim() || form.working_days.length === 0}
            className="rounded-lg bg-[#0A0A0A] hover:bg-[#262626]"
          >
            {m.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Save campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
