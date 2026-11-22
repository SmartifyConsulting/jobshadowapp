import catalogue from "./career-skills.json";

export type CareerSkills = { school: string[]; workplace: string[] };
export const careerKey = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const byName = new Map(Object.entries(catalogue).map(([name, skills]) => [careerKey(name), skills]));

export function cleanSkills(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
}

/** NULL uses catalogue defaults; [] deliberately hides that group. */
export function getCareerSkills(name: string, school?: unknown, workplace?: unknown): CareerSkills {
  const fallback = byName.get(careerKey(name));
  return {
    school: school == null ? [...(fallback?.school ?? [])] : cleanSkills(school),
    workplace: workplace == null ? [...(fallback?.workplace ?? [])] : cleanSkills(workplace),
  };
}
