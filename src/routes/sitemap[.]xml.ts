import { createFileRoute } from "@tanstack/react-router";
import { listPublishedInsights } from "@/lib/insights";
import { insightsSitemap } from "@/lib/insights-sitemap";
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          return new Response(insightsSitemap(await listPublishedInsights()), {
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=60",
            },
          });
        } catch {
          return new Response("Sitemap temporarily unavailable", {
            status: 503,
            headers: { "Cache-Control": "no-store", "Retry-After": "60" },
          });
        }
      },
    },
  },
});
