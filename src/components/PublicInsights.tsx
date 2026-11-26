import { Fragment, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Search, UserRound, Folder, Facebook, Mail } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { InsightContent } from "@/components/InsightContent";
import {
  FIRST_INSIGHT_SLUG,
  filterInsights,
  insightDate,
  type Insight,
  type InsightSummary,
} from "@/lib/insights";
import { SITE_URL } from "@/lib/seo";

function tagsFor(post: InsightSummary) {
  const text = [post.title, post.excerpt].join(" ");
  return [
    ...(/career|subject/i.test(text) ? ["Career Guidance"] : []),
    ...(/job shadow/i.test(text) ? ["Job Shadowing"] : []),
    ...(/mentor/i.test(text) ? ["Mentoring"] : []),
    ...(/school/i.test(text) ? ["Schools"] : []),
  ];
}
export function PublicInsights({
  post,
  posts,
  preview = false,
}: {
  post: Insight | null;
  posts: InsightSummary[];
  preview?: boolean;
}) {
  const Layout = preview ? Fragment : SiteLayout;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [archive, setArchive] = useState("");
  const [tag, setTag] = useState("");
  const filtered = filterInsights(posts, search, category, archive).filter(
    (item) => !tag || tagsFor(item).includes(tag),
  );
  const visible = !!post && filtered.some((item) => item.id === post.id);
  const related = filtered.filter((item) => item.id !== post?.id);
  const tags = [...new Set(posts.flatMap(tagsFor))];
  const archives = [
    ...new Set(
      posts
        .map((item) => item.published_at?.slice(0, 7))
        .filter((value): value is string => !!value),
    ),
  ];
  const reset = () => {
    setSearch("");
    setCategory("All");
    setArchive("");
    setTag("");
  };
  const articleUrl = post ? `${SITE_URL}/insights/${post.slug}` : `${SITE_URL}/blogs`;
  const panel = "rounded-xl border border-border bg-background p-5 shadow-warm";
  return (
    <Layout>
      {post && !preview && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": post.kind === "news" ? "NewsArticle" : "BlogPosting",
              "@id": articleUrl,
              headline: post.title,
              description: post.excerpt,
              ...(post.author_name
                ? { author: { "@type": "Person", name: post.author_name } }
                : {}),
              publisher: {
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                name: "Job Shadow",
              },
              mainEntityOfPage: articleUrl,
              ...(post.cover_image_url
                ? { image: new URL(post.cover_image_url, SITE_URL).href }
                : {}),
              datePublished: post.published_at,
              dateModified: post.updated_at,
              inLanguage: "en-ZA",
            }).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <div className="bg-cta text-cta-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <ChevronDown className="h-6 w-6" aria-hidden />
          <Link to="/blogs" className="font-display text-2xl uppercase">
            Insights
          </Link>
        </div>
      </div>
      <section className="flex-1 bg-[#7CCCC8] px-5 py-6 md:py-10">
        <div className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="min-w-0">
            {!visible && !related.length && (
              <div role="status" className={panel}>
                <h1 className="font-display text-2xl">Insights</h1>
                <p className="mt-3 text-sm">
                  {posts.length
                    ? "No insights match this selection."
                    : "New articles and news will appear here when published."}
                </p>
                {posts.length > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-3 text-sm font-semibold text-primary underline"
                  >
                    View All Insights
                  </button>
                )}
              </div>
            )}
            {post && (
              <article
                id={post.slug === FIRST_INSIGHT_SLUG ? "blog-1" : post.slug}
                hidden={!visible}
                className="scroll-mt-36 overflow-hidden rounded-xl border border-border bg-background shadow-warm"
              >
                {post.cover_image_url && (
                  <img
                    src={post.cover_image_url}
                    alt={post.title}
                    className="max-h-[32rem] w-full object-cover"
                  />
                )}
                <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 p-4 md:grid-cols-[3rem_minmax(0,1fr)] md:gap-5 md:p-6">
                  <div>
                    {post.published_at && (
                      <time
                        dateTime={post.published_at}
                        aria-label={insightDate(post.published_at)}
                        className="flex flex-col items-center rounded bg-primary px-1 py-2 text-primary-foreground"
                      >
                        <span className="text-[10px] uppercase">
                          {new Date(post.published_at).toLocaleDateString("en-GB", {
                            month: "short",
                            timeZone: "UTC",
                          })}
                        </span>
                        <span className="text-xl font-bold">
                          {new Date(post.published_at).getUTCDate()}
                        </span>
                      </time>
                    )}
                    {!preview && (
                      <div
                        aria-label="Share this insight"
                        className="mt-4 flex flex-col items-center gap-3"
                      >
                        <a
                          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Share insight on Facebook"
                          className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"
                        >
                          <Facebook className="h-4 w-4" />
                        </a>
                        <a
                          href={`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(articleUrl)}`}
                          aria-label="Share insight by email"
                          className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <header className="mb-5">
                      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                        {post.author_name && (
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound className="h-4 w-4" aria-hidden />
                            {post.author_name}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            reset();
                            setCategory(post.kind);
                          }}
                          className="inline-flex items-center gap-1.5 text-primary"
                        >
                          <Folder className="h-4 w-4" aria-hidden />
                          {post.kind === "news" ? "News" : "Articles"}
                        </button>
                      </div>
                      <h1 className="font-display text-3xl leading-tight md:text-4xl">
                        {post.title}
                      </h1>
                    </header>
                    <InsightContent body={post.body} />
                  </div>
                </div>
              </article>
            )}
            {related.length > 0 && (
              <section className={panel + " mt-6"} aria-labelledby="related-posts-title">
                <h2 id="related-posts-title" className="text-base font-bold">
                  {visible ? "Related Posts" : "Insights"}
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {related.map((item) => (
                    <Link
                      key={item.id}
                      id={item.slug === FIRST_INSIGHT_SLUG ? "blog-1" : undefined}
                      to="/insights/$slug"
                      params={{ slug: item.slug }}
                      className="overflow-hidden rounded border border-border hover:bg-accent/20"
                    >
                      {item.cover_image_url && (
                        <img
                          src={item.cover_image_url}
                          alt=""
                          loading="lazy"
                          className="aspect-video w-full object-cover"
                        />
                      )}
                      <div className="p-4">
                        <p className="text-xs text-primary">
                          {item.kind === "news" ? "News" : "Article"} ·{" "}
                          {insightDate(item.published_at)}
                        </p>
                        <h3 className="mt-2 font-semibold">{item.title}</h3>
                        {item.author_name && <p className="mt-2 text-xs">{item.author_name}</p>}
                        <p className="mt-2 text-sm">{item.excerpt}</p>
                        <span className="mt-3 inline-block text-sm font-semibold text-primary">
                          Read More
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {visible && !related.length && (
              <section className={panel + " mt-6"} aria-labelledby="related-reading-title">
                <h2 id="related-reading-title" className="text-base font-bold">
                  Related Reading
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Link to="/roles" className="rounded border border-border p-4 hover:bg-accent/20">
                    <h3 className="font-semibold">Explore Careers</h3>
                    <p className="mt-2 text-sm">
                      Discover role descriptions, skills, subjects and mentor opportunities.
                    </p>
                  </Link>
                  <Link
                    to="/how-to"
                    className="rounded border border-border p-4 hover:bg-accent/20"
                  >
                    <h3 className="font-semibold">How Job Shadow Works</h3>
                    <p className="mt-2 text-sm">
                      Follow the steps to prepare for a job shadowing experience.
                    </p>
                  </Link>
                </div>
              </section>
            )}
          </div>
          <aside aria-label="Insights sidebar" className="space-y-5">
            <div className={panel}>
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
            <section className={panel}>
              <h2 className="text-sm font-bold">Recent Posts</h2>
              {posts.slice(0, 5).map((item) => (
                <div key={item.id} className="mt-4">
                  <Link
                    to="/insights/$slug"
                    params={{ slug: item.slug }}
                    className="block text-sm font-semibold hover:text-primary"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {insightDate(item.published_at)}
                  </p>
                </div>
              ))}
            </section>
            <section className={panel}>
              <h2 className="text-sm font-bold">Categories</h2>
              <div className="mt-3 space-y-1">
                {[
                  ["All", "All"],
                  ["article", "Articles"],
                  ["news", "News"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={category === value}
                    onClick={() => {
                      reset();
                      setCategory(value!);
                    }}
                    className="flex w-full justify-between py-1.5 text-left text-sm aria-pressed:font-semibold aria-pressed:text-primary"
                  >
                    <span>{label}</span>
                    <span>
                      ({posts.filter((item) => value === "All" || item.kind === value).length})
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section className={panel}>
              <h2 className="text-sm font-bold">Archives</h2>
              {archives.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    reset();
                    setArchive(value);
                  }}
                  className="mt-3 block text-left text-sm hover:text-primary"
                >
                  {new Date(value + "-01T00:00:00Z").toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}{" "}
                  ({posts.filter((item) => item.published_at?.startsWith(value)).length})
                </button>
              ))}
            </section>
            {tags.length > 0 && (
              <section className={panel}>
                <h2 className="text-sm font-bold">Tags</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={tag === value}
                      onClick={() => {
                        reset();
                        setTag(value);
                      }}
                      className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-accent/20 aria-pressed:bg-accent/20"
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </section>
    </Layout>
  );
}
