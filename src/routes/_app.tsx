import { Outlet, createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bell, Command, Sparkles, HelpCircle } from "lucide-react";

export const Route = createFileRoute("/_app")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", search: { next: window.location.pathname } });
        return;
      }
      setReady(true);
      const { data: p } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", data.session.user.id)
        .maybeSingle();
      setOnboardingComplete(!!p?.onboarding_complete);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/auth" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!ready) {
    return (
      <div className="grid min-h-screen w-full place-items-center bg-[oklch(0.985_0.003_260)]">
        <div className="text-[13px] text-muted-foreground">Loading workspace…</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[oklch(0.985_0.003_260)]">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-white/70 px-4 backdrop-blur-xl">
            <SidebarTrigger className="rounded-lg" />
            <div className="relative hidden max-w-sm flex-1 md:block">
              <Command className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leads, conversations…"
                className="h-9 rounded-xl border-border/70 bg-secondary/60 pl-9 text-[13px]"
              />
              <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center rounded-md border border-border/70 bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline-flex">⌘K</kbd>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" className="rounded-xl" title="Help">
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button asChild variant="ghost" size="icon" className="rounded-xl" title="Notifications">
                <Link to="/notifications"><Bell className="h-4 w-4" /></Link>
              </Button>
              {onboardingComplete === false && (
                <Button asChild size="sm" className="ml-1 h-9 rounded-xl bg-[#0A0A0A] px-3 text-[12.5px] font-medium text-white hover:bg-[#262626]">
                  <Link to="/profile">
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Setup Outrix
                  </Link>
                </Button>
              )}
            </div>
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
