import { createFileRoute } from "@tanstack/react-router";
import { PublicInsights } from "@/components/PublicInsights";
import { listPublishedInsights, getPublishedInsight } from "@/lib/insights";
import { publicSeo } from "@/lib/seo";

export const Route = createFileRoute("/blogs")({
  loader: async () => {
    const posts = await listPublishedInsights();
    const post = posts[0] ? await getPublishedInsight(posts[0].slug) : null;
    return { posts, post };
  },
  head: () => ({
    links: publicSeo("/blogs").links,
    meta: [
      ...publicSeo("/blogs").meta,
      { title: "Insights | Job Shadow Articles & News" },
      {
        name: "description",
        content:
          "Explore career guidance, job shadowing articles and news for scholars, tertiary students, mentors, schools and companies.",
      },
      { property: "og:title", content: "Job Shadow Insights" },
      {
        property: "og:description",
        content: "Career guidance, articles and news from Job Shadow.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <PublicInsights {...Route.useLoaderData()} />,
});
