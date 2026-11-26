import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";

const TITLE = "What if your child's future career isn't what they think it is?";

export const Route = createFileRoute("/blogs")({
  head: () => ({
    meta: [
      { title: `${TITLE} | Job Shadow Blogs` },
      {
        name: "description",
        content:
          "Elena Nicolettis shares a parent's perspective on career choices, subject selection and the value of spending a day with a mentor.",
      },
      { property: "og:title", content: TITLE },
      {
        property: "og:description",
        content:
          "A mother's experience of helping her children explore careers through job shadowing.",
      },
      { property: "og:type", content: "article" },
      { name: "author", content: "Elena Nicolettis" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Blogs,
});

function Blogs() {
  return (
    <SiteLayout>
      <div className="bg-cta text-cta-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <ChevronDown className="h-6 w-6" aria-hidden />
          <span className="font-display text-2xl uppercase">Blogs</span>
        </div>
      </div>
      <section className="flex-1 bg-[#7CCCC8] px-5 py-6 md:py-10">
        <article
          id="blog-1"
          className="mx-auto max-w-4xl rounded-xl border border-border bg-background p-5 shadow-warm md:p-8"
        >
          <header className="mb-6">
            <p className="mb-2 text-sm font-bold text-primary">Blog 1</p>
            <h1 className="font-display text-3xl leading-tight md:text-4xl">{TITLE}</h1>
            <p className="mt-4 text-sm">
              Written by: <strong>Elena Nicolettis</strong>
            </p>
          </header>
          <div className="space-y-5 text-[15px] leading-relaxed">
            <p>
              As a mother of three children across two generations (Gen Z and Generation Alpha), I
              recognise the familiar tension around choosing subjects in high school and answering
              the unsettling question of “what am I going to become when I finish school?”. It feels
              like only recently that I was 16 and asking the same things: which subjects do I
              enjoy? Which subjects bring the highest marks? Which subjects might open more than one
              faculty, since I am unsure of my career path? “Why don’t you take a career guidance
              test to see where your interests and abilities lie?” they suggested. That is how I
              chose a Bachelor of Science in Microbiology and Physiology for my future. Did I ever
              work a single day in that field? The answer is no.
            </p>
            <p>
              As part of my journey, a lesson I have passed to my children is to investigate the
              role you might want. While career guidance and psychometric tests offer insight into
              interests and aptitude, it is important to spend at least a day with a mentor to
              understand what is required and what the environment involves. All lawyers know that
              years of clerk work in law firm basements are needed just to approach the fame of
              ‘Harvey Specter’, let alone match the glorified version of a lawyer’s work.
            </p>
            <p>
              Did I enjoy studying biology and physiology? Yes, I did, but I could not stay in a
              laboratory all day with little interaction. What I have learned through parenting is
              that I enjoy teaching the subject. My daughters noted this casually, as if obvious…
              some 30 years too late! Another dimension of this complex issue is that, as parents,
              we lack sufficient awareness of available roles. The World Economic Forum’s{" "}
              <em>Future of Jobs Report suggests</em> 170 million new jobs will emerge globally by
              2030, offset by 92 million displaced, yielding a net gain of 78 million across
              macrotrends.{" "}
              <span className="whitespace-nowrap">
                [
                <a
                  className="text-primary underline"
                  href="https://www.weforum.org/media/future-of-jobs-report-2025-78-million-new-job-opportunities-by-2030-but-urgent-upskilling-needed-to-prepare-workforces"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Reference 1: World Economic Forum press release"
                >
                  1
                </a>
                ,{" "}
                <a
                  className="text-primary underline"
                  href="https://reports.weforum.org/docs/WEF_Future_of_Jobs_Report_2025.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Reference 2: Future of Jobs Report 2025 PDF"
                >
                  2
                </a>
                ]
              </span>{" "}
              With AI and rapid shifts across industries and sectors, keeping pace feels daunting.
              Assistance is clearly needed.
            </p>
            <p>
              When my firstborn chose her subjects, I saw the value of a job shadowing service.
              Performing on stage from a young age, she was naturally drawn to acting and the arts.
              This creative calling became evident by high school when she chose art and design as
              core subjects. However, she also enjoyed the allure of law, particularly through
              debating. A good friend at the time did me the favour and hosted her for a morning at
              her law firm in downtown Sandton. She came back not very enthused once she understood
              the diligence required for heavy contracts and law-based reading. She was also drawn
              to architecture and eager to pursue it, yet I knew no architects to contact—no
              relatives or friends in that field. After many calls, we found a firm willing to host
              her for a day. She returned inspired; they gave her books to keep and a display of
              their work, confirming her lifelong path. Now a passionate 26-year-old junior
              architect in Europe, she illustrates how shadowing a mentor may not ensure a match but
              offers broad insights that might otherwise remain hidden.
            </p>
            <p>
              As a recent upgrade to our website—a tool for parents and scholars to ease the search
              for mentors—we have added job descriptions to bridge the gap in role awareness. Had I
              seen a list of roles in microbiology and physiology, might I have found my calling
              sooner?
            </p>
            <p>
              I truly hope this tool helps you and your child answer the questions we all know well.
            </p>
          </div>
        </article>
      </section>
    </SiteLayout>
  );
}
