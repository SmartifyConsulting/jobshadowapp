import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, GraduationCap, Building2, HeartHandshake, School, Users, MonitorSmartphone } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { ROLES } from "@/lib/data";
import { STORIES } from "@/lib/content";
import headline from "@/assets/hero-headline.png.asset.json";
import arrow from "@/assets/yellow-arrow.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Job Shadow — Be sure about the career and life you choose" },
      { name: "description", content: "Job Shadow facilitates job shadowing for South African high school students: a day with a mentor, or a one-hour digital interview, before committing to study." },
      { property: "og:title", content: "Job Shadow — Be sure about the career and life you choose" },
      { property: "og:description", content: "Job shadowing for high school students, before committing to tertiary study." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const AUDIENCES = [
  { icon: GraduationCap, title: "Scholars", body: "Get to know a job face-to-face with a mentor, before committing to study for it." },
  { icon: HeartHandshake, title: "Parents", body: "Minimise changes of direction during tertiary studies — and the wasted time, money and frustration." },
  { icon: School, title: "Schools", body: "Endorse and fund job shadows so learners choose their profession with real insight." },
  { icon: Building2, title: "Hosts & mentors", body: "Open your doors for a day and show the next generation what your profession is really like." },
];

function Home() {
  return (
    <SiteLayout>
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-brand-deep [clip-path:polygon(4%_0,100%_38%,100%_100%,8%_100%)]" />
        <img src={arrow.url} alt="" aria-hidden width={326} height={1080} className="pointer-events-none absolute -bottom-4 right-[4%] hidden h-[110%] w-auto md:block" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 py-20 text-center md:py-28">
          <h1 className="sr-only">Be sure about the career and life you choose with Job Shadow.</h1>
          <img src={headline.url} alt="" width={1263} height={338} className="w-full max-w-4xl" />
          <Link to="/apply" className="mt-12 bg-cta px-9 py-4 text-lg font-semibold uppercase tracking-[0.2em] text-cta-foreground shadow-warm transition hover:-translate-y-0.5 hover:brightness-110">
            Book Job Shadow
          </Link>
          <Link to="/roles" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline">
            <Compass className="h-4 w-4" /> Explore job roles
          </Link>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="font-display text-xl uppercase text-primary">Giving the youth opportunity and guidance</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">Do they actually know what they are committing to for the rest of their career?</h2>
            <p className="mt-5 text-muted-foreground">
              Job Shadow is exactly what its name suggests, it is a company which facilitates <strong className="text-foreground">job shadowing for high school students.</strong> It allows Students and Parents the opportunity to be informed regarding a specific profession.
            </p>
            <Link to="/about" className="mt-6 inline-block font-semibold text-primary hover:underline">Read more about us →</Link>
          </div>
          <div className="grid gap-4">
            <div className="flex gap-4 rounded bg-card p-6 ring-1 ring-border">
              <Users className="h-8 w-8 shrink-0 text-primary" />
              <div><p className="font-display text-2xl">R350 <span className="font-sans text-sm text-muted-foreground">per Job Shadow</span></p><p className="text-sm text-muted-foreground">Spend a day at a company that specialises in your preferred field.</p></div>
            </div>
            <div className="flex gap-4 rounded bg-card p-6 ring-1 ring-border">
              <MonitorSmartphone className="h-8 w-8 shrink-0 text-teal" />
              <div><p className="font-display text-2xl">R200 <span className="font-sans text-sm text-muted-foreground">per Digital Interview</span></p><p className="text-sm text-muted-foreground">A remote, one-hour interview for an initial insight.</p></div>
            </div>
            <p className="rounded bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground">Bookings open from May to October every year.</p>
          </div>
        </div>
      </section>

      <section className="bg-muted py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-4xl uppercase">Who is Job Shadow for?</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="rounded border-t-4 border-primary bg-card p-6 transition hover:-translate-y-1 hover:shadow-warm">
                <a.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 text-xl font-bold">{a.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-4xl uppercase">Real stories</h2>
            <Link to="/real-stories" className="text-sm font-semibold text-primary hover:underline">More stories →</Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {STORIES.slice(0, 2).map((s) => (
              <figure key={s.img} className="overflow-hidden rounded bg-foreground text-background">
                <img src={s.img} alt="" width={827} height={322} loading="lazy" className="w-full" />
                <blockquote className="p-6 text-sm italic opacity-90">“{s.quote}”</blockquote>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-4xl uppercase">Popular job roles</h2>
            <Link to="/roles" className="text-sm font-semibold text-primary hover:underline">See all job roles →</Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.slice(0, 6).map((r) => (
              <Link key={r.slug} to="/roles" search={{ q: r.title }} className="group rounded border border-border p-5 transition hover:border-primary">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{r.field}</p>
                <p className="mt-1 text-xl font-bold group-hover:text-primary">{r.title}</p>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{r.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-accent py-14 text-accent-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 md:flex-row md:items-center">
          <h2 className="max-w-xl font-display text-3xl uppercase">Sponsor a learner and change a career path.</h2>
          <Link to="/contact" search={{ type: "sponsor" }} className="bg-primary px-6 py-3 font-semibold uppercase tracking-wider text-primary-foreground">Sponsor a learner</Link>
        </div>
      </section>
    </SiteLayout>
  );
}
