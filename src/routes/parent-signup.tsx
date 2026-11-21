import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { PasswordInput } from "@/components/PasswordInput";
import { claimParentAccount } from "@/lib/parent-claim.functions";

export const Route = createFileRoute("/parent-signup")({
  head: () => ({
    meta: [
      { title: "Parent / Guardian Access | JobShadow" },
      { name: "description", content: "Set a password to access your scholar's JobShadow profile and sign their indemnity." },
    ],
  }),
  component: ParentSignupPage,
});

function ParentSignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await claimParentAccount({ data: { email, password } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      navigate({ to: "/parent" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 w-full border-b border-current/60 bg-transparent px-1 py-2 text-sm uppercase tracking-wide placeholder:text-current/70 outline-none focus:border-primary-foreground";

  return (
    <SiteLayout>
      <div className="bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="mx-auto max-w-7xl text-xl font-bold md:text-2xl">Parent / Guardian Access</h1>
        <p className="mx-auto mt-2 max-w-7xl text-sm">If your scholar has already added you as their parent/guardian email, just set a password below - no separate registration needed.</p>
      </div>
      <section className="bg-cta px-5 py-8 text-cta-foreground">
        <form onSubmit={submit} className="mx-auto max-w-7xl">
          <div className="grid max-w-md gap-4">
            <input type="email" required placeholder="Your email (as given to your scholar)" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            <PasswordInput required placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
          </div>
          {err && <p aria-live="polite" className="mt-3 text-sm">{err}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-5">
            <button type="submit" disabled={busy} className="bg-teal px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-teal-foreground disabled:opacity-50">{busy ? "Setting up…" : "Set password & continue"}</button>
            <Link to="/auth" className="text-sm font-bold uppercase tracking-wide underline">Already set a password? Sign in</Link>
          </div>
        </form>
      </section>
    </SiteLayout>
  );
}
