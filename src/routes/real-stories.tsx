import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { YouTube } from "@/components/YouTube";
import { STORIES, STORIES_VIDEO } from "@/lib/content";

export const Route = createFileRoute("/real-stories")({
  head: () => ({
    meta: [
      { title: "Real stories — Job Shadow" },
      { name: "description", content: "Scholars share how job shadowing helped them choose engineering, architecture and more." },
      { property: "og:title", content: "Real stories — Job Shadow" },
      { property: "og:description", content: "What scholars say about their Job Shadow experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Stories,
});

function Stories() {
  return (
    <SiteLayout>
      <PageHero title="Real stories" />
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-6 md:grid-cols-2">
          {STORIES.map((s) => (
            <figure key={s.img} className="overflow-hidden rounded bg-foreground text-background">
              <img src={s.img} alt="" width={827} height={322} loading="lazy" className="w-full" />
              <blockquote className="p-6 italic opacity-90">“{s.quote}”</blockquote>
            </figure>
          ))}
        </div>
        <div className="mx-auto mt-14 max-w-3xl"><YouTube {...STORIES_VIDEO} /></div>
      </section>
    </SiteLayout>
  );
}
