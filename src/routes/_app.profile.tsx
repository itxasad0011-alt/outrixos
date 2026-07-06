import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Linkedin, CheckCircle2, Sparkles, Edit3, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  component: Profile,
});

function Profile() {
  return (
    <div>
      <PageHeader
        title="Profile"
        description="Everything the AI knows about you and your business — auto-extracted from LinkedIn."
        actions={
          <>
            <Button variant="outline" className="h-9 rounded-xl border-border/70 bg-white text-[12.5px]"><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Re-scan LinkedIn</Button>
            <Button asChild className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]"><Link to="/brain"><Sparkles className="mr-1.5 h-3.5 w-3.5" />Refine in AI Brain</Link></Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 p-8 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="p-6 text-center">
            <Avatar className="mx-auto h-20 w-20"><AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-[18px] text-white">AM</AvatarFallback></Avatar>
            <div className="mt-4 text-[16px] font-semibold">Alex Morgan</div>
            <div className="text-[12.5px] text-muted-foreground">Founder · Acme Studio</div>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> LinkedIn connected
            </div>
            <div className="mt-5 rounded-xl border border-border/60 bg-secondary/40 p-3 text-left">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-blue-700"><Linkedin className="h-3 w-3" /> linkedin.com/in/alexmorgan</div>
              <div className="text-[11.5px] text-muted-foreground">Last synced 2 minutes ago</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="space-y-5 p-6">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#2563EB]" />
              <span className="text-[13px] font-semibold">AI-generated profile</span>
              <Badge variant="secondary" className="ml-auto rounded-full bg-blue-50 text-[10.5px] text-blue-700">Editable</Badge>
            </div>

            <Field label="Headline" defaultValue="Founder at Acme Studio — beautiful brands that convert" />
            <Field label="Industry" defaultValue="Design & Creative Services" />
            <Field label="Services" defaultValue="Brand design, product design, growth consulting" />
            <FieldArea label="Experience" defaultValue="12 years · Founder at Acme Studio, ex-Airbnb Design, ex-Stripe Brand" />
            <Field label="Skills" defaultValue="Product strategy · Brand systems · GTM design · Motion" />
            <FieldArea label="Ideal Customer Profile" defaultValue="Series A–C SaaS founders and heads of growth · 20–200 employees · US / EU · shipping product ≥ 2 years" />
            <FieldArea label="Value proposition" defaultValue="We ship beautiful brands that convert — in 6 weeks, not 6 months." />
            <Field label="Target audience" defaultValue="Founders, CROs, Heads of Growth" />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="h-9 rounded-xl border-border/70 text-[12.5px]"><Edit3 className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
              <Button className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]">Save changes</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">{label}</label>
      <Input defaultValue={defaultValue} className="h-9 rounded-xl border-border/70 text-[13px]" />
    </div>
  );
}
function FieldArea({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-medium text-muted-foreground">{label}</label>
      <Textarea rows={2} defaultValue={defaultValue} className="rounded-xl border-border/70 text-[13px]" />
    </div>
  );
}
