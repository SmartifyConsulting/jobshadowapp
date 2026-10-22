import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
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
        </div>
      </section>
    </SiteLayout>
  );
}
