import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";

const TYPES = { sponsor: "Sponsor a learner", host: "Host inquiry", school: "School partnership", general: "General question" } as const;
type T = keyof typeof TYPES;

export const Route = createFileRoute("/contact")({
  validateSearch: (s: Record<string, unknown>) => ({ type: (s.type as T) in TYPES ? (s.type as T) : undefined }),
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
      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-14 md:grid-cols-[1fr_1.3fr]">
        <div>
          <h1 className="font-display text-5xl font-semibold">Let's talk.</h1>
          <p className="mt-4 text-muted-foreground">Whether you want to sponsor a learner, host a scholar for a day, or bring JobShadow to your school, we'll get back to you within two working days.</p>
          <p className="mt-8 text-sm"><strong>Email</strong><br />hello@jobshadow.co.za</p>
        </div>
        <div className="rounded-2xl bg-card p-7 ring-1 ring-border">
          {sent ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
              <h2 className="mt-4 font-display text-2xl font-semibold">Thank you, {form.name.split(" ")[0]}!</h2>
              <p className="mt-2 text-muted-foreground">Your {TYPES[type].toLowerCase()} has been received.</p>
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
