import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_app/notifications")({
  component: Notifications,
});

const groups = [
  {
    label: "Sales events",
    items: [
      { t: "New reply received", d: "When a lead replies to any message.", email: true, push: true },
      { t: "Lead marked Interested", d: "AI flags a prospect as high intent.", email: true, push: true },
      { t: "Meeting booked", d: "A discovery call or demo lands on your calendar.", email: true, push: true },
      { t: "Deal marked Won", d: "You close a client using Relay.", email: true, push: false },
    ],
  },
  {
    label: "AI activity",
    items: [
      { t: "Daily AI summary", d: "One digest of everything the AI did today.", email: true, push: false },
      { t: "New learnings added to Memory", d: "When the AI learns a new pattern or objection.", email: false, push: false },
      { t: "Follow-up sequence completed", d: "Notify me when a lead exits the sequence.", email: false, push: true },
    ],
  },
  {
    label: "System",
    items: [
      { t: "LinkedIn connection health", d: "Warn me if the connection weakens or breaks.", email: true, push: true },
      { t: "Billing & plan updates", d: "Renewals, failed payments, plan changes.", email: true, push: false },
    ],
  },
];

function Notifications() {
  return (
    <div>
      <PageHeader title="Notifications" description="Choose when and how your AI keeps you in the loop." />
      <div className="p-8">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="p-0">
            {groups.map((g, gi) => (
              <div key={g.label}>
                {gi > 0 && <Separator />}
                <div className="grid grid-cols-[1fr_100px_100px] items-center gap-4 border-b border-border/60 bg-secondary/40 px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <div>{g.label}</div>
                  <div className="text-center">Email</div>
                  <div className="text-center">Push</div>
                </div>
                <div className="divide-y divide-border/60">
                  {g.items.map((it) => (
                    <div key={it.t} className="grid grid-cols-[1fr_100px_100px] items-center gap-4 px-6 py-4">
                      <div>
                        <div className="text-[13px] font-medium">{it.t}</div>
                        <div className="text-[11.5px] text-muted-foreground">{it.d}</div>
                      </div>
                      <div className="flex justify-center"><Switch defaultChecked={it.email} /></div>
                      <div className="flex justify-center"><Switch defaultChecked={it.push} /></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
