import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Plus } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { FAQ_ITEMS } from "@/lib/faq";
import { publicSeo } from "@/lib/seo";

export const Route = createFileRoute("/faq")({
  head: () => ({
    links: publicSeo("/faq").links,
    meta: [
      ...publicSeo("/faq").meta,
      { title: "Job Shadowing FAQ | Scholars, Mentors, Companies & Schools" },
      {
        name: "description",
        content:
          "Answers about job shadowing, benefits, virtual opportunities, mentor onboarding, company participation, school sponsorship and CSI reporting.",
      },
      { property: "og:title", content: "Job Shadowing Frequently Asked Questions" },
      {
        property: "og:description",
        content:
          "Job shadowing guidance for scholars, tertiary students, mentors, companies and schools.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Faq,
});

function Faq() {
  return (
    <SiteLayout>
      <div className="bg-primary text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <ChevronDown className="h-6 w-6" aria-hidden />
          <h1 className="screen-heading font-display text-2xl">Frequently Asked Questions</h1>
        </div>
      </div>
      <section className="flex-1 bg-cta px-5 py-6 md:py-8">
        <div className="mx-auto max-w-5xl rounded-xl border border-border bg-cta p-5 md:p-7">
          <p className="mb-5 text-sm leading-relaxed">
            Job shadowing guidance for scholars, tertiary students, mentors, companies and schools.
          </p>
          <div className="divide-y divide-border">
            {FAQ_ITEMS.map((item, index) => (
              <details
                key={item.question}
                id={`question-${index + 1}`}
                className="group scroll-mt-5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
                  <h2 className="text-sm font-bold md:text-base">{item.question}</h2>
                  <Plus
                    aria-hidden
                    className="h-4 w-4 shrink-0 transition-transform group-open:rotate-45"
                  />
                </summary>
                <div className="space-y-3 pb-5 pr-4 text-sm leading-relaxed md:pr-8">
                  <p>{item.paragraphs[0]}</p>
                  {item.bullets && (
                    <ul className="list-disc space-y-2 pl-5">
                      {item.bullets.map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ul>
                  )}
                  {item.steps && (
                    <ol className="list-decimal space-y-2 pl-5">
                      {item.steps.map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ol>
                  )}
                  {item.paragraphs.slice(1).map((text) => (
                    <p key={text}>{text}</p>
                  ))}
                </div>
              </details>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-primary">
            <Link to="/roles" className="underline">
              Explore Careers
            </Link>
            <Link to="/how-to" className="underline">
              View the How To Guides
            </Link>
            <Link to="/contact" className="underline">
              Contact Job Shadow
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
