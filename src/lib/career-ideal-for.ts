import profiles from "./career-ideal-for.json";

const normalize = (name: string) => name.trim().toLowerCase().replace(/[–—]/g, "-");
const byName = new Map(Object.entries(profiles).map(([name, text]) => [normalize(name), text]));

/** AI-written editorial guidance; interests to explore rather than an eligibility assessment. */
export function getCareerIdealFor(name: string): string {
  return byName.get(normalize(name)) ?? "";
}
