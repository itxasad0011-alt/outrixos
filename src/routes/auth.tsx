import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const search = z.object({ next: z.string().optional() });

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — Relay" },
      { name: "description", content: "Sign in to Relay, your AI LinkedIn sales agent." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: next ?? "/" });
    });
  }, [navigate, next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: next ?? "/" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[oklch(0.985_0.003_260)] grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-700 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">Relay</div>
            <div className="text-[11px] text-muted-foreground">AI Sales Agent</div>
          </div>
        </div>
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <h1 className="text-[17px] font-semibold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-[12.5px] text-muted-foreground">
              {mode === "signin" ? "Sign in to your AI sales workspace." : "Start finding leads in minutes."}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-3">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Full name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-9 rounded-lg" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-[12px]">Email</Label>
                <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9 rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">Password</Label>
                <Input type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-9 rounded-lg" />
              </div>
              <Button type="submit" disabled={loading} className="h-9 w-full rounded-lg bg-[#2563EB] hover:bg-[#1d4fd0]">
                {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-4 w-full text-[12px] text-muted-foreground hover:text-foreground"
            >
              {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
