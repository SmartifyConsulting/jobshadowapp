import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, BookOpen, MonitorSmartphone, Users } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { FIELDS, ROLES, type Field } from "@/lib/data";

export const Route = createFileRoute("/roles")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === "string" ? s.q : undefined }),
  head: () => ({
    meta: [
      { title: "Explore careers — JobShadow job roles library" },
      { name: "description", content: "Browse careers you can shadow, with the school subjects you need for each." },
      { property: "og:title", content: "Explore careers — JobShadow" },
      { property: "og:description", content: "Searchable library of careers and required school subjects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Roles,
});

function Roles() {
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial ?? "");
  const [field, setField] = useState<Field | "All">("All");
  const [format, setFormat] = useState<"Any" | "In-person" | "Digital">("Any");

  const list = useMemo(() => {
    const t = q.toLowerCase();
    return ROLES.filter((r) =>
      (field === "All" || r.field === field) &&
      (format === "Any" || r.formats.includes(format)) &&
      (!t || r.title.toLowerCase().includes(t) || r.summary.toLowerCase().includes(t) || r.subjects.join(" ").toLowerCase().includes(t)),
    );
  }, [q, field, format]);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-5 py-14">
        <h1 className="font-display text-5xl font-semibold">Explore careers</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Search by career, field or even a school subject — try “Life Sciences” or “Accounting”.</p>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl bg-card p-4 ring-1 ring-border md:flex-row md:items-center">
          <label className="flex flex-1 items-center gap-2 rounded-xl bg-muted px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search careers or subjects" className="w-full bg-transparent outline-none" />
          </label>
          <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)} className="rounded-xl bg-muted px-4 py-3">
            <option value="Any">Any format</option>
            <option value="In-person">In-person shadow</option>
            <option value="Digital">Digital interview</option>
          </select>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(["All", ...FIELDS] as const).map((f) => (
            <button key={f} onClick={() => setField(f)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${field === f ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>
              {f}
            </button>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">{list.length} role{list.length === 1 ? "" : "s"}</p>
        <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <article key={r.slug} className="flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-warm">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{r.field}</p>
              <h2 className="mt-1 font-display text-2xl font-semibold">{r.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{r.summary}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {r.subjects.map((s) => <span key={s} className="rounded-md bg-accent px-2 py-0.5 text-xs text-accent-foreground">{s}</span>)}
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground"><BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0" />{r.studyPath}</p>
              <p className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                {r.formats.includes("In-person") && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />Full-day</span>}
                {r.formats.includes("Digital") && <span className="flex items-center gap-1"><MonitorSmartphone className="h-3.5 w-3.5" />Digital</span>}
              </p>
              <Link to="/apply" search={{ role: r.title }} className="mt-5 rounded-full bg-secondary py-2 text-center text-sm font-semibold text-secondary-foreground transition hover:bg-primary hover:text-primary-foreground">
                Shadow this role
              </Link>
            </article>
          ))}
        </div>
        {list.length === 0 && <p className="mt-10 text-center text-muted-foreground">No roles match — try a different search.</p>}
      </section>
    </SiteLayout>
  );
}
