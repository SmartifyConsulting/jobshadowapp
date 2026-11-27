import { publicSeo } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { YouTube } from "@/components/YouTube";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { STORIES, STORIES_VIDEO } from "@/lib/content";

export const Route = createFileRoute("/real-stories")({
  head: () => ({
    links: publicSeo("/real-stories").links,
    meta: [
      ...publicSeo("/real-stories").meta,
      { title: "Real stories — Job Shadow" },
      {
        name: "description",
        content:
          "Scholars share how job shadowing helped them choose engineering, architecture and more.",
      },
      { property: "og:title", content: "Real stories — Job Shadow" },
      {
        property: "og:description",
        content: "What scholars say about their Job Shadow experience.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Stories,
});

function Stories() {
  return (
    <SiteLayout>
      <section
        className="bg-accent pb-6"
        style={{
          background:
            "linear-gradient(to bottom, var(--teal) 0, var(--teal) 15rem, var(--accent) 15rem, var(--accent) 100%)",
        }}
      >
        <Carousel opts={{ loop: true, align: "start" }} className="mx-auto max-w-6xl px-10 sm:px-14">
          <CarouselContent className="-ml-8">
            {STORIES.map((s) => (
              <CarouselItem key={s.name} className="basis-full pl-8 md:basis-1/2">
                <div className="real-story-identity relative h-60 pt-8">
                  <h3 className="real-story-name text-white">{s.name}</h3>
                  <div
                    className="relative shrink-0 overflow-hidden rounded-full"
                    style={{
                      width: "clamp(7rem, 46cqw, 14rem)",
                      height: "clamp(7rem, 46cqw, 14rem)",
                      borderRadius: "50%",
                      clipPath: "circle(50%)",
                    }}
                  >
                    <img
                      src={s.img}
                      alt={s.name}
                      width={224}
                      height={224}
                      loading="lazy"
                      className="real-story-portrait"
                    />
                  </div>
                </div>
                <p className="pb-4 pt-8 text-sm leading-relaxed text-accent-foreground">
                  {s.quote}
                </p>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-1 top-52 sm:-left-6" />
          <CarouselNext className="right-1 top-52 sm:-right-6" />
        </Carousel>
        <div className="mx-auto mt-6 max-w-3xl px-5">
          <YouTube {...STORIES_VIDEO} />
        </div>
      </section>
    </SiteLayout>
  );
}
