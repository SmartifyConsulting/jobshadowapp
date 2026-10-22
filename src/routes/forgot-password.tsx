import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password | JobShadow" },
      { name: "description", content: "Reset your JobShadow password." },
      { property: "og:title", content: "Forgot password | JobShadow" },
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
      <PageHero title="Forgot password" />
      <section className="mx-auto max-w-md px-5 py-12">
        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-6">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {sent && <p aria-live="polite" className="text-sm">If that email has an account, a reset link is on its way.</p>}
          <Button type="submit" className="w-full">Send reset link</Button>
        </form>
      </section>
    </SiteLayout>
  );
}
