import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Calendar, Building2 } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { useApplications } from "@/lib/applications";
import { STATUSES } from "@/lib/data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My applications — JobShadow" },
      { name: "description", content: "Track your job shadow applications from submission to completion." },
      { property: "og:title", content: "My applications — JobShadow" },
      { property: "og:description", content: "Track your job shadow application status." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const apps = useApplications();
  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-semibold">My applications</h1>
            <p className="mt-2 text-muted-foreground">Follow each shadow request from submission to your big day.</p>
          </div>
          <Link to="/apply" className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-foreground">New application</Link>
        </div>
        <div className="mt-10 space-y-6">
          {apps.map((a) => {
            const idx = STATUSES.indexOf(a.status);
            return (
              <article key={a.id} className="rounded-2xl bg-card p-6 ring-1 ring-border">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{a.id} · submitted {a.createdAt}</p>
                    <h2 className="mt-1 font-display text-2xl font-semibold">{a.shadow.role}</h2>
                    <p className="text-sm text-muted-foreground">{a.shadow.format} · {a.scholar.fullName}</p>
                  </div>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{a.status}</span>
                </div>
                <ol className="mt-6 grid grid-cols-5 gap-1">
                  {STATUSES.map((s, i) => (
                    <li key={s} className="flex flex-col items-center text-center">
                      <div className="flex w-full items-center">
                        <div className={`h-1 flex-1 ${i === 0 ? "invisible" : i <= idx ? "bg-primary" : "bg-muted"}`} />
                        <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${i <= idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"} ${i === idx ? "ring-4 ring-primary/25" : ""}`}>
                          {i < idx ? <Check className="h-4 w-4" /> : i + 1}
                        </div>
                        <div className={`h-1 flex-1 ${i === STATUSES.length - 1 ? "invisible" : i < idx ? "bg-primary" : "bg-muted"}`} />
                      </div>
                      <span className={`mt-2 text-[11px] sm:text-xs ${i <= idx ? "font-semibold" : "text-muted-foreground"}`}>{s}</span>
                    </li>
                  ))}
                </ol>
                {(a.host || a.date) && (
                  <div className="mt-6 flex flex-wrap gap-6 rounded-xl bg-muted/60 p-4 text-sm">
                    {a.host && <span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" />{a.host}</span>}
                    {a.date && <span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />{a.date}</span>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </SiteLayout>
  );
}
