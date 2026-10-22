import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password | JobShadow" },
      { name: "description", content: "Choose a new JobShadow password." },
      { property: "og:title", content: "Set new password | JobShadow" },
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
      <PageHero title="Set new password" />
      <section className="mx-auto max-w-md px-5 py-12">
        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-6">
          <Label htmlFor="pw">New password</Label>
          <PasswordInput id="pw" required value={pw} onChange={(e) => setPw(e.target.value)} />
          {msg && <p aria-live="polite" className="text-sm text-destructive">{msg}</p>}
          <Button type="submit" className="w-full">Save password</Button>
        </form>
      </section>
    </SiteLayout>
  );
}
