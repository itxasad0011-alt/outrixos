import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon, Clock, Video, ExternalLink, CheckCircle2,
  XCircle, MapPin, User as UserIcon, ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";
import type { DayProps } from "react-day-picker";

type Meeting = Tables<"meetings"> & { lead?: Pick<Tables<"leads">, "full_name" | "company" | "avatar_url" | "linkedin_url" | "role"> | null };

function initials(name: string) { return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase(); }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function fmtDay(d: Date) { return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }); }
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function MeetingsPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Date>(new Date());
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const [openMeeting, setOpenMeeting] = useState<Meeting | null>(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*, lead:leads(full_name, company, avatar_url, linkedin_url, role)")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Meeting[];
    },
  });

  const meetingsByDay = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of meetings) {
      const d = new Date(m.scheduled_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return map;
  }, [meetings]);

  const dayMeetings = useMemo(() => {
    const key = `${selected.getFullYear()}-${selected.getMonth()}-${selected.getDate()}`;
    return (meetingsByDay.get(key) ?? []).sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
    );
  }, [meetingsByDay, selected]);

  const now = Date.now();
  const listMeetings = useMemo(() => {
    const arr = meetings.filter((m) =>
      view === "upcoming" ? new Date(m.scheduled_at).getTime() >= now - 3600_000 : new Date(m.scheduled_at).getTime() < now,
    );
    return view === "upcoming" ? arr : arr.reverse();
  }, [meetings, view, now]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("meetings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(`Meeting ${v.status}`);
      qc.invalidateQueries({ queryKey: ["meetings"] });
      setOpenMeeting(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = {
    upcoming: meetings.filter((m) => new Date(m.scheduled_at).getTime() >= now).length,
    thisWeek: meetings.filter((m) => {
      const t = new Date(m.scheduled_at).getTime();
      return t >= now && t < now + 7 * 86400_000;
    }).length,
    completed: meetings.filter((m) => m.status === "completed").length,
  };

  const goToday = () => setSelected(new Date());

  return (
    <div>
      <PageHeader
        title="Meetings"
        description="Discovery calls, follow-ups, and demos booked by the AI agent."
        actions={
          <Badge variant="secondary" className="rounded-full text-[11px]">
            <CalendarIcon className="mr-1 h-3 w-3" /> {stats.upcoming} upcoming
          </Badge>
        }
      />

      <div className="px-8 py-6 space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Upcoming" value={stats.upcoming} icon={<CalendarIcon className="h-3.5 w-3.5" />} />
          <StatCard label="This week" value={stats.thisWeek} icon={<Clock className="h-3.5 w-3.5" />} />
          <StatCard label="Completed" value={stats.completed} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          {/* Calendar */}
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-semibold tracking-tight">
                    {selected.toLocaleString([], { month: "long", year: "numeric" })}
                  </div>
                  <div className="text-[12px] text-muted-foreground">Click a day to see scheduled meetings.</div>
                </div>
                <Button variant="outline" size="sm" className="rounded-xl h-8" onClick={goToday}>Today</Button>
              </div>
              <Calendar
                mode="single"
                selected={selected}
                onSelect={(d) => d && setSelected(d)}
                className="w-full [--cell-size:2.5rem]"
                components={{
                  Day: ({ day, modifiers, ...rest }: DayProps) => {
                    const date = day.date;
                    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                    const has = (meetingsByDay.get(key)?.length ?? 0) > 0;
                    const isSel = sameDay(date, selected);
                    const isToday = sameDay(date, new Date());
                    return (
                      <td {...rest} className="p-0.5">
                        <button
                          onClick={() => setSelected(date)}
                          className={[
                            "relative mx-auto grid h-9 w-9 place-items-center rounded-xl text-[12.5px] transition",
                            modifiers.outside ? "text-muted-foreground/40" : "text-foreground",
                            isSel ? "bg-foreground text-background" : "hover:bg-muted",
                            !isSel && isToday ? "ring-1 ring-foreground/30" : "",
                          ].join(" ")}
                        >
                          {date.getDate()}
                          {has && (
                            <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSel ? "bg-background" : "bg-foreground"}`} />
                          )}
                        </button>
                      </td>
                    );
                  },
                }}
              />

              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <div className="text-[13px] font-medium">{fmtDay(selected)}</div>
                <div className="text-[11.5px] text-muted-foreground">{dayMeetings.length} meeting{dayMeetings.length === 1 ? "" : "s"}</div>
              </div>

              <div className="mt-3 space-y-2">
                {dayMeetings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
                    <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-muted">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mt-2 text-[13px] font-medium">Nothing scheduled</div>
                    <div className="text-[11.5px] text-muted-foreground">The AI will book meetings here as leads confirm.</div>
                  </div>
                ) : (
                  dayMeetings.map((m) => (
                    <MeetingRow key={m.id} meeting={m} onClick={() => setOpenMeeting(m)} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Side panel */}
          <Card className="rounded-2xl border-border/70">
            <CardContent className="p-5">
              <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
                <TabsList className="grid w-full grid-cols-2 rounded-xl">
                  <TabsTrigger value="upcoming" className="rounded-lg">Upcoming</TabsTrigger>
                  <TabsTrigger value="past" className="rounded-lg">Past</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="mt-4 space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl border border-border/60 bg-muted/20 animate-pulse" />
                  ))
                ) : listMeetings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
                    <div className="text-[13px] font-medium">No {view} meetings</div>
                    <div className="text-[11.5px] text-muted-foreground mt-1">
                      {view === "upcoming"
                        ? "As leads confirm calls, they'll appear here."
                        : "Past meetings will be logged here for reference."}
                    </div>
                  </div>
                ) : (
                  listMeetings.map((m) => (
                    <MiniMeeting key={m.id} meeting={m} onClick={() => {
                      setOpenMeeting(m);
                      setSelected(new Date(m.scheduled_at));
                    }} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <MeetingDrawer
        meeting={openMeeting}
        onClose={() => setOpenMeeting(null)}
        onStatus={(status) => openMeeting && updateStatus.mutate({ id: openMeeting.id, status })}
        busy={updateStatus.isPending}
      />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {icon}{label}
      </div>
      <div className="mt-2 text-[24px] font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "completed": return "bg-emerald-500/10 text-emerald-700";
    case "confirmed": return "bg-blue-500/10 text-blue-700";
    case "cancelled": return "bg-muted text-muted-foreground";
    case "proposed":
    default: return "bg-amber-500/10 text-amber-700";
  }
}

function MeetingRow({ meeting, onClick }: { meeting: Meeting; onClick: () => void }) {
  const lead = meeting.lead;
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border/60 bg-card p-3 transition hover:border-foreground/20 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="w-14 shrink-0 text-center">
          <div className="text-[13px] font-semibold tabular-nums">{fmtTime(meeting.scheduled_at)}</div>
          <div className="text-[10.5px] text-muted-foreground">{meeting.duration_min ?? 30} min</div>
        </div>
        <Separator orientation="vertical" className="h-9" />
        <Avatar className="h-8 w-8">
          <AvatarImage src={lead?.avatar_url ?? undefined} />
          <AvatarFallback className="text-[10.5px]">{lead ? initials(lead.full_name) : "—"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{lead?.full_name ?? "Unknown lead"}</div>
          <div className="truncate text-[11px] text-muted-foreground">{lead?.company ?? ""}{lead?.role ? ` · ${lead.role}` : ""}</div>
        </div>
        <Badge className={`rounded-full text-[10.5px] capitalize ${statusTone(meeting.status)} hover:${statusTone(meeting.status)}`}>{meeting.status}</Badge>
      </div>
    </button>
  );
}

function MiniMeeting({ meeting, onClick }: { meeting: Meeting; onClick: () => void }) {
  const d = new Date(meeting.scheduled_at);
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border/60 bg-card p-3 transition hover:border-foreground/20"
    >
      <div className="flex items-center gap-3">
        <div className="w-11 shrink-0 rounded-lg bg-muted/60 py-1.5 text-center">
          <div className="text-[9.5px] uppercase tracking-wide text-muted-foreground">{d.toLocaleString([], { month: "short" })}</div>
          <div className="text-[14px] font-semibold leading-none">{d.getDate()}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium">{meeting.lead?.full_name ?? "Unknown lead"}</div>
          <div className="truncate text-[10.5px] text-muted-foreground">
            {fmtTime(meeting.scheduled_at)} · {meeting.lead?.company ?? ""}
          </div>
        </div>
        <Badge className={`rounded-full text-[10px] capitalize ${statusTone(meeting.status)} hover:${statusTone(meeting.status)}`}>{meeting.status}</Badge>
      </div>
    </button>
  );
}

function MeetingDrawer({
  meeting, onClose, onStatus, busy,
}: {
  meeting: Meeting | null;
  onClose: () => void;
  onStatus: (s: string) => void;
  busy: boolean;
}) {
  return (
    <Sheet open={!!meeting} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col">
        {meeting && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60">
              <SheetTitle className="text-[16px]">Meeting details</SheetTitle>
              <div className="mt-1 text-[12px] text-muted-foreground">Booked by the AI agent</div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={meeting.lead?.avatar_url ?? undefined} />
                    <AvatarFallback>{meeting.lead ? initials(meeting.lead.full_name) : "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium truncate">{meeting.lead?.full_name}</div>
                    <div className="text-[11.5px] text-muted-foreground truncate">{meeting.lead?.role}{meeting.lead?.company ? ` · ${meeting.lead.company}` : ""}</div>
                  </div>
                </div>
                {meeting.lead?.linkedin_url && (
                  <a href={meeting.lead.linkedin_url} target="_blank" rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-[12px] text-foreground/80 hover:text-foreground">
                    View LinkedIn <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="space-y-3">
                <DetailRow icon={<CalendarIcon className="h-3.5 w-3.5" />} label="When"
                  value={new Date(meeting.scheduled_at).toLocaleString([], { dateStyle: "full", timeStyle: "short" })} />
                <DetailRow icon={<Clock className="h-3.5 w-3.5" />} label="Duration" value={`${meeting.duration_min ?? 30} minutes`} />
                <DetailRow icon={<MapPin className="h-3.5 w-3.5" />} label="Status"
                  value={<Badge className={`rounded-full text-[10.5px] capitalize ${statusTone(meeting.status)} hover:${statusTone(meeting.status)}`}>{meeting.status}</Badge>} />
                {meeting.meeting_url && (
                  <DetailRow icon={<Video className="h-3.5 w-3.5" />} label="Link"
                    value={<a href={meeting.meeting_url} target="_blank" rel="noreferrer" className="text-foreground/80 hover:text-foreground inline-flex items-center gap-1">Join call <ExternalLink className="h-3 w-3" /></a>} />
                )}
                {meeting.notes && (
                  <div className="rounded-xl border border-border/60 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Notes</div>
                    <p className="mt-1 text-[12.5px] leading-relaxed">{meeting.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />
            <div className="grid grid-cols-3 gap-2 p-4">
              <Button size="sm" disabled={busy} onClick={() => onStatus("confirmed")} className="rounded-xl">
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Confirm
              </Button>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => onStatus("completed")} className="rounded-xl">
                <UserIcon className="mr-1.5 h-3.5 w-3.5" /> Completed
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus("cancelled")} className="rounded-xl">
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-[12.5px]">
      <div className="mt-0.5 grid h-6 w-6 place-items-center rounded-md bg-muted text-muted-foreground">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-0.5">{value}</div>
      </div>
    </div>
  );
}

// suppress unused import lint for chevrons — reserved for a future header nav
void ChevronLeft; void ChevronRight;

export const Route = createFileRoute("/_app/meetings")({
  head: () => ({
    meta: [
      { title: "Meetings — Outrix" },
      { name: "description", content: "Track every meeting booked from your outreach — upcoming calls, no-shows, outcomes, and follow-up actions in one place." },
      { property: "og:title", content: "Meetings — Outrix" },
      { property: "og:description", content: "Every meeting booked from your outreach with outcomes and follow-up tracking." },
    ],
  }),
  component: MeetingsPage,
});
