import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
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

const ORG_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Job Shadow",
  url: "https://jobshadow.co.za",
  logo: "https://jobshadow.co.za/assets/jobshadow-logo-square.svg",
  email: "info@jobshadow.co.za",
  description: "Job Shadow facilitates job shadowing for South African high school students.",
  areaServed: "ZA",
  sameAs: ["https://www.facebook.com/JobShadowBookings", "https://www.instagram.com/jobshadowbookings"],
});

function Home() {
  return (
    <SiteLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ORG_JSON_LD }} />
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-brand-deep [clip-path:polygon(4%_0,100%_38%,100%_100%,8%_100%)]" />
        <img src={arrow.url} alt="" aria-hidden width={326} height={1080} className="pointer-events-none absolute -bottom-4 right-[4%] hidden h-[110%] w-auto md:block" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 py-20 text-center md:py-28">
          <h1 className="max-w-4xl font-display text-[clamp(2.75rem,6vw,5.5rem)] uppercase leading-[1.05]">
            Be sure about the career and life you choose
            <span className="mt-4 block text-[0.8em] text-accent">with Job Shadow.</span>
          </h1>
          <Link to="/auth" className="mt-12 bg-cta px-9 py-4 text-lg font-semibold uppercase tracking-[0.2em] text-cta-foreground shadow-warm transition hover:-translate-y-0.5 hover:brightness-110">
            Book Job Shadow
          </Link>
        </div>
      </section>
    </SiteLayout>
  );
}
