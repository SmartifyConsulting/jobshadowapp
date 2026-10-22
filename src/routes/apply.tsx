import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Check, ArrowLeft, ArrowRight, PartyPopper, Users, MonitorSmartphone } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { PROVINCES, ROLES } from "@/lib/data";
import { saveApplication, type Application } from "@/lib/applications";

export const Route = createFileRoute("/apply")({
  validateSearch: (s: Record<string, unknown>) => ({ role: typeof s.role === "string" ? s.role : undefined }),
  head: () => ({
    meta: [
      { title: "Apply to job shadow — JobShadow" },
      { name: "description", content: "Register as a scholar and apply to shadow a professional in five simple steps." },
      { property: "og:title", content: "Apply to job shadow — JobShadow" },
      { property: "og:description", content: "Five-step scholar registration and shadow application." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Apply,
});

const STEPS = ["Scholar", "Guardian", "Career", "Motivation", "Review"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const phone = z.string().trim().regex(/^[0-9 +()-]{9,15}$/, "Enter a valid phone number");

const schemas = [
  z.object({
    fullName: z.string().trim().min(2, "Enter full name").max(100),
    email: z.string().trim().email("Enter a valid email").max(255),
    phone,
    grade: z.string().min(1, "Choose a grade"),
    school: z.string().trim().min(2, "Enter your school").max(150),
    city: z.string().trim().min(2, "Enter your city").max(80),
    province: z.string().min(1, "Choose a province"),
  }),
  z.object({
    name: z.string().trim().min(2, "Enter guardian name").max(100),
    email: z.string().trim().email("Enter a valid email").max(255),
    phone,
    relationship: z.string().min(1, "Choose relationship"),
    emergencyName: z.string().trim().min(2, "Enter emergency contact").max(100),
    emergencyPhone: phone,
    consent: z.literal(true, { errorMap: () => ({ message: "Guardian consent is required" }) }),
  }),
  z.object({
    role: z.string().min(1, "Choose a career"),
    format: z.enum(["In-person full-day", "1-hour digital interview"]),
    months: z.array(z.string()).min(1, "Pick at least one month"),
  }),
  z.object({
    why: z.string().trim().min(30, "Please write at least 30 characters").max(1000),
    questions: z.string().trim().min(10, "Add at least one question").max(1000),
  }),
];

const input = "mt-1 w-full rounded-xl border border-input bg-background px-4 py-3 outline-none transition focus:ring-2 focus:ring-ring";

function Apply() {
  const { role } = Route.useSearch();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [scholar, setScholar] = useState({ fullName: "", email: "", phone: "", grade: "", school: "", city: "", province: "" });
  const [guardian, setGuardian] = useState({ name: "", email: "", phone: "", relationship: "", emergencyName: "", emergencyPhone: "", consent: false });
  const [shadow, setShadow] = useState<Application["shadow"]>({ role: role ?? "", format: "In-person full-day", months: [] });
  const [motivation, setMotivation] = useState({ why: "", questions: "" });

  const data = [scholar, guardian, shadow, motivation];

  const next = () => {
    if (step < 4) {
      const r = schemas[step].safeParse(data[step]);
      if (!r.success) {
        setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
        return;
      }
    }
    setErrors({});
    if (step === 4) {
      const id = `JS-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
      saveApplication({ id, createdAt: new Date().toISOString().slice(0, 10), status: "Submitted", scholar, guardian, shadow, motivation });
      setDone(id);
      return;
    }
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const err = (k: string) => errors[k] && <span className="mt-1 block text-xs text-destructive">{errors[k]}</span>;

  if (done) {
    return (
      <SiteLayout>
        <section className="mx-auto max-w-xl px-5 py-24 text-center">
          <PartyPopper className="mx-auto h-14 w-14 text-primary" />
          <h1 className="mt-5 font-display text-4xl font-semibold">Application submitted!</h1>
          <p className="mt-3 text-muted-foreground">Reference <strong>{done}</strong>. We've sent a copy to {scholar.email} and a consent confirmation to {guardian.email}.</p>
          <Link to="/dashboard" className="mt-8 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">Track my application</Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-4xl font-semibold">Apply to shadow</h1>
        <p className="mt-2 text-muted-foreground">One scholar per application · takes about 8 minutes.</p>

        <ol className="mt-8 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2">
              <button onClick={() => i < step && setStep(i)} disabled={i > step} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold transition ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground ring-4 ring-primary/25" : "bg-muted text-muted-foreground"}`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </button>
              <span className={`hidden text-sm sm:inline ${i === step ? "font-semibold" : "text-muted-foreground"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? "bg-primary" : "bg-muted"}`} />}
            </li>
          ))}
        </ol>

        <div className="mt-8 rounded-2xl bg-card p-6 ring-1 ring-border md:p-8">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <h2 className="font-display text-2xl font-semibold sm:col-span-2">About you</h2>
              <label className="sm:col-span-2"><span className="text-sm font-medium">Full name</span><input className={input} value={scholar.fullName} onChange={(e) => setScholar({ ...scholar, fullName: e.target.value })} />{err("fullName")}</label>
              <label><span className="text-sm font-medium">Email</span><input type="email" className={input} value={scholar.email} onChange={(e) => setScholar({ ...scholar, email: e.target.value })} />{err("email")}</label>
              <label><span className="text-sm font-medium">Cellphone</span><input className={input} placeholder="082 123 4567" value={scholar.phone} onChange={(e) => setScholar({ ...scholar, phone: e.target.value })} />{err("phone")}</label>
              <label><span className="text-sm font-medium">Grade</span>
                <select className={input} value={scholar.grade} onChange={(e) => setScholar({ ...scholar, grade: e.target.value })}>
                  <option value="">Select…</option>{["Grade 9", "Grade 10", "Grade 11", "Grade 12"].map((g) => <option key={g}>{g}</option>)}
                </select>{err("grade")}</label>
              <label><span className="text-sm font-medium">High school</span><input className={input} value={scholar.school} onChange={(e) => setScholar({ ...scholar, school: e.target.value })} />{err("school")}</label>
              <label><span className="text-sm font-medium">City / town</span><input className={input} value={scholar.city} onChange={(e) => setScholar({ ...scholar, city: e.target.value })} />{err("city")}</label>
              <label><span className="text-sm font-medium">Province</span>
                <select className={input} value={scholar.province} onChange={(e) => setScholar({ ...scholar, province: e.target.value })}>
                  <option value="">Select…</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}
                </select>{err("province")}</label>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <h2 className="font-display text-2xl font-semibold sm:col-span-2">Parent / guardian</h2>
              <label><span className="text-sm font-medium">Full name</span><input className={input} value={guardian.name} onChange={(e) => setGuardian({ ...guardian, name: e.target.value })} />{err("name")}</label>
              <label><span className="text-sm font-medium">Relationship</span>
                <select className={input} value={guardian.relationship} onChange={(e) => setGuardian({ ...guardian, relationship: e.target.value })}>
                  <option value="">Select…</option>{["Mother", "Father", "Legal guardian", "Grandparent", "Other"].map((g) => <option key={g}>{g}</option>)}
                </select>{err("relationship")}</label>
              <label><span className="text-sm font-medium">Email</span><input type="email" className={input} value={guardian.email} onChange={(e) => setGuardian({ ...guardian, email: e.target.value })} />{err("email")}</label>
              <label><span className="text-sm font-medium">Cellphone</span><input className={input} value={guardian.phone} onChange={(e) => setGuardian({ ...guardian, phone: e.target.value })} />{err("phone")}</label>
              <h3 className="mt-2 font-semibold sm:col-span-2">Emergency contact</h3>
              <label><span className="text-sm font-medium">Name</span><input className={input} value={guardian.emergencyName} onChange={(e) => setGuardian({ ...guardian, emergencyName: e.target.value })} />{err("emergencyName")}</label>
              <label><span className="text-sm font-medium">Phone</span><input className={input} value={guardian.emergencyPhone} onChange={(e) => setGuardian({ ...guardian, emergencyPhone: e.target.value })} />{err("emergencyPhone")}</label>
              <label className="flex items-start gap-3 rounded-xl bg-muted p-4 sm:col-span-2">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--primary)]" checked={guardian.consent} onChange={(e) => setGuardian({ ...guardian, consent: e.target.checked })} />
                <span className="text-sm">I am the parent or legal guardian of this scholar and consent to their participation in a supervised JobShadow placement, and to JobShadow processing their information under POPIA.</span>
              </label>
              <div className="sm:col-span-2">{err("consent")}</div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-display text-2xl font-semibold">Your career shadow</h2>
              <label className="block"><span className="text-sm font-medium">Career you'd like to shadow</span>
                <select className={input} value={shadow.role} onChange={(e) => setShadow({ ...shadow, role: e.target.value })}>
                  <option value="">Select…</option>
                  {ROLES.map((r) => <option key={r.slug} value={r.title}>{r.title} — {r.field}</option>)}
                </select>{err("role")}</label>
              <div>
                <span className="text-sm font-medium">Preferred format</span>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {([["In-person full-day", Users, "Spend a working day on-site with your host."], ["1-hour digital interview", MonitorSmartphone, "A video call — perfect if you're far from a city."]] as const).map(([f, Icon, d]) => (
                    <button type="button" key={f} onClick={() => setShadow({ ...shadow, format: f })} className={`rounded-xl border-2 p-4 text-left transition ${shadow.format === f ? "border-primary bg-accent/40" : "border-border hover:border-primary/50"}`}>
                      <Icon className="h-6 w-6 text-primary" />
                      <p className="mt-2 font-semibold">{f}</p>
                      <p className="text-sm text-muted-foreground">{d}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium">Preferred months</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MONTHS.map((m) => {
                    const on = shadow.months.includes(m);
                    return <button type="button" key={m} onClick={() => setShadow({ ...shadow, months: on ? shadow.months.filter((x) => x !== m) : [...shadow.months, m] })} className={`rounded-full px-3 py-1.5 text-sm transition ${on ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>{m.slice(0, 3)}</button>;
                  })}
                </div>
                {err("months")}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-semibold">Motivation</h2>
              <label className="block"><span className="text-sm font-medium">Why do you want to shadow this career?</span>
                <textarea rows={5} className={input} value={motivation.why} onChange={(e) => setMotivation({ ...motivation, why: e.target.value })} />
                <span className="text-xs text-muted-foreground">{motivation.why.length}/1000</span>{err("why")}</label>
              <label className="block"><span className="text-sm font-medium">Questions you'd like to ask your mentor</span>
                <textarea rows={4} className={input} placeholder="e.g. What subjects matter most? What surprised you about this job?" value={motivation.questions} onChange={(e) => setMotivation({ ...motivation, questions: e.target.value })} />{err("questions")}</label>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-display text-2xl font-semibold">Review & submit</h2>
              {[
                ["Scholar", [scholar.fullName, scholar.email, scholar.phone, `${scholar.grade} · ${scholar.school}`, `${scholar.city}, ${scholar.province}`], 0],
                ["Guardian", [`${guardian.name} (${guardian.relationship})`, guardian.email, guardian.phone, `Emergency: ${guardian.emergencyName} · ${guardian.emergencyPhone}`, "Consent given ✓"], 1],
                ["Career shadow", [shadow.role, shadow.format, shadow.months.join(", ")], 2],
                ["Motivation", [motivation.why, `Questions: ${motivation.questions}`], 3],
              ].map(([title, lines, s]) => (
                <div key={title as string} className="rounded-xl bg-muted/60 p-4">
                  <div className="flex justify-between"><p className="font-semibold">{title as string}</p><button onClick={() => setStep(s as number)} className="text-sm font-semibold text-primary">Edit</button></div>
                  {(lines as string[]).map((l) => <p key={l} className="text-sm text-muted-foreground">{l}</p>)}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <button onClick={() => setStep(step - 1)} disabled={step === 0} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-semibold transition hover:bg-muted disabled:opacity-0"><ArrowLeft className="h-4 w-4" />Back</button>
            <button onClick={next} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground shadow-warm transition hover:-translate-y-0.5">
              {step === 4 ? "Submit application" : "Continue"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
