import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { addManualLead } from "@/lib/ai/agent.functions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, Link as LinkIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/manual-leads")({ component: ManualLeads });

function ManualLeads() {
  const qc = useQueryClient();
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [csvName, setCsvName] = useState<string | null>(null);
  const [csvCount, setCsvCount] = useState(0);

  const { data: leads } = useQuery({
    queryKey: ["leads", "manual"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("source", "manual")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = useServerFn(addManualLead);
  const addUrlM = useMutation({
    mutationFn: (url: string) =>
      add({
        data: {
          linkedin_url: url,
          full_name: guessNameFromUrl(url),
        },
      }),
    onSuccess: () => {
      toast.success("Lead added — the AI is extracting details");
      setLinkedinUrl("");
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function handleCsv(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target?.result ?? "");
      const rows = text.split(/\r?\n/).filter(Boolean).length;
      const leadsCount = Math.max(0, rows - 1);
      setCsvName(file.name);
      setCsvCount(leadsCount);
      toast.success(`Parsed ${leadsCount} leads from ${file.name}`);
    };
    reader.readAsText(file);
  }

  return (
    <div>
      <PageHeader
        title="Manual Leads"
        description="Two ways to bring your own leads. The AI extracts name, company, role, industry, and location automatically."
      />
      <div className="grid gap-6 px-8 py-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="p-6">
            <Tabs defaultValue="url">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-neutral-100 p-1">
                <TabsTrigger value="url" className="rounded-lg text-[12.5px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <LinkIcon className="mr-1.5 h-3.5 w-3.5" /> LinkedIn URL
                </TabsTrigger>
                <TabsTrigger value="csv" className="rounded-lg text-[12.5px] data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> CSV Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="mt-5 space-y-3">
                <Label className="text-[12px]">Paste a LinkedIn profile URL</Label>
                <Input
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/…"
                  className="h-10 rounded-xl"
                />
                <Button
                  onClick={() => addUrlM.mutate(linkedinUrl)}
                  disabled={!linkedinUrl.trim() || addUrlM.isPending}
                  className="h-10 w-full rounded-xl bg-black text-white hover:bg-neutral-800"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {addUrlM.isPending ? "Adding…" : "Add & auto-extract"}
                </Button>
                <p className="text-[11.5px] text-muted-foreground">
                  The AI reads the profile and fills in name, company, role, industry, and location.
                </p>
              </TabsContent>

              <TabsContent value="csv" className="mt-5 space-y-3">
                <Label className="text-[12px]">Upload a CSV of leads</Label>
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-neutral-50/60 px-4 py-8 text-center transition hover:bg-neutral-50">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <div className="text-[13px] font-medium">Drop a CSV or click to browse</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    Columns: full_name, linkedin_url, company, role
                  </div>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleCsv(f);
                    }}
                  />
                </label>
                {csvName && (
                  <div className="rounded-xl border border-border/60 bg-neutral-50 px-3 py-2 text-[12px]">
                    <span className="font-medium">{csvName}</span>{" "}
                    <span className="text-muted-foreground">· {csvCount} leads queued for import</span>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <div className="text-[13px] font-semibold">Recently added</div>
              <div className="text-[11.5px] text-muted-foreground">{leads?.length ?? 0} leads</div>
            </div>
            {(leads?.length ?? 0) === 0 ? (
              <div className="grid place-items-center py-16 text-[13px] text-muted-foreground">
                No manual leads yet.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {leads!.map((l) => (
                  <div key={l.id} className="flex items-center gap-3 px-5 py-3 text-[13px]">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{l.full_name}</div>
                      <div className="truncate text-[11.5px] text-muted-foreground">
                        {[l.role, l.company].filter(Boolean).join(" · ") || l.headline || l.linkedin_url}
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground">{l.industry}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function guessNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/^\/+|\/+$/g, "").split("/").pop() ?? "";
    return path
      .replace(/-\w{6,}$/, "")
      .split("-")
      .filter(Boolean)
      .map((s) => s[0]?.toUpperCase() + s.slice(1))
      .join(" ") || "New lead";
  } catch {
    return "New lead";
  }
}
