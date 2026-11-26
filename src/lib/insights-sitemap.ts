import type { InsightSummary } from "@/lib/insights";
import { SITE_URL } from "@/lib/seo";
const PUBLIC_PATHS = [
  "/",
  "/about",
  "/roles",
  "/how-to",
  "/real-stories",
  "/contact",
  "/partners",
  "/blogs",
  "/faq",
  "/legal",
];
const escapeXml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
export function insightsSitemap(posts: InsightSummary[]) {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    PUBLIC_PATHS.map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`).join("\n") +
    "\n" +
    posts
      .filter((post) => post.status === "published")
      .map(
        (post) =>
          `  <url><loc>${SITE_URL}/insights/${escapeXml(post.slug)}</loc><lastmod>${new Date(post.updated_at).toISOString()}</lastmod></url>`,
      )
      .join("\n") +
    "\n</urlset>"
  );
}
