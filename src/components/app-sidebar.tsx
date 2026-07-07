import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, User, Brain, BookOpen, Search, UserPlus, Send,
  MessagesSquare, Repeat, Sparkles, Calendar, Trophy, XCircle,
  BarChart3, Database, Plug, CreditCard, Bell, LogOut,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const groups = [
  {
    label: "Home",
    items: [{ title: "Dashboard", url: "/", icon: LayoutDashboard }],
  },
  {
    label: "Setup",
    items: [
      { title: "Profile", url: "/profile", icon: User },
      { title: "AI Sales Brain", url: "/brain", icon: Brain },
      { title: "Knowledge Base", url: "/knowledge", icon: BookOpen },
    ],
  },
  {
    label: "Discover",
    items: [
      { title: "Lead Discovery", url: "/discovery", icon: Search },
      { title: "Manual Leads", url: "/manual-leads", icon: UserPlus },
    ],
  },
  {
    label: "Engage",
    items: [
      { title: "Outreach", url: "/outreach", icon: Send },
      { title: "Conversations", url: "/conversations", icon: MessagesSquare },
      { title: "Follow-ups", url: "/followups", icon: Repeat },
    ],
  },
  {
    label: "Close",
    items: [
      { title: "Interested", url: "/interested", icon: Sparkles },
      { title: "Meetings", url: "/meetings", icon: Calendar },
      { title: "Warm Clients", url: "/won", icon: Trophy },
      { title: "Not Interested", url: "/not-interested", icon: XCircle },
    ],
  },
  {
    label: "Optimize",
    items: [
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "AI Memory", url: "/memory", icon: Database },
    ],
  },
  {
    label: "Settings",
    items: [
      { title: "Integrations", url: "/integrations", icon: Plug },
      { title: "Billing", url: "/billing", icon: CreditCard },
      { title: "Notifications", url: "/notifications", icon: Bell },
    ],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
      setUser({ email: data.user.email, full_name: p?.full_name ?? undefined });
    });
  }, []);
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-2.5 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-700 text-white shadow-sm">
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[14px] font-semibold tracking-tight">Outrix</span>
            <span className="text-[11px] text-muted-foreground">AI Sales Agent</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="px-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
              {g.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className="h-8.5 rounded-xl data-[active=true]:bg-white data-[active=true]:shadow-sm data-[active=true]:text-foreground"
                    >
                      <Link to={item.url} className="flex items-center gap-2.5">
                        <item.icon className="h-[16px] w-[16px]" strokeWidth={1.75} />
                        <span className="text-[13px] font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-white p-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-neutral-900 text-[11px] text-white">
              {(user?.full_name ?? user?.email ?? "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium">{user?.full_name ?? "Signed in"}</div>
            <div className="truncate text-[11px] text-muted-foreground">{user?.email}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground" title="Sign out">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
