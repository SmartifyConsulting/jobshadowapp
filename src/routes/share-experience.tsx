import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { SiteLayout, useSiteSession } from "@/components/SiteLayout";
import { CONTACT_EMAIL } from "@/lib/data";

export const Route = createFileRoute("/share-experience")({
  head: () => ({
    meta: [
      { title: "Share your experience — Job Shadow" },
      { name: "description", content: "Tell us about your Job Shadow day. Your story helps other scholars choose their career." },
      { property: "og:title", content: "Share your experience — Job Shadow" },
      { property: "og:description", content: "Tell us about your Job Shadow day." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShareExperience,
});

function ShareExperience() {
  const { data: session } = useSiteSession();
  const signedInEmail = session?.user?.email ?? null;
  const signedInName = session?.displayName ?? null;
  const [f, setF] = useState({ name: "", email: "", career: "", story: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const schema = z.object({
    name: z.string().trim().min(1, "Please enter your name").max(150),
    email: z.string().trim().email("Enter a valid email").max(255),
    career: z.string().trim().max(150).optional(),
    story: z.string().trim().min(10, "Please tell us a little more").max(2000),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse({ ...f, name: signedInName || f.name, email: signedInEmail ?? f.email });
    if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
    setErrors({});
    const body = [`Name: ${r.data.name}`, `Email: ${r.data.email}`, `Career shadowed: ${r.data.career || "-"}`, "", r.data.story].join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`My Job Shadow experience — ${r.data.name}`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const input = "mt-1 w-full border-b border-current/40 bg-transparent px-1 py-2 text-sm outline-none focus:border-primary-foreground";
  const err = (k: string) => errors[k] && <span className="mt-1 block text-xs text-accent">{errors[k]}</span>;
  const label = "text-xs uppercase tracking-wide opacity-80";

  return (
    <SiteLayout>
      <section className="flex-1 bg-primary px-5 py-14 text-primary-foreground">
        <div className="mx-auto grid max-w-6xl items-start gap-10 md:grid-cols-2">
          <div>
            <h1 className="font-display text-3xl uppercase leading-tight md:text-4xl">Share your experience with us</h1>
            <p className="mt-4 text-sm text-primary-foreground/80">Did a Job Shadow help you decide on your career? Tell us about your day — your story helps other scholars choose with confidence.</p>
          </div>
          <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 p-6">
            <h2 className="font-display text-2xl uppercase">Your Story</h2>
            {sent ? (
              <p className="mt-6 text-sm">Thank you! Your email app should now be open with your story ready to send.</p>
            ) : (
              <form onSubmit={submit} className="mt-6 grid gap-4">
                {!signedInName && <label><span className={label}>Your name</span><input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />{err("name")}</label>}
                {!signedInEmail && <label><span className={label}>Your email</span><input type="email" className={input} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />{err("email")}</label>}
                <label><span className={label}>Career you shadowed (optional)</span><input className={input} value={f.career} onChange={(e) => setF({ ...f, career: e.target.value })} /></label>
                <label><span className={label}>Your experience</span><textarea rows={6} className={input} value={f.story} onChange={(e) => setF({ ...f, story: e.target.value })} />{err("story")}</label>
                <button className="mt-2 justify-self-start rounded-full bg-cta px-6 py-3 text-sm font-bold uppercase tracking-wide text-cta-foreground">Send</button>
              </form>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
