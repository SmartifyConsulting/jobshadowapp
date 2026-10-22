import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log in | JobShadow" },
      { name: "description", content: "Log in to your JobShadow account." },
      { property: "og:title", content: "Log in | JobShadow" },
      { property: "og:description", content: "Log in to your JobShadow account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState("");
  const [whereHear, setWhereHear] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg("Email or password is incorrect.");
      const { data: u } = await supabase.auth.getUser(); const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: u.user!.id, _role: "admin" }); navigate({ to: isAdmin ? "/admin" : "/my-account" });
    } else {
      if (password.length < 8) {
        setBusy(false);
        return setMsg("Password must be at least 8 characters.");
      }
      if (password !== confirm) {
        setBusy(false);
        return setMsg("The passwords do not match.");
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/my-account`, data: { name, where_hear: whereHear } },
      });
      setBusy(false);
      setMsg(error ? error.message : "Check your email to confirm your account, then log in.");
    }
  }

  return (
    <SiteLayout>
      <PageHero title={mode === "in" ? "Login" : "Register"} />
      <section className="mx-auto max-w-md px-5 py-12">
        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-6">
          {mode === "up" && (
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" required placeholder="NAME" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div>
            <Label htmlFor="email">E-Mail Address</Label>
            <Input id="email" type="email" required placeholder="EMAIL ADDRESS" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "in" && (
                <Link to="/forgot-password" tabIndex={-1} className="text-xs underline">
                  Forgot Your Password?
                </Link>
              )}
            </div>
            <PasswordInput id="password" required placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {mode === "up" && (
            <>
              <div>
                <Label htmlFor="confirm">Confirm Password</Label>
                <PasswordInput id="confirm" required placeholder="REPEAT PASSWORD" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="where">Where did you hear about Job Shadow?</Label>
                <Input id="where" placeholder="WHERE DID YOU HEAR ABOUT JOB SHADOW?" value={whereHear} onChange={(e) => setWhereHear(e.target.value)} />
              </div>
            </>
          )}
          {msg && <p aria-live="polite" className="text-sm text-muted-foreground">{msg}</p>}
          <Button type="submit" disabled={busy} className="w-full">
            {mode === "in" ? "Login" : "Register"}
          </Button>
          <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm underline">
            {mode === "in" ? "No account? Create one" : "Already have an account? Log in"}
          </button>
        </form>
      </section>
    </SiteLayout>
  );
}
