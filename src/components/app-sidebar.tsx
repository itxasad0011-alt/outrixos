import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Megaphone, Search, Kanban, Send, MessagesSquare,
  Calendar, Users2, BookOpen, Brain, BarChart3, Users, Settings, Sparkles,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const workspace = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Campaigns", url: "/campaigns", icon: Megaphone },
  { title: "Lead Discovery", url: "/discovery", icon: Search },
  { title: "Lead Queue", url: "/queue", icon: Kanban },
  { title: "Outreach", url: "/outreach", icon: Send },
  { title: "Conversations", url: "/conversations", icon: MessagesSquare },
  { title: "Meetings", url: "/meetings", icon: Calendar },
  { title: "CRM", url: "/crm", icon: Users2 },
];

const intelligence = [
  { title: "Knowledge Base", url: "/knowledge", icon: BookOpen },
  { title: "AI Sales Brain", url: "/brain", icon: Brain },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const admin = [
  { title: "Team", url: "/team", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  const renderGroup = (label: string, items: typeof workspace) => (
    <SidebarGroup>
      <SidebarGroupLabel className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.url)}
                className="h-9 rounded-xl data-[active=true]:bg-white data-[active=true]:shadow-sm data-[active=true]:text-foreground"
              >
                <Link to={item.url} className="flex items-center gap-2.5">
                  <item.icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
                  <span className="text-[13.5px] font-medium">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <div className="flex items-center gap-2.5 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-700 text-white shadow-sm">
            <Sparkles className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[14px] font-semibold tracking-tight">Relay</span>
            <span className="text-[11px] text-muted-foreground">AI Sales Agent</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {renderGroup("Workspace", workspace)}
        {renderGroup("Intelligence", intelligence)}
        {renderGroup("Admin", admin)}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-white p-2.5">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] text-white">AM</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium">Alex Morgan</div>
            <div className="truncate text-[11px] text-muted-foreground">Pro · Acme Studio</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
