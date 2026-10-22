import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { YouTube } from "@/components/YouTube";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
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
      <div className="bg-primary text-primary-foreground">
        <div className="bg-teal text-primary-foreground">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
            <ChevronDown className="h-6 w-6" />
            <span className="font-display text-2xl uppercase">Real stories</span>
          </div>
        </div>
      </div>
      <section className="bg-accent py-14">
        <Carousel opts={{ loop: true }} className="mx-auto max-w-7xl px-5">
          <CarouselContent className="-ml-8">
            {STORIES.map((s) => (
              <CarouselItem key={s.name} className="basis-1/2 pl-8 md:basis-1/2">
                <div className="flex items-center gap-4">
                  <h3 className="font-display text-4xl uppercase text-primary-foreground">{s.name}</h3>
                  <img src={s.img} alt={s.name} width={140} height={140} loading="lazy" className="h-28 w-28 shrink-0 rounded-full object-cover" />
                </div>
                <p className="mt-6 text-sm leading-relaxed text-accent-foreground">{s.quote}</p>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-0" />
          <CarouselNext className="right-0" />
        </Carousel>
        <div className="mx-auto mt-14 max-w-3xl px-5"><YouTube {...STORIES_VIDEO} /></div>
      </section>
    </SiteLayout>
  );
}
