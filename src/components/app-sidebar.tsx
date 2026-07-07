import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, User, Brain, BookOpen, Search, UserPlus, Send,
  MessagesSquare, Repeat, Sparkles, Calendar, Trophy, XCircle,
  BarChart3, Database, Plug, CreditCard, Bell, LogOut, Settings, Keyboard, LifeBuoy, ChevronsUpDown,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <Sidebar collapsible="icon" className="border-r border-border/60 overflow-hidden transition-[width] duration-300 ease-out">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-2.5 px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-700 text-white shadow-sm">
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="flex min-w-0 flex-col leading-tight overflow-hidden whitespace-nowrap transition-[opacity,width,margin] duration-200 ease-out group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:ml-0">
            <span className="text-[14px] font-semibold tracking-tight truncate">Outrix</span>
            <span className="text-[11px] text-muted-foreground truncate">AI Sales Agent</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-0 overflow-x-hidden">
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="px-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 overflow-hidden whitespace-nowrap transition-[opacity,height,margin,padding] duration-200 ease-out group-data-[collapsible=icon]:h-0 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:my-0 group-data-[collapsible=icon]:py-0">
              {g.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className="h-8.5 rounded-xl data-[active=true]:bg-white data-[active=true]:shadow-sm data-[active=true]:text-foreground group-data-[collapsible=icon]:justify-center"
                    >
                      <Link to={item.url} className="flex items-center gap-2.5">
                        <item.icon className="h-[16px] w-[16px] shrink-0" strokeWidth={1.75} />
                        <span className="text-[13px] font-medium truncate transition-opacity duration-200 group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="group/acct flex w-full items-center gap-2.5 rounded-2xl border border-border/70 bg-white p-2.5 text-left transition-all hover:bg-neutral-50 hover:shadow-sm active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:hover:bg-transparent"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-neutral-900 text-[11px] text-white">
                  {(user?.full_name ?? user?.email ?? "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-[opacity,width] duration-200 ease-out group-data-[collapsible=icon]:hidden">
                <div className="truncate text-[12.5px] font-medium">{user?.full_name ?? "Signed in"}</div>
                <div className="truncate text-[11px] text-muted-foreground">{user?.email}</div>
              </div>
              <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/acct:opacity-100 group-data-[collapsible=icon]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-64 rounded-2xl border-border/70 p-1.5 shadow-xl"
          >
            <DropdownMenuLabel className="px-2 py-2">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-neutral-900 text-[11px] text-white">
                    {(user?.full_name ?? user?.email ?? "?").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{user?.full_name ?? "Signed in"}</div>
                  <div className="truncate text-[11.5px] font-normal text-muted-foreground">{user?.email}</div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="rounded-lg text-[13px]">
              <Link to="/profile"><User className="mr-2 h-4 w-4" /> My Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg text-[13px]">
              <Link to="/integrations"><Settings className="mr-2 h-4 w-4" /> Workspace Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg text-[13px]">
              <Link to="/billing"><CreditCard className="mr-2 h-4 w-4" /> Subscription & Billing</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg text-[13px]">
              <Link to="/notifications"><Bell className="mr-2 h-4 w-4" /> Notifications</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="rounded-lg text-[13px]" onSelect={(e) => e.preventDefault()}>
              <Keyboard className="mr-2 h-4 w-4" /> Keyboard Shortcuts
              <span className="ml-auto text-[10.5px] text-muted-foreground">⌘/</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg text-[13px]" onSelect={() => window.open("mailto:support@outrix.ai", "_blank")}>
              <LifeBuoy className="mr-2 h-4 w-4" /> Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut} className="rounded-lg text-[13px] text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
