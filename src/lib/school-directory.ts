import aliases from "./school-name-aliases.json";
import type { AccountRow } from "./users.server";
export type SchoolDirectoryEntry = {
  key: string;
  name: string;
  country: string | null;
  sourceNames: string[];
  scholars: AccountRow[];
};
export const schoolNameKey = (name: string) =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘']/g, "")
    .replace(/\bst\.\s*/gi, "St ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
const reviewed = new Map(
  aliases.flatMap((group) =>
    [group.name, ...group.aliases].map((name) => [schoolNameKey(name), group] as const),
  ),
);
/** Reviewed aliases only; no fuzzy matching that could join different campuses. */
export function canonicalSchool(name: string, country?: string | null) {
  const code = country?.trim().toUpperCase() || null;
  const alias = reviewed.get(schoolNameKey(name));
  return alias && (!code || code === alias.country)
    ? { name: alias.name, country: alias.country }
    : { name, country: code };
}
export function schoolDirectory(accounts: AccountRow[]): SchoolDirectoryEntry[] {
  const schools = new Map<string, SchoolDirectoryEntry>();
  for (const scholar of accounts) {
    if (!scholar.roles.includes("user") || scholar.is_spam) continue;
    const original = scholar.school?.trim().replace(/\s+/g, " ") ?? "";
    if (
      !original ||
      [
        "n/a",
        "na",
        "n/al",
        "none",
        "unknown",
        "not applicable",
        "null",
        "undefined",
        "-",
        "—",
      ].includes(original.toLowerCase())
    )
      continue;
    const canonical = canonicalSchool(original, scholar.school_country_code);
    const key = (canonical.country ?? "unknown") + "|" + schoolNameKey(canonical.name);
    const group = schools.get(key) ?? {
      key,
      name: canonical.name,
      country: canonical.country,
      sourceNames: [],
      scholars: [],
    };
    if (!group.scholars.some((account) => account.id === scholar.id)) group.scholars.push(scholar);
    if (!group.sourceNames.includes(original)) group.sourceNames.push(original);
    schools.set(key, group);
  }
  return [...schools.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || (a.country ?? "").localeCompare(b.country ?? ""),
  );
}
