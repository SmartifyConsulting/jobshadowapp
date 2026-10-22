import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
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
      <div className="bg-cta text-cta-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <ChevronDown className="h-6 w-6" />
          <span className="font-display text-2xl uppercase">How To</span>
        </div>
      </div>
      <section className="bg-primary">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-14 md:grid-cols-3">
          {VIDEOS.map((v) => (
            <YouTube key={v.id} {...v} />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
