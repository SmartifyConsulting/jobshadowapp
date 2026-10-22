import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileDown, PlayCircle, ChevronDown, ArrowDown } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { YouTube } from "@/components/YouTube";
import { CONTACT_EMAIL, ROLES, ROLES_PDF } from "@/lib/data";

const BAND_COLORS = ["bg-cta text-cta-foreground", "bg-accent text-accent-foreground", "bg-teal text-primary-foreground", "bg-primary text-primary-foreground"];

export const Route = createFileRoute("/roles")({
  validateSearch: (s: Record<string, unknown>): { q?: string | undefined } => ({ q: typeof s["q"] === "string" ? (s["q"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Job Roles — See the job shadows you can book | Job Shadow" },
      { name: "description", content: "Browse every job role you can shadow, from Accountant to Veterinarian, across business, education, health, design, engineering, ICT and more." },
      { property: "og:title", content: "Job Roles — Job Shadow" },
      { property: "og:description", content: "Already have an idea of your dream career? See the job shadows you can book." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Roles,
});

function Roles() {
  const [open, setOpen] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof ROLES>();
    ROLES.forEach((r) => m.set(r.field, [...(m.get(r.field) ?? []), r]));
    return [...m.entries()];
  }, []);

  return (
    <SiteLayout>
      <div className="bg-cta text-cta-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <ChevronDown className="h-6 w-6" />
          <span className="font-display text-2xl uppercase">Job Roles</span>
        </div>
      </div>

      <section className="bg-teal px-5 pb-10 pt-12 text-center text-primary-foreground">
        <h2 className="font-display text-2xl md:text-3xl">Already have an idea of your dream career?</h2>
        <p className="font-display text-2xl md:text-3xl">See some of the job shadows you can book by downloading the pdf link below!</p>
        <a href={ROLES_PDF} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 bg-cta px-5 py-2.5 font-semibold text-cta-foreground">
          <FileDown className="h-4 w-4" /> Roles as at 19Mar2026 for School
        </a>
        <p className="mx-auto mt-5 max-w-2xl text-sm">If the role that you are looking for is not listed, please email <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold">{CONTACT_EMAIL}</a> so we can help you.</p>
        <ArrowDown className="mx-auto mt-6 h-8 w-8 text-cta" />
        <div className="mx-auto mt-6 max-w-2xl text-sm">
          <p>Need to easily identify your <strong>most suited career orientation</strong>, <strong>tertiary qualification</strong> and <strong>school subject requirements</strong> for this ideal career?</p>
          <p className="mt-3">Why not <strong>book a job shadow</strong> and get a <strong>10% discount on an online career guidance tool</strong>.</p>
          <p className="mt-3">This is an online self-evaluation process which is <strong>easily accessible</strong>, identifies your interests and skills to <strong>best match your personality type</strong>, with <strong>immediate feedback</strong> via a report card to your inbox the moment you are done!</p>
          <p className="mt-3">Please <strong>email</strong> <a href={`mailto:${CONTACT_EMAIL}?subject=Career%20Guidance%20Tool`} className="font-bold">{CONTACT_EMAIL}</a> if you are interested and we will send you a promo code and the link to access the <strong>Career Guidance Tool.</strong></p>
        </div>
      </section>

      {grouped.map(([f, roles], fi) => (
        <div key={f}>
          <div className={`${BAND_COLORS[fi % BAND_COLORS.length]} py-5 text-center`}>
            <h2 className="font-display text-2xl uppercase">{f}</h2>
          </div>
          <div className="grid divide-y divide-primary-foreground/10 bg-primary text-primary-foreground sm:grid-cols-2 sm:divide-y-0">
            {roles.map((r) => {
              const isOpen = open === r.slug;
              return (
                <div key={r.slug} className="border-b border-primary-foreground/10 sm:border-r sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(1):nth-child(odd)]:border-b-0">
                  <button onClick={() => setOpen(isOpen ? null : r.slug)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-primary-foreground/10" aria-expanded={isOpen}>
                    <span className="flex items-center gap-2 text-sm font-semibold">{r.title}{r.video && <PlayCircle className="h-4 w-4" aria-label="Has video" />}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="space-y-3 bg-primary-foreground/5 px-5 pb-5 text-sm">
                      {r.video && <div className="max-w-xl"><YouTube id={r.video} title={r.title} /></div>}
                      {r.summary.split("\n").map((p, i) => <p key={i}>{p}</p>)}
                      <Link to="/apply" search={{ role: r.title }} className="inline-block bg-cta px-5 py-2 font-semibold uppercase tracking-wider text-cta-foreground">Book this Job Shadow</Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </SiteLayout>
  );
}
