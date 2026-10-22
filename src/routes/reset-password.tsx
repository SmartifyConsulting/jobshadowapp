import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password | JobShadow" },
      { name: "description", content: "Choose a new JobShadow password." },
      { property: "og:title", content: "Reset Password | JobShadow" },
      { property: "og:description", content: "Choose a new JobShadow password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setMsg("Password must be at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setMsg("This link has expired. Please request a new one.");
    navigate({ to: "/admin" });
  }
  return (
    <SiteLayout>
      <div className="bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="mx-auto max-w-7xl text-xl font-bold md:text-2xl">Reset Password</h1>
      </div>
      <section className="bg-teal px-5 py-8 text-primary-foreground">
        <form onSubmit={submit} className="mx-auto flex max-w-7xl flex-col items-center text-center">
          <label className="w-full max-w-md text-left text-sm">
            New Password
            <input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1 w-full border-b border-primary-foreground/60 bg-transparent px-1 py-2 outline-none focus:border-primary-foreground" />
          </label>
          {msg && <p aria-live="polite" className="mt-3 max-w-md text-sm font-semibold">{msg}</p>}
          <button type="submit" className="mt-6 bg-cta px-6 py-3 text-sm font-bold uppercase tracking-wide text-cta-foreground">Save Password</button>
        </form>
      </section>
    </SiteLayout>
  );
}
