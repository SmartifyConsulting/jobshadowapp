import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Partner with JobShadow — Schools, hosts & sponsors" },
      { name: "description", content: "Host scholars, partner as a school, or sponsor a learner's job shadow." },
      { property: "og:title", content: "Partner with JobShadow" },
      { property: "og:description", content: "Schools, host companies and sponsors shaping SA's future workforce." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Partners,
});

const BLOCKS = [
  { type: "host", title: "Host companies & mentors", points: ["One day or one hour of your time", "We vet, brief and prepare every scholar", "Build employer brand with future talent", "Counts toward B-BBEE skills development"], cta: "Become a host" },
  { type: "school", title: "Schools", points: ["Structured exposure for Grades 9–12", "Supports subject choice & Life Orientation", "Group bookings and term calendars", "Progress reports for counsellors"], cta: "Partner your school" },
  { type: "sponsor", title: "Sponsors", points: ["Fund placements for under-resourced learners", "Choose a province, school or field", "Impact report with every sponsorship", "Section 18A tax certificates"], cta: "Sponsor a learner" },
] as const;

function Partners() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-5 py-14">
        <h1 className="max-w-3xl font-display text-5xl font-semibold">Open your doors. Change a trajectory.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Too many South African students drop out of their first degree because it wasn't what they imagined. A single day of shadowing can fix that.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {BLOCKS.map((b) => (
            <div key={b.type} className="flex flex-col rounded-2xl bg-card p-7 ring-1 ring-border">
              <h2 className="font-display text-2xl font-semibold">{b.title}</h2>
              <ul className="mt-5 flex-1 space-y-3">
                {b.points.map((p) => <li key={p} className="flex gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-primary" />{p}</li>)}
              </ul>
              <Link to="/contact" search={{ type: b.type }} className="mt-7 rounded-full bg-primary py-2.5 text-center font-semibold text-primary-foreground">{b.cta}</Link>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
