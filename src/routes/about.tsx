import { publicSeo } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const Route = createFileRoute("/about")({
  head: () => ({
    links: publicSeo("/about").links,
    meta: [
      ...publicSeo("/about").meta,
      { title: "About Job Shadow — Giving the youth opportunity and guidance" },
      {
        name: "description",
        content:
          "Job Shadow facilitates job shadowing for high school students at R350 per Job Shadow, or R200 for a one-hour Digital Interview.",
      },
      { property: "og:title", content: "About Job Shadow" },
      { property: "og:description", content: "Giving the youth opportunity and guidance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

function About() {
  const season = useQuery({
    queryKey: ["season-window"],
    staleTime: 60 * 60_000,
    queryFn: async () => (await supabase.rpc("get_season_window")).data?.[0] ?? null,
  });
  const seasonText = season.data
    ? `${MONTHS[season.data.season_start_month - 1]} to ${MONTHS[season.data.season_end_month - 1]}`
    : "February to October";

  return (
    <SiteLayout>
      <div className="bg-cta text-cta-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <ChevronDown className="h-6 w-6" />
          <span className="font-display text-2xl uppercase">About</span>
        </div>
      </div>
      <section className="bg-primary px-5 pb-14 pt-10 text-center text-primary-foreground">
        <h2 className="font-display text-3xl uppercase md:text-4xl">
          Giving the youth opportunity and guidance
        </h2>
        <div className="mx-auto mt-10 grid max-w-7xl gap-8 text-left text-[15px] leading-relaxed md:grid-cols-4">
          <p>
            We’ve all been to school and know the feeling that once we get through it, we think we
            know, or even don’t know, <strong>what profession to study towards</strong>. The
            pressure that high school students undergo in order to pick the right profession for
            their skills is immense. So many times, students choose to study a profession that their
            parents tell them to study or that their peers think is right for them.{" "}
            <strong>
              Do they actually know what they are committing to for the rest of their career?
            </strong>
          </p>
          <p>
            With the amount of money that tertiary education costs parents (or the students
            themselves or companies offering bursaries), it’s probably a better option to have more
            of an idea of what one is getting into – because the general idea is that one studies
            what they will pursue once they complete their tertiary education.
            <br />
            <br />
            What if you have the wrong idea of what a career in law, or advertising, for example,
            offers? Do you have an understanding of what a typical day is like?
          </p>
          <div className="space-y-4">
            <p>
              What if there was an opportunity for a high school student to{" "}
              <strong>spend a day at a company</strong> that specialises in their supposed preferred
              field? What if this opportunity was not only endorsed, but funded by the school?
            </p>
            <p>
              Job Shadow is exactly what its name suggests, it is a company which facilitates{" "}
              <strong>job shadowing for high school students.</strong> It allows Students and
              Parents the opportunity to be informed regarding a specific profession.
            </p>
          </div>
          <div className="space-y-4">
            <p>
              <strong>
                It’s a practical way of getting to know a job face-to-face with a mentor, before
                committing to study for it,
              </strong>{" "}
              at a cost of R350 per Job Shadow. In addition, we also offer a{" "}
              <strong>remote, one-hour, Digital Interview</strong> for an initial insight at a cost
              of R200 per Job Shadow Interview. Our platform offers bookings from {seasonText} every
              year.
            </p>
            <p className="mt-4">
              A Job Shadow opportunity will potentially minimize students changing direction during
              their tertiary studies eliminating wasted time, money and frustration for both Parents
              and students.
            </p>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-5xl">
          <img
            src="/assets/about-jobshadow-desk.jpeg"
            alt="Job Shadow branded desk with laptops, tablets, notebooks and creative tools in yellow, teal and green."
            width={1600}
            height={901}
            loading="lazy"
            className="h-auto w-full rounded-xl"
          />
        </div>
      </section>
    </SiteLayout>
  );
}
