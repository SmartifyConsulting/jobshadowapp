import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicInsights } from "@/components/PublicInsights";
import { listPublishedInsights, getPublishedInsight } from "@/lib/insights";
import { publicSeo, SITE_URL } from "@/lib/seo";
export const Route = createFileRoute("/insights/$slug")({
  loader: async ({ params }) => {
    const [post, posts] = await Promise.all([
      getPublishedInsight(params.slug),
      listPublishedInsights(),
    ]);
    if (!post) throw notFound();
    return { post, posts };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.post)
      return {
        meta: [
          { title: "Insight not found | Job Shadow" },
          { name: "robots", content: "noindex, follow" },
        ],
      };
    const post = loaderData.post;
    return {
      links: publicSeo("/insights/" + post.slug).links,
      meta: [
        ...publicSeo("/insights/" + post.slug).meta,
        { title: post.title + " | Job Shadow Insights" },
        { name: "description", content: post.excerpt || post.title },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.excerpt || post.title },
        { property: "og:type", content: "article" },
        ...(post.cover_image_url
          ? [
              { property: "og:image", content: new URL(post.cover_image_url, SITE_URL).href },
              { name: "twitter:image", content: new URL(post.cover_image_url, SITE_URL).href },
            ]
          : []),
        ...(post.author_name ? [{ name: "author", content: post.author_name }] : []),
        ...(post.published_at
          ? [{ property: "article:published_time", content: post.published_at }]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: () => <PublicInsights {...Route.useLoaderData()} />,
});
