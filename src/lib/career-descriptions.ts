import descriptions from "./career-descriptions.json";

const normalize = (name: string) => name.trim().toLowerCase().replace(/[–—]/g, "-");
const byName = new Map(Object.entries(descriptions).map(([name, description]) => [normalize(name), description]));

/** Keep authored admin text; supply a short catalogue description when none is saved. */
export function getCareerDescription(name: string, existing?: unknown): string {
  if (typeof existing === "string" && existing.trim()) return existing;
  return byName.get(normalize(name)) ?? "";
}

export function withCareerDescriptions(rows: Record<string, unknown>[]): (Record<string, unknown> & { description: string })[] {
  return rows.map((row) => ({ ...row, description: getCareerDescription(String(row["name"] ?? ""), row["description"]) }));
}
