import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/team")({
  component: Team,
});

const members = [
  { name: "Alex Morgan", email: "alex@acme.studio", role: "Owner", status: "Active" },
  { name: "Riley Chen", email: "riley@acme.studio", role: "Admin", status: "Active" },
  { name: "Jordan Blake", email: "jordan@acme.studio", role: "Member", status: "Active" },
  { name: "Sam Diaz", email: "sam@acme.studio", role: "Member", status: "Invited" },
];

function Team() {
  return (
    <div>
      <PageHeader
        title="Team"
        description="Invite teammates and manage roles across your workspace."
        actions={<Button className="h-9 rounded-xl bg-[#2563EB] text-[12.5px] hover:bg-[#1d4fd0]"><Plus className="mr-1.5 h-3.5 w-3.5" />Invite member</Button>}
      />
      <div className="p-8">
        <Card className="rounded-2xl border-border/60 bg-white shadow-none">
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {members.map((m) => (
                <div key={m.email} className="flex items-center gap-3 p-4">
                  <Avatar className="h-10 w-10"><AvatarFallback className="bg-secondary text-[12px]">{m.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold">{m.name}</div>
                    <div className="text-[12px] text-muted-foreground">{m.email}</div>
                  </div>
                  <Badge variant="secondary" className="rounded-full bg-secondary text-[11px]">{m.role}</Badge>
                  <Badge variant="secondary" className={`rounded-full text-[11px] ${m.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{m.status}</Badge>
                  <Button size="sm" variant="ghost" className="h-8 rounded-lg text-[12px]">Manage</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
