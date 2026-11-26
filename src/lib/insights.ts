import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export type Insight = Database["public"]["Tables"]["insights"]["Row"];
export type InsightSummary = Omit<Insight, "body">;
export type InsightDraft = Pick<
  Insight,
  "slug" | "title" | "kind" | "excerpt" | "author_name" | "body" | "cover_image_url"
>;
export const FIRST_INSIGHT_SLUG = "before-they-choose-a-career-let-them-experience-it";
const SUMMARY_FIELDS =
  "id,slug,title,kind,excerpt,author_name,cover_image_url,status,published_at,created_at,updated_at";

export function insightSlug(title: string) {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
export function safeInsightImage(url: string) {
  if (!url || /^\/assets\/[^?#\\\s]+$/.test(url)) return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" && !!parsed.hostname && !parsed.username && !parsed.password
    );
  } catch {
    return false;
  }
}
export function insightExcerpt(body: string) {
  const text = body
    .replace(/\[([^\]]+)\]\([^\s)]+\)/g, "$1")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length <= 160 ? text : text.slice(0, 157).replace(/\s+\S*$/, "") + "…";
}
export async function insightCoverExtension(file: File) {
  if (file.size > 5 * 1024 * 1024 || file.size === 0)
    throw new Error("Choose an image up to 5 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG or WebP image.");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "jpg";
  if (
    file.type === "image/png" &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  )
    return "png";
  if (
    file.type === "image/webp" &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "webp";
  throw new Error("This file does not appear to be a valid JPG, PNG or WebP image.");
}
export function validateInsight(draft: InsightDraft): string | null {
  if (!draft.title.trim() || draft.title.trim().length > 200)
    return "Enter a title of up to 200 characters.";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug))
    return "Use lowercase letters, numbers and hyphens for the URL slug.";
  if (!["article", "news"].includes(draft.kind)) return "Choose Article or News.";
  if (!draft.body.trim() || draft.body.length > 100000)
    return "Enter content of up to 100,000 characters.";
  if (draft.excerpt.length > 500 || draft.author_name.length > 150)
    return "Keep the summary under 500 characters and author under 150 characters.";
  if (!safeInsightImage(draft.cover_image_url))
    return "Use an HTTPS image URL or an image under /assets/.";
  return null;
}
export function filterInsights(
  posts: InsightSummary[],
  search: string,
  category: string,
  archive = "",
) {
  const query = search.trim().toLowerCase();
  return posts.filter(
    (post) =>
      (category === "All" || post.kind === category) &&
      (!archive || (post.published_at ?? "").startsWith(archive)) &&
      [post.title, post.excerpt, post.author_name, post.kind]
        .join(" ")
        .toLowerCase()
        .includes(query),
  );
}
export async function listPublishedInsights(): Promise<InsightSummary[]> {
  const rows: InsightSummary[] = [];
  for (let from = 0; ; from += 1000) {
    // Explicit status filtering also protects public loaders when the viewer is Admin.
    const { data, error } = await supabase
      .from("insights")
      .select(SUMMARY_FIELDS)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error("Insights could not be loaded. Please try again.");
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}
export async function getPublishedInsight(slug: string): Promise<Insight | null> {
  const { data, error } = await supabase
    .from("insights")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error("This insight could not be loaded. Please try again.");
  return data;
}

export function insightDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(value))
    : "";
}
