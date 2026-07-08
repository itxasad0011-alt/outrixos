import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const search = z.object({ next: z.string().optional() });

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — Outrix" },
      { name: "description", content: "Sign in or create your Outrix account to launch AI-powered LinkedIn outreach, book meetings, and keep your pipeline moving." },
      { property: "og:title", content: "Sign in — Outrix" },
      { property: "og:description", content: "Sign in or create your Outrix account to launch AI-powered LinkedIn outreach and manage your sales pipeline." },
    ],
  }),
  component: AuthPage,
});

function friendlyError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "Invalid login credentials.";
  if (m.includes("email not confirmed")) return "Please verify your email before signing in.";
  if (m.includes("user already registered") || m.includes("already been registered")) return "User already registered. Try signing in.";
  if (m.includes("password") && m.includes("6")) return "Password must be at least 6 characters.";
  if (m.includes("weak") && m.includes("password")) return "Please choose a stronger password.";
  if (m.includes("invalid email") || m.includes("unable to validate email")) return "Please enter a valid email address.";
  if (m.includes("user not found")) return "User not found.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a moment and try again.";
  if (m.includes("network") || m.includes("fetch")) return "Network error. Check your connection and try again.";
  return raw || "Something went wrong. Please try again.";
}

function authTimeout(): Promise<never> {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error("Network error: authentication request timed out.")), 20000);
  });
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    console.debug("[Auth] Session check started");
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      console.debug("[Auth] Session check completed", { hasSession: Boolean(data.session) });
      if (data.session) navigate({ to: next ?? "/" });
      else setChecking(false);
    }).catch((error) => {
      console.error("[Auth] Session check failed", error);
      if (mounted) setChecking(false);
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.debug("[Auth] onAuthStateChange fired", { event, hasSession: Boolean(session) });
    });
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate, next]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return toast.error("Please enter your email.");
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    if (mode === "signup" && !fullName.trim()) return toast.error("Please enter your full name.");

    setLoading(true);
    try {
      if (mode === "signup") {
        console.debug("[Auth] Signup started", { email: trimmedEmail });
        console.debug("[Auth] Signup request sent");
        const { data, error } = await Promise.race([
          supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: {
              data: { full_name: fullName.trim() },
              emailRedirectTo: `${window.location.origin}/`,
            },
          }),
          authTimeout(),
        ]);
        console.debug("[Auth] Signup response received", { hasUser: Boolean(data.user), hasSession: Boolean(data.session), error: error?.message ?? null });
        if (error) throw error;
        // Supabase returns an empty identities array when the email already exists.
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          toast.error("An account with this email already exists. Try signing in.");
          setMode("signin");
          return;
        }
        if (!data.session) {
          toast.success("Check your inbox to confirm your email.");
          setMode("signin");
          return;
        }
        toast.success("Welcome to Outrix!");
        console.debug("[Auth] Session created", { userId: data.session.user.id });
        console.debug("[Auth] Redirect started", { to: next ?? "/" });
        setLoading(false);
        await navigate({ to: next ?? "/" });
        console.debug("[Auth] Redirect completed");
      } else {
        console.debug("[Auth] Login started", { email: trimmedEmail });
        console.debug("[Auth] Request sent", { endpoint: "/auth/v1/token", method: "POST" });
        const { data, error } = await Promise.race([
          supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          }),
          authTimeout(),
        ]);
        console.debug("[Auth] Response received", { hasUser: Boolean(data.user), hasSession: Boolean(data.session), error: error?.message ?? null });
        if (error) throw error;
        if (!data.session) throw new Error("Please verify your email before signing in.");
        const { data: storedSession, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!storedSession.session) throw new Error("Session was created but could not be saved. Please try again.");
        console.debug("[Auth] Session created", { userId: data.session.user.id, saved: true });
        console.debug("[Auth] Redirect started", { to: next ?? "/" });
        setLoading(false);
        await navigate({ to: next ?? "/" });
        console.debug("[Auth] Redirect completed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      console.error("[Auth] Error received", { message: msg, error: err });
      toast.error(friendlyError(msg));
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="grid min-h-screen w-full place-items-center bg-[oklch(0.985_0.003_260)]">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[oklch(0.985_0.003_260)] grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-700 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold tracking-tight">Outrix</div>
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
            <form onSubmit={onSubmit} className="space-y-3" noValidate>
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label className="text-[12px]">Full name</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    disabled={loading}
                    required
                    className="h-9 rounded-lg"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-[12px]">Email</Label>
                <Input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">Password</Label>
                <Input
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  minLength={6}
                  className="h-9 rounded-lg"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="h-9 w-full rounded-lg bg-[#0A0A0A] hover:bg-[#262626]"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {mode === "signin" ? "Signing in…" : "Creating account…"}
                  </span>
                ) : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <button
              type="button"
              disabled={loading}
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-4 w-full text-[12px] text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
