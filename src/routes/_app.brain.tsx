import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateSalesBrain, saveBrainPrefs } from "@/lib/ai/agent.functions";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/brain")({ component: BrainPage });

const TONES = ["professional", "founder", "friendly", "consultant"];

function BrainPage() {
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
    <div>
      <PageHeader
        title="AI Sales Brain"
        description="Optional. Configure tone and rules. Skip and the AI will use your profile intelligence."
        actions={
          <>
            <Button variant="outline" onClick={() => savePrefs.mutate()} disabled={savePrefs.isPending} className="h-9 rounded-lg">
              {savePrefs.isPending ? "Saving…" : "Save preferences"}
            </Button>
            <Button onClick={() => runGen.mutate()} disabled={runGen.isPending} className="h-9 rounded-lg bg-[#2563EB] hover:bg-[#1d4fd0]">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {runGen.isPending ? "Generating…" : "Generate Sales Brain"}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 px-8 py-6 xl:grid-cols-2">
        <Card className="rounded-2xl border-border/70">
          <CardHeader className="pb-3"><div className="text-[14px] font-semibold">Preferences</div></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Tone</Label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button key={t} onClick={() => setTone(t)}
                    className={`rounded-full border px-3 py-1 text-[12px] capitalize ${tone === t ? "border-[#2563EB] bg-blue-50 text-[#2563EB]" : "border-border/70 bg-white text-muted-foreground"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-[12px]">Website</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="h-9 rounded-lg" placeholder="https://…" /></div>
            <div className="space-y-1.5"><Label className="text-[12px]">Custom instructions</Label>
              <Textarea rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} className="rounded-lg" placeholder="Anything specific the AI should know…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-[12px]">Do's (one per line)</Label>
                <Textarea rows={4} value={dos} onChange={(e) => setDos(e.target.value)} className="rounded-lg text-[12.5px]" /></div>
              <div className="space-y-1.5"><Label className="text-[12px]">Don'ts (one per line)</Label>
                <Textarea rows={4} value={donts} onChange={(e) => setDonts(e.target.value)} className="rounded-lg text-[12.5px]" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 text-white">
                <Brain className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[14px] font-semibold">Generated Intelligence</div>
                <div className="text-[11.5px] text-muted-foreground">{brain?.generated_at ? `Updated ${new Date(brain.generated_at).toLocaleString()}` : "Not generated yet"}</div>
              </div>
            </div>
            {brain?.generated_at && <Badge className="rounded-full bg-emerald-50 text-emerald-700 border-emerald-200">Ready</Badge>}
          </CardHeader>
          <CardContent className="space-y-4 text-[13px]">
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
