import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { Link as LinkIcon, FileText, Quote, Award, BookOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/knowledge")({ component: KbPage });

const KINDS = [
  { id: "link", label: "Link", icon: LinkIcon },
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "doc", label: "Doc", icon: BookOpen },
  { id: "testimonial", label: "Testimonial", icon: Quote },
  { id: "case_study", label: "Case Study", icon: Award },
] as const;

function KbPage() {
  const qc = useQueryClient();
  const { data: docs } = useQuery({
    queryKey: ["kb"],
    queryFn: async () => {
      const { data } = await supabase.from("knowledge_docs").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [kind, setKind] = useState<typeof KINDS[number]["id"]>("link");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");

  const add = useServerFn(addKnowledgeDoc);
  const addM = useMutation({
    mutationFn: () => add({ data: { kind, title, url: url || undefined, content: content || undefined } }),
    onSuccess: () => {
      toast.success("Added to Knowledge Base");
      setTitle(""); setUrl(""); setContent("");
      qc.invalidateQueries({ queryKey: ["kb"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  async function remove(id: string) {
    const { error } = await supabase.from("knowledge_docs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["kb"] });
  }

  return (
    <div>
      <PageHeader title="Knowledge Base" description="Feed the AI. Links, testimonials, case studies, docs — used during conversations." />
      <div className="grid gap-6 px-8 py-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-2xl border-border/70">
          <CardContent className="p-0">
            {(docs?.length ?? 0) === 0 ? (
              <div className="grid place-items-center py-16 text-[13px] text-muted-foreground">Nothing here yet — add your first knowledge item →</div>
            ) : (
              <div className="divide-y divide-border/60">
                {docs!.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-muted-foreground">
                      {(() => { const I = KINDS.find(k => k.id === d.kind)?.icon ?? LinkIcon; return <I className="h-4 w-4" />; })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium">{d.title}</div>
                      <div className="truncate text-[11.5px] text-muted-foreground">{d.url || d.content || d.kind}</div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => remove(d.id)} className="rounded-lg text-muted-foreground hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70">
          <CardContent className="space-y-3 p-5">
            <div className="text-[14px] font-semibold">Add to knowledge</div>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button key={k.id} onClick={() => setKind(k.id)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] ${kind === k.id ? "border-[#0A0A0A] bg-neutral-100 text-[#0A0A0A]" : "border-border/70 bg-white text-muted-foreground"}`}>
                  <k.icon className="h-3 w-3" />{k.label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5"><Label className="text-[12px]">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 rounded-lg" /></div>
            <div className="space-y-1.5"><Label className="text-[12px]">URL (optional)</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} className="h-9 rounded-lg" placeholder="https://…" /></div>
            <div className="space-y-1.5"><Label className="text-[12px]">Content (optional)</Label>
              <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} className="rounded-lg" placeholder="Paste text the AI can quote…" /></div>
            <Button onClick={() => addM.mutate()} disabled={!title || addM.isPending} className="h-9 w-full rounded-lg bg-[#0A0A0A] hover:bg-[#262626]">
              <Plus className="mr-1.5 h-3.5 w-3.5" />{addM.isPending ? "Adding…" : "Add item"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
