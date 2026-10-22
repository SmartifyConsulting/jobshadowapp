import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMsg("Email or password is incorrect.");
    const { data: u } = await supabase.auth.getUser();
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: u.user!.id, _role: "admin" });
    navigate({ to: isAdmin ? "/admin" : "/my-account" });
  }

  const input = "mt-1 w-full border-b border-primary-foreground/60 bg-transparent px-1 py-2 text-sm uppercase tracking-wide placeholder:text-primary-foreground/70 outline-none focus:border-primary-foreground";

  return (
    <SiteLayout>
      <div className="bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="mx-auto max-w-7xl text-xl font-bold md:text-2xl">Please enter your credentials</h1>
      </div>
      <section className="bg-cta px-5 py-8 text-cta-foreground">
        <form onSubmit={submit} className="mx-auto max-w-7xl">
          <div className="grid max-w-md gap-4">
            <input type="email" required placeholder="EMAIL" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            <input type="password" required placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
          </label>
          {msg && <p aria-live="polite" className="mt-3 text-sm">{msg}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-5">
            <button type="submit" disabled={busy} className="bg-teal px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground">Sign In</button>
            <Link to="/forgot-password" className="text-sm font-bold uppercase tracking-wide underline">Forgot your password?</Link>
          </div>
          <Link to="/register" className="mt-4 block text-sm underline">No account? Register here.</Link>
        </form>
      </section>
    </SiteLayout>
  );
}
