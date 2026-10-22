import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Sign-Up / Register | JobShadow" },
      { name: "description", content: "Create your JobShadow account." },
      { property: "og:title", content: "Sign-Up / Register | JobShadow" },
      { property: "og:description", content: "Create your JobShadow account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [whereHear, setWhereHear] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) return setMsg("Password must be at least 8 characters.");
    if (password !== confirm) return setMsg("The passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/my-account`, data: { name, where_hear: whereHear } },
    });
    setBusy(false);
    setMsg(error ? error.message : "Check your email to confirm your account, then log in.");
  }

  const input = "mt-1 w-full border-b border-primary-foreground/60 bg-transparent px-1 py-2 text-sm uppercase tracking-wide placeholder:text-primary-foreground/70 outline-none focus:border-primary-foreground";

  return (
    <SiteLayout>
      <div className="bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="mx-auto max-w-7xl text-xl font-bold md:text-2xl">Sign-Up / Register</h1>
        <p className="mx-auto mt-2 max-w-7xl text-sm">Complete all the steps starting with signing in. You are moments away from getting a job shadow!</p>
        <p className="mx-auto mt-3 max-w-7xl text-sm font-bold">NOTE: no more than one scholar per registration.</p>
      </div>
      <section className="bg-teal px-5 py-8 text-primary-foreground">
        <form onSubmit={submit} className="mx-auto max-w-7xl">
          <div className="grid gap-4 sm:grid-cols-2">
            <input required placeholder="NAME" value={name} onChange={(e) => setName(e.target.value)} className={input} />
            <input type="email" required placeholder="EMAIL ADDRESS" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
            <input type="password" required placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
            <input type="password" required placeholder="REPEAT PASSWORD" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
            <input placeholder="WHERE DID YOU HEAR ABOUT JOB SHADOW?" value={whereHear} onChange={(e) => setWhereHear(e.target.value)} className={`${input} sm:col-span-2 sm:max-w-md`} />
          </div>
          {msg && <p aria-live="polite" className="mt-4 max-w-md text-sm">{msg}</p>}
          <button type="submit" disabled={busy} className="mt-6 bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground">Register</button>
          <Link to="/auth" className="mt-4 block text-sm underline">Already have an account? Log in</Link>
        </form>
      </section>
    </SiteLayout>
  );
}
