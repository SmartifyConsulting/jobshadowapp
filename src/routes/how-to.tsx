import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, PageHero } from "@/components/SiteLayout";
import { YouTube } from "@/components/YouTube";
import { VIDEOS } from "@/lib/content";

export const Route = createFileRoute("/how-to")({
  head: () => ({
    meta: [
      { title: "How To — Book, register and reschedule | Job Shadow" },
      { name: "description", content: "Short videos on how to register, book a Job Shadow online, and cancel or reschedule a booking." },
      { property: "og:title", content: "How To — Job Shadow" },
      { property: "og:description", content: "Video guides for booking a Job Shadow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HowTo,
});

function HowTo() {
  return (
    <SiteLayout>
      <PageHero title="How To" />
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-2">
        {VIDEOS.map((v) => (
          <div key={v.id}>
            <h2 className="mb-3 text-xl font-bold">{v.title}</h2>
            <YouTube {...v} />
          </div>
        ))}
      </section>
    </SiteLayout>
  );
}
