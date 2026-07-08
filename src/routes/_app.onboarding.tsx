import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Linkedin, CheckCircle2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/onboarding")({
  component: Onboarding,
});

const traits = [
  { l: "Services", v: "Brand design, product design, growth consulting" },
  { l: "Experience", v: "12 years · Founder at Acme Studio, ex-Airbnb Design" },
  { l: "Skills", v: "Product strategy, brand systems, GTM design" },
  { l: "Industry", v: "Design & Creative Services" },
  { l: "Target audience", v: "Series A–C SaaS founders and heads of growth" },
  { l: "Value proposition", v: "Beautiful brands that convert — shipped in 6 weeks." },
];

function Onboarding() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-700 text-white shadow-lg"><Sparkles className="h-5 w-5" /></div>
        <h1 className="text-[28px] font-semibold tracking-tight">Meet your AI sales agent</h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground">Connect LinkedIn — the AI will scan your profile, understand your business, and get to work in minutes.</p>
      </div>

      <Card className="mb-4 rounded-2xl border-border/60 bg-white shadow-none">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#0A0A0A] text-white"><Linkedin className="h-5 w-5" /></div>
          <div className="flex-1">
            <div className="text-[14px] font-semibold">LinkedIn connected</div>
            <div className="text-[12px] text-muted-foreground">Alex Morgan · Founder at Acme Studio</div>
          </div>
          <Badge className="rounded-full bg-emerald-50 text-[11px] text-emerald-700 hover:bg-emerald-50"><CheckCircle2 className="mr-1 h-3 w-3" />Connected</Badge>
        </CardContent>
      </Card>

      <Card className="mb-4 rounded-2xl border-border/60 bg-white shadow-none">
        <CardContent className="p-6">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[#0A0A0A]" />
            <span className="text-[13px] font-semibold">AI scanning your profile…</span>
            <span className="ml-auto text-[12px] font-medium text-[#0A0A0A]">86%</span>
          </div>
          <Progress value={86} className="h-1.5" />
          <div className="mt-4 text-[12px] text-muted-foreground">Reading your headline, experience, posts, and connections to build your Sales Brain.</div>
        </CardContent>
      </Card>

      <Card className="mb-4 rounded-2xl border-border/60 bg-white shadow-none">
        <CardContent className="space-y-3 p-6">
          <div className="mb-2 text-[15px] font-semibold">Here's what the AI understood</div>
          {traits.map((t) => (
            <div key={t.l} className="grid grid-cols-[140px_1fr] items-start gap-3 rounded-xl border border-border/60 p-3">
              <div className="text-[11.5px] font-medium text-muted-foreground">{t.l}</div>
              <div className="text-[13px]">{t.v}</div>
            </div>
          ))}
          <div className="pt-2 text-[11.5px] text-muted-foreground">You can edit any of this in AI Sales Brain later.</div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-gradient-to-br from-blue-50 to-white p-5">
        <div>
          <div className="text-[14px] font-semibold">Optional: Configure the AI further</div>
          <div className="text-[12px] text-muted-foreground">Add pricing, docs, tone, and CTAs. You can also skip — the AI will use your profile.</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="h-9 rounded-xl border-border/70 text-[12.5px]"><Link to="/">Skip for now</Link></Button>
          <Button asChild className="h-9 rounded-xl bg-[#0A0A0A] text-[12.5px] hover:bg-[#262626]"><Link to="/profile" search={{ tab: "brain" }}>Continue <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
        </div>
      </div>
    </div>
  );
}
