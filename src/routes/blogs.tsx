import { publicSeo } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Search, UserRound, Folder, Facebook, Mail } from "lucide-react";
import { useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";

const TITLE = "Before They Choose a Career, Let Them Experience It";
const TAGS = ["Career Guidance", "Job Shadowing", "Subject Choices", "Mentoring"];
const ARTICLE_URL = "https://jobshadow.co.za/blogs#blog-1";
const SEARCH_TEXT = [TITLE, "Elena Nicolettis", "Articles", "November 2026", ...TAGS]
  .join(" ")
  .toLowerCase();

export const Route = createFileRoute("/blogs")({
  head: () => ({
    links: publicSeo("/blogs").links,
    meta: [
      ...publicSeo("/blogs").meta,
      { title: `${TITLE} | Job Shadow Insights` },
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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const visible = category !== "News" && SEARCH_TEXT.includes(search.trim().toLowerCase());
  function resetFilters() {
    setSearch("");
    setCategory("All");
  }
  return (
    <SiteLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "@id": "https://jobshadow.co.za/blogs#blog-1",
            headline: TITLE,
            description:
              "Elena Nicolettis shares a parent's perspective on career choices, subject selection and the value of spending a day with a mentor.",
            author: { "@type": "Person", name: "Elena Nicolettis" },
            publisher: {
              "@type": "Organization",
              "@id": "https://jobshadow.co.za/#organization",
              name: "Job Shadow",
            },
            mainEntityOfPage: "https://jobshadow.co.za/blogs",
            image: "https://jobshadow.co.za/assets/about-jobshadow-desk.jpeg",
            inLanguage: "en-ZA",
            datePublished: "2026-11-26T13:15:20+02:00",
          }),
        }}
      />
      <div className="bg-cta text-cta-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <ChevronDown className="h-6 w-6" aria-hidden />
          <span className="font-display text-2xl uppercase">Insights</span>
        </div>
      </div>
      <section className="flex-1 bg-[#7CCCC8] px-5 py-6 md:py-10">
        <div className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0">
            {!visible && (
              <div
                role="status"
                className="rounded-xl border border-border bg-background p-6 shadow-warm"
              >
                <h1 className="font-display text-2xl">Insights</h1>
                <p className="mt-3 text-sm">No insights match this selection.</p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-3 text-sm font-semibold text-primary underline"
                >
                  View All Insights
                </button>
              </div>
            )}
            <article
              id="blog-1"
              hidden={!visible}
              className="scroll-mt-36 overflow-hidden rounded-xl border border-border bg-background shadow-warm"
            >
              <img
                src="/assets/about-jobshadow-desk.jpeg"
                alt="Job Shadow branded desk with laptops, notebooks and creative tools."
                width={1600}
                height={901}
                className="h-auto w-full"
              />
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 p-4 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-5 md:p-6">
                <div>
                  <time
                    dateTime="2026-11-26"
                    className="flex flex-col items-center rounded bg-primary px-1 py-2 text-primary-foreground"
                    aria-label="26 November 2026"
                  >
                    <span className="text-[10px] uppercase">Nov</span>
                    <span className="text-xl font-bold">26</span>
                  </time>
                  <div
                    aria-label="Share this insight"
                    className="mt-4 flex flex-col items-center gap-3"
                  >
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ARTICLE_URL)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Share insight on Facebook"
                      className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Facebook className="h-4 w-4" />
                    </a>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(TITLE)}&body=${encodeURIComponent(ARTICLE_URL)}`}
                      aria-label="Share insight by email"
                      className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <div className="min-w-0">
                  <header className="mb-5">
                    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <UserRound className="h-4 w-4" aria-hidden />
                        <span rel="author">Elena Nicolettis</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setCategory("Articles");
                          setSearch("");
                        }}
                        className="inline-flex items-center gap-1.5 text-primary"
                      >
                        <Folder className="h-4 w-4" aria-hidden />
                        Articles
                      </button>
                    </div>
                    <h1 className="font-display text-3xl leading-tight md:text-4xl">{TITLE}</h1>
                  </header>
                  <div className="space-y-5 text-[15px] leading-relaxed">
                    <p>
                      As a mother of three children across two generations (Gen Z and Generation
                      Alpha), I recognise the familiar tension around choosing subjects in high
                      school and answering the unsettling question of “what am I going to become
                      when I finish school?”. It feels like only recently that I was 16 and asking
                      the same things: which subjects do I enjoy? Which subjects bring the highest
                      marks? Which subjects might open more than one faculty, since I am unsure of
                      my career path? “Why don’t you take a career guidance test to see where your
                      interests and abilities lie?” they suggested. That is how I chose a Bachelor
                      of Science in Microbiology and Physiology for my future. Did I ever work a
                      single day in that field? The answer is no.
                    </p>
                    <p>
                      As part of my journey, a lesson I have passed to my children is to investigate
                      the role you might want. While career guidance and psychometric tests offer
                      insight into interests and aptitude, it is important to spend at least a day
                      with a mentor to understand what is required and what the environment
                      involves. All lawyers know that years of clerk work in law firm basements are
                      needed just to approach the fame of ‘Harvey Specter’, let alone match the
                      glorified version of a lawyer’s work.
                    </p>
                    <p>
                      Did I enjoy studying biology and physiology? Yes, I did, but I could not stay
                      in a laboratory all day with little interaction. What I have learned through
                      parenting is that I enjoy teaching the subject. My daughters noted this
                      casually, as if obvious… some 30 years too late! Another dimension of this
                      complex issue is that, as parents, we lack sufficient awareness of available
                      roles. The World Economic Forum’s <em>Future of Jobs Report suggests</em> 170
                      million new jobs will emerge globally by 2030, offset by 92 million displaced,
                      yielding a net gain of 78 million across macrotrends.{" "}
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
                      With AI and rapid shifts across industries and sectors, keeping pace feels
                      daunting. Assistance is clearly needed.
                    </p>
                    <p>
                      When my firstborn chose her subjects, I saw the value of a job shadowing
                      service. Performing on stage from a young age, she was naturally drawn to
                      acting and the arts. This creative calling became evident by high school when
                      she chose art and design as core subjects. However, she also enjoyed the
                      allure of law, particularly through debating. A good friend at the time did me
                      the favour and hosted her for a morning at her law firm in downtown Sandton.
                      She came back not very enthused once she understood the diligence required for
                      heavy contracts and law-based reading. She was also drawn to architecture and
                      eager to pursue it, yet I knew no architects to contact—no relatives or
                      friends in that field. After many calls, we found a firm willing to host her
                      for a day. She returned inspired; they gave her books to keep and a display of
                      their work, confirming her lifelong path. Now a passionate 26-year-old junior
                      architect in Europe, she illustrates how shadowing a mentor may not ensure a
                      match but offers broad insights that might otherwise remain hidden.
                    </p>
                    <p>
                      As a recent upgrade to our website—a tool for parents and scholars to ease the
                      search for mentors—we have added job descriptions to bridge the gap in role
                      awareness. Had I seen a list of roles in microbiology and physiology, might I
                      have found my calling sooner?
                    </p>
                    <p>
                      I truly hope this tool helps you and your child answer the questions we all
                      know well.
                    </p>
                  </div>
                </div>
              </div>
            </article>
            {visible && (
              <section
                className="mt-6 rounded-xl border border-border bg-background p-5 shadow-warm"
                aria-labelledby="related-reading-title"
              >
                <h2 id="related-reading-title" className="text-base font-bold">
                  Related Reading
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Link
                    to="/roles"
                    className="rounded border border-border bg-muted/30 p-4 hover:bg-accent/20"
                  >
                    <span className="text-xs text-primary">Career Exploration</span>
                    <h3 className="mt-2 font-semibold">Explore Careers</h3>
                    <p className="mt-2 text-sm">
                      Discover role descriptions, skills, subjects and mentor opportunities.
                    </p>
                  </Link>
                  <Link
                    to="/how-to"
                    className="rounded border border-border bg-muted/30 p-4 hover:bg-accent/20"
                  >
                    <span className="text-xs text-primary">Getting Started</span>
                    <h3 className="mt-2 font-semibold">How Job Shadow Works</h3>
                    <p className="mt-2 text-sm">
                      Follow the steps to prepare for a job shadowing experience.
                    </p>
                  </Link>
                </div>
              </section>
            )}
          </div>
          <aside aria-label="Insights sidebar" className="space-y-5">
            <div className="rounded-xl border border-border bg-background p-4 shadow-warm">
              <label htmlFor="insights-search" className="sr-only">
                Search Insights by title, author or topic
              </label>
              <div className="relative">
                <input
                  id="insights-search"
                  type="search"
                  placeholder="Search Insights…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border border-input bg-background py-2 pl-3 pr-9 text-sm"
                />
                <Search
                  className="pointer-events-none absolute right-3 top-2.5 h-4 w-4"
                  aria-hidden
                />
              </div>
            </div>
            <section className="rounded-xl border border-border bg-background p-5 shadow-warm">
              <h2 className="text-sm font-bold">Recent Posts</h2>
              <a
                href="#blog-1"
                onClick={resetFilters}
                className="mt-4 block text-sm font-semibold hover:text-primary"
              >
                {TITLE}
              </a>
              <p className="mt-2 text-xs text-muted-foreground">26 November 2026</p>
            </section>
            <section className="rounded-xl border border-border bg-background p-5 shadow-warm">
              <h2 className="text-sm font-bold">Categories</h2>
              <div className="mt-3 space-y-1">
                {[
                  ["All", 1],
                  ["Articles", 1],
                  ["News", 0],
                ].map(([name, count]) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={category === name}
                    onClick={() => {
                      setCategory(String(name));
                      setSearch("");
                    }}
                    className="flex w-full justify-between py-1.5 text-left text-sm aria-pressed:font-semibold aria-pressed:text-primary"
                  >
                    <span>{name}</span>
                    <span>({count})</span>
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-xl border border-border bg-background p-5 shadow-warm">
              <h2 className="text-sm font-bold">Archives</h2>
              <button
                type="button"
                onClick={() => {
                  setCategory("All");
                  setSearch("November 2026");
                }}
                className="mt-3 text-left text-sm hover:text-primary"
              >
                November 2026 (1)
              </button>
            </section>
            <section className="rounded-xl border border-border bg-background p-5 shadow-warm">
              <h2 className="text-sm font-bold">Tags</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setCategory("All");
                      setSearch(tag);
                    }}
                    className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-accent/20"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}
