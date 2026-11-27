export type AssessmentKind = "mini" | "full";
export const RIASEC = ["realistic", "investigative", "artistic", "social", "enterprising", "conventional"] as const;
export type RiasecArea = (typeof RIASEC)[number];
export type RiasecScores = Record<RiasecArea, number>;
export const QUESTION_COUNT: Record<AssessmentKind, number> = { mini: 30, full: 60 };
/** Highest possible score per area: each area has count/6 questions scored 0-4. */
export const maxAreaScore = (kind: AssessmentKind) => (QUESTION_COUNT[kind] / 6) * 4;

export const AREA_LABEL: Record<RiasecArea, string> = {
  realistic: "Realistic (Doer)",
  investigative: "Investigative (Thinker)",
  artistic: "Artistic (Creator)",
  social: "Social (Helper)",
  enterprising: "Enterprising (Persuader)",
  conventional: "Conventional (Organiser)",
};

/** Three-letter Holland code from the top three areas, ties kept in RIASEC order. */
export function hollandCode(s: RiasecScores): string {
  return [...RIASEC]
    .sort((a, b) => s[b] - s[a] || RIASEC.indexOf(a) - RIASEC.indexOf(b))
    .slice(0, 3)
    .map((a) => a[0]!.toUpperCase())
    .join("");
}

const STOP = new Set(["and", "the", "of", "for", "all", "other", "workers", "worker", "&", "or", "except", "specialists", "occupations"]);
const words = (t: string) =>
  t.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/)
    .map((w) => w.replace(/(ists|ers|ors|s)$/, ""))
    .filter((w) => w.length > 3 && !STOP.has(w));

/** JobShadow careers sharing a meaningful word stem with any O*NET suggestion. */
export function matchCareers<T extends { title: string }>(onetTitles: string[], careers: T[], limit = 8): T[] {
  const stems = new Set(onetTitles.flatMap(words));
  const seen = new Set<string>();
  return careers
    .map((c) => ({ c, hits: words(c.title).filter((w) => stems.has(w)).length }))
    .filter((x) => x.hits > 0 && !seen.has(x.c.title) && seen.add(x.c.title))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map((x) => x.c);
}
