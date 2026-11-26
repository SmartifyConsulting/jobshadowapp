import { readFileSync } from "node:fs";
import type { Insight } from "@/lib/insights";
const sql = readFileSync("supabase/migrations/20261126210000_insights_editor.sql", "utf8");
export const firstInsight: Insight = {
  id: "test-insight",
  slug: "before-they-choose-a-career-let-them-experience-it",
  title: "Before They Choose a Career, Let Them Experience It",
  kind: "article",
  excerpt: "Elena Nicolettis shares career guidance and the value of spending a day with a mentor.",
  author_name: "Elena Nicolettis",
  body: sql.split("$article$")[1]!,
  cover_image_url: "/assets/about-jobshadow-desk.jpeg",
  status: "published",
  published_at: "2026-11-26T13:15:20+02:00",
  created_at: "2026-11-26T11:15:20Z",
  updated_at: "2026-11-26T11:15:20Z",
};
