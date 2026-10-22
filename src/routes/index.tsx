import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, GraduationCap, Building2, HeartHandshake, School } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { ROLES } from "@/lib/data";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JobShadow — Try a career before you study it" },
      { name: "description", content: "JobShadow connects South African high school scholars with professionals for real job shadowing days and digital interviews." },
      { property: "og:title", content: "JobShadow — Try a career before you study it" },
      { property: "og:description", content: "Real job shadowing for South African high school scholars." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const AUDIENCES = [
  { icon: GraduationCap, title: "Scholars", body: "Spend a day with a real accountant, engineer or doctor. Ask the questions a brochure can't answer." },
  { icon: HeartHandshake, title: "Parents", body: "Invest in clarity before you invest in fees. Safe, supervised, consent-first placements." },
  { icon: School, title: "Schools", body: "Give your Grade 9–12 learners structured career exposure that supports subject choice and LO." },
  { icon: Building2, title: "Hosts & mentors", body: "Inspire the next generation in a single day — and build your future talent pipeline." },
];

function Home() {
  return (
    <SiteLayout>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">For Grade 9–12 scholars</span>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] md:text-6xl">
              Try a career <em className="text-primary">before</em> you study it.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              JobShadow places South African high school scholars alongside working professionals — for a full day in person, or a one-hour digital interview — so tertiary choices are made with eyes open.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/apply" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-warm transition hover:-translate-y-0.5">
                Start your application <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/roles" className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-6 py-3 font-semibold transition hover:bg-muted">
                <Compass className="h-4 w-4" /> Explore careers
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4">
              {[["3 200+", "scholars placed"], ["180", "host companies"], ["9", "provinces"]].map(([n, l]) => (
                <div key={l}><dt className="font-display text-3xl font-semibold">{n}</dt><dd className="text-xs text-muted-foreground">{l}</dd></div>
              ))}
            </dl>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -rotate-3 rounded-[2rem] bg-accent" />
            <img src={hero} alt="A high school scholar shadowing an engineer in an office" width={1200} height={1000} className="relative aspect-[6/5] w-full rounded-[2rem] object-cover shadow-warm" />
          </div>
        </div>
      </section>

      <section className="bg-muted/50 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-4xl font-semibold">Built for everyone in a scholar's corner</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:shadow-warm">
                <a.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-display text-xl font-semibold">{a.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{a.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="font-display text-4xl font-semibold">How it works</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {["Pick a career from our library", "Apply with your parent's consent", "We match you with a vetted host", "Shadow, ask questions, decide"].map((s, i) => (
              <li key={s} className="relative rounded-2xl bg-card p-6 ring-1 ring-border">
                <span className="font-display text-5xl font-semibold text-primary/30">0{i + 1}</span>
                <p className="mt-2 font-semibold">{s}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-4xl font-semibold">Popular roles</h2>
            <Link to="/roles" className="text-sm font-semibold text-primary hover:underline">See all {ROLES.length} →</Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.slice(0, 6).map((r) => (
              <Link key={r.slug} to="/roles" search={{ q: r.title }} className="group rounded-2xl border border-border p-5 transition hover:border-primary">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">{r.field}</p>
                <p className="mt-1 font-display text-xl font-semibold group-hover:text-primary">{r.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{r.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 md:flex-row md:items-center">
          <h2 className="max-w-xl font-display text-3xl font-semibold">Can't afford a placement? Companies sponsor learners every term.</h2>
          <Link to="/contact" search={{ type: "sponsor" }} className="rounded-full bg-background px-6 py-3 font-semibold text-foreground">Sponsor a learner</Link>
        </div>
      </section>
    </SiteLayout>
  );
}
