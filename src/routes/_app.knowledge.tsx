import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, FileText, Trash2, Edit3, History, Link as LinkIcon, Plus, FileType, StickyNote } from "lucide-react";

export const Route = createFileRoute("/_app/knowledge")({
  component: Knowledge,
});

const files = [
  { name: "Sales Deck 2026.pdf", type: "PDF", size: "2.4 MB", updated: "2d ago" },
  { name: "Pricing & Packages.docx", type: "DOCX", size: "180 KB", updated: "1w ago" },
  { name: "Loom Case Study.pdf", type: "PDF", size: "890 KB", updated: "3w ago" },
  { name: "Brand Guidelines.pdf", type: "PDF", size: "5.1 MB", updated: "1mo ago" },
  { name: "Discovery Script v3.txt", type: "TXT", size: "12 KB", updated: "today" },
];

const links = [
  { url: "acme.studio", label: "Company website" },
  { url: "notion.so/acme/playbook", label: "Sales playbook" },
  { url: "drive.google.com/…/case-studies", label: "Case studies folder" },
];

function Knowledge() {
  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        description="Build your AI's brain — documents, links, and notes it uses to represent you."
        actions={<Button className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]"><UploadCloud className="mr-1.5 h-3.5 w-3.5" />Upload files</Button>}
      />
      <div className="grid grid-cols-1 gap-4 p-8 lg:grid-cols-3">
        <Card className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 shadow-none lg:col-span-3">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-sm"><UploadCloud className="h-5 w-5 text-[#2563EB]" /></div>
            <div className="text-[14px] font-semibold">Drag & drop or click to upload</div>
            <div className="mt-1 text-[12px] text-muted-foreground">PDF · DOCX · PPT · TXT — up to 25MB per file</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none lg:col-span-2">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border/60 p-4">
              <div className="text-[13.5px] font-semibold">Uploaded files</div>
              <span className="text-[11.5px] text-muted-foreground">{files.length} documents</span>
            </div>
            <div className="divide-y divide-border/60">
              {files.map((f) => (
                <div key={f.name} className="group flex items-center gap-3 p-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">{f.name}</div>
                    <div className="text-[11.5px] text-muted-foreground">{f.type} · {f.size} · Updated {f.updated}</div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><History className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Edit3 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-rose-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-2xl border-border/60 bg-white shadow-none">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[13.5px] font-semibold">Company links</div>
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg"><Plus className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="space-y-2">
                {links.map((l) => (
                  <div key={l.url} className="flex items-center gap-2 rounded-xl border border-border/60 p-2.5">
                    <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-medium">{l.label}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{l.url}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-white shadow-none">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2 text-[13.5px] font-semibold"><StickyNote className="h-4 w-4" />Internal notes</div>
              <Textarea rows={5} className="rounded-xl border-border/70 text-[12.5px]" placeholder="Add product context, positioning, competitive notes…" defaultValue="Our AI never quotes discounts above 15%. Always route enterprise leads (200+) to Alex." />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-white shadow-none">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2 text-[13.5px] font-semibold"><FileType className="h-4 w-4" />Categories</div>
              <div className="flex flex-wrap gap-1.5">
                {["Company Docs", "Portfolio", "Testimonials", "Case Studies", "FAQs", "Sales Scripts", "Pricing", "Brand"].map(t => (
                  <Badge key={t} variant="secondary" className="rounded-full bg-secondary text-[11px] font-medium">{t}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
