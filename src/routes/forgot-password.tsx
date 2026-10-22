import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password | JobShadow" },
      { name: "description", content: "Reset your JobShadow password." },
      { property: "og:title", content: "Reset Password | JobShadow" },
      { property: "og:description", content: "Reset your JobShadow password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setSent(true);
  }
  return (
    <SiteLayout>
      <div className="bg-primary px-5 py-6 text-primary-foreground">
        <h1 className="mx-auto max-w-7xl text-xl font-bold md:text-2xl">Reset Password</h1>
      </div>
      <section className="bg-teal px-5 py-8 text-primary-foreground">
        <form onSubmit={submit} className="mx-auto flex max-w-7xl flex-col items-center text-center">
          <label className="w-full max-w-md text-left text-sm">
            E-Mail Address
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border-b border-primary-foreground/60 bg-transparent px-1 py-2 outline-none focus:border-primary-foreground" />
          </label>
          {sent && <p aria-live="polite" className="mt-3 max-w-md text-sm">If that email has an account, a reset link is on its way.</p>}
          <button type="submit" className="mt-6 bg-cta px-6 py-3 text-sm font-bold uppercase tracking-wide text-cta-foreground">Send Password Reset Link</button>
        </form>
      </section>
    </SiteLayout>
  );
}
