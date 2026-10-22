import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { CONTACT_EMAIL } from "@/lib/data";

const TYPES = { sponsor: "Sponsor a learner", host: "Host inquiry", school: "School partnership", general: "General question" } as const;
type T = keyof typeof TYPES;

export const Route = createFileRoute("/contact")({
  validateSearch: (s: Record<string, unknown>): { type?: T | undefined } => ({ type: (s["type"] as string) in TYPES ? (s["type"] as T) : undefined }),
  head: () => ({
    meta: [
      { title: "Contact JobShadow — Sponsor, host or partner" },
      { name: "description", content: "Get in touch to sponsor a learner, host scholars or partner your school." },
      { property: "og:title", content: "Contact JobShadow" },
      { property: "og:description", content: "Sponsor, host or partner with JobShadow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  organisation: z.string().trim().max(150),
  message: z.string().trim().min(10, "Tell us a little more (10+ characters)").max(1000),
});

function Contact() {
  const { type: initial } = Route.useSearch();
  const [type, setType] = useState<T>(initial ?? "general");
  const [form, setForm] = useState({ name: "", email: "", organisation: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    const d = r.data;
    const body = `Name: ${d.name}\nEmail: ${d.email}\n${type === "school" ? "School" : "Company"}: ${d.organisation || "-"}\n\n${d.message}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${TYPES[type]} – ${d.name}`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const field = (k: keyof typeof form, label: string, area = false) => (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {area ? (
        <textarea rows={5} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
      ) : (
        <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring" />
      )}
      {errors[k] && <span className="mt-1 block text-xs text-destructive">{errors[k]}</span>}
    </label>
  );

  return (
    <SiteLayout>
      <PageHero title="Contact Us" />
      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-14 md:grid-cols-[1fr_1.3fr]">
        <div className="space-y-4">
          <p>If you are a school and want to include job shadow as <strong>part of your life orientation program</strong></p>
          <p>if you are a company who would like to be <strong>a part of our hosting</strong> program</p>
          <p>if you are a company who would like to <strong>sponsor learners</strong> as part of your CSI Initiatives</p>
          <p className="pt-4 font-display text-2xl uppercase">If you just want to say hi <span className="text-primary">please contact us</span></p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="inline-block text-xl font-bold text-primary hover:underline">{CONTACT_EMAIL}</a>
        </div>
        <div className="rounded-2xl bg-card p-7 ring-1 ring-border">
          {sent ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <h2 className="mt-4 font-display text-2xl font-semibold">Almost done, {form.name.split(" ")[0]}!</h2>
              <p className="mt-2 text-muted-foreground">Your {TYPES[type].toLowerCase()} is ready in your email app — just press send. You can also email us directly at {CONTACT_EMAIL}.</p>
              <button onClick={() => { setSent(false); setForm({ name: "", email: "", organisation: "", message: "" }); }} className="mt-6 text-sm font-semibold text-primary">Send another</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TYPES) as T[]).map((t) => (
                  <button type="button" key={t} onClick={() => setType(t)} className={`rounded-full px-4 py-1.5 text-sm transition ${type === t ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>{TYPES[t]}</button>
                ))}
              </div>
              {field("name", "Your name")}
              {field("email", "Email")}
              {field("organisation", type === "school" ? "School name" : "Company / organisation (optional)")}
              {field("message", "Message", true)}
              <button className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground shadow-warm">Send inquiry</button>
            </form>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
