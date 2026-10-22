import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, FileDown, Mail, PlayCircle, ChevronDown } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { YouTube } from "@/components/YouTube";
import { CONTACT_EMAIL, FIELDS, ROLES, ROLES_PDF } from "@/lib/data";

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
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial ?? "");
  const [field, setField] = useState("All");
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const t = q.toLowerCase();
    return ROLES.filter((r) => (field === "All" || r.field === field) && (!t || r.title.toLowerCase().includes(t) || r.summary.toLowerCase().includes(t)));
  }, [q, field]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof list>();
    list.forEach((r) => m.set(r.field, [...(m.get(r.field) ?? []), r]));
    return [...m.entries()];
  }, [list]);

  return (
    <SiteLayout>
      <PageHero title="Job Roles" sub="Already have an idea of your dream career? See some of the job shadows you can book." />

      <section className="mx-auto grid max-w-6xl gap-5 px-5 pt-12 md:grid-cols-2">
        <div className="rounded border-t-4 border-primary bg-card p-6 ring-1 ring-border">
          <a href={ROLES_PDF} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-cta px-5 py-2.5 font-semibold text-cta-foreground">
            <FileDown className="h-4 w-4" /> Roles as at 19 March 2026 for School
          </a>
          <p className="mt-4 text-sm">If the role that you are looking for is not listed, please email <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-primary">{CONTACT_EMAIL}</a> so we can help you.</p>
        </div>
        <div className="rounded border-t-4 border-accent bg-card p-6 text-sm ring-1 ring-border">
          <p>Need to easily identify your <strong>most suited career orientation</strong>, <strong>tertiary qualification</strong> and <strong>school subject requirements</strong> for this ideal career?</p>
          <p className="mt-2">Why not <Link to="/apply" className="font-bold text-primary">book a job shadow</Link> and get a <strong>10% discount on an online career guidance tool</strong>.</p>
          <p className="mt-2 text-muted-foreground">This is an online self-evaluation process which is <strong>easily accessible</strong>, identifies your interests and skills to <strong>best match your personality type</strong>, with <strong>immediate feedback</strong> via a report card to your inbox the moment you are done!</p>
          <p className="mt-2">Please <strong>email</strong> <a href={`mailto:${CONTACT_EMAIL}?subject=Career%20Guidance%20Tool`} className="font-bold text-primary">{CONTACT_EMAIL}</a> if you are interested and we will send you a promo code and the link to access the <strong>Career Guidance Tool.</strong></p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <label className="flex items-center gap-2 rounded bg-card px-4 py-3 ring-1 ring-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search job roles" className="w-full bg-transparent outline-none" />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {["All", ...FIELDS].map((f) => (
            <button key={f} onClick={() => setField(f)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${field === f ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>{f}</button>
          ))}
        </div>
        <p className="mt-5 text-sm text-muted-foreground">{list.length} role{list.length === 1 ? "" : "s"}</p>

        {grouped.map(([f, roles]) => (
          <div key={f} className="mt-8">
            <h2 className="font-display text-3xl uppercase text-primary">{f}</h2>
            <div className="mt-4 divide-y divide-border rounded bg-card ring-1 ring-border">
              {roles.map((r) => {
                const isOpen = open === r.slug;
                return (
                  <div key={r.slug}>
                    <button onClick={() => setOpen(isOpen ? null : r.slug)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted" aria-expanded={isOpen}>
                      <span className="flex items-center gap-2 font-bold">{r.title}{r.video && <PlayCircle className="h-4 w-4 text-primary" aria-label="Has video" />}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="space-y-3 px-5 pb-5 text-sm text-muted-foreground">
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
        {list.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">No roles match. Email <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-primary">{CONTACT_EMAIL}</a> and we'll help you.</p>
        )}
      </section>
    </SiteLayout>
  );
}
