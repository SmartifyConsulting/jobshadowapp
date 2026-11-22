import { getCareerIdealFor } from "./career-ideal-for";
import { careerKey, cleanSkills, getCareerSkills } from "./career-skills";

type SavedGuidance = { [key: string]: unknown; ideal_for?: unknown; specialisations?: unknown; subjects?: unknown; school_skills?: unknown; workplace_skills?: unknown };
const specialties: Record<string, string[]> = {
  accountant: ["Financial Accountant", "Management Accountant", "Tax Accountant", "Auditor", "Forensic Accountant", "Public Sector Accountant"],
  mechanicalengineer: ["Design Engineering", "Manufacturing Engineering", "Thermal Engineering", "Maintenance Engineering", "Mechatronics"],
  softwaredeveloper: ["Front-End Development", "Back-End Development", "Mobile Development", "Application Testing"],
};
export function getCareerGuidance(name: string, description: string, saved: SavedGuidance = {}) {
  const skills = getCareerSkills(name, saved.school_skills, saved.workplace_skills);
  const subjects = new Set<string>();
  for (const foundation of skills.school) {
    if (/math|numeracy|statistic/i.test(foundation)) subjects.add("Mathematics");
    if (/accounting/i.test(foundation)) subjects.add("Accounting");
    if (/physical science|chemistry|physics/i.test(foundation)) subjects.add("Physical Sciences");
    if (/life sciences|biology/i.test(foundation)) subjects.add("Life Sciences");
    if (/geography/i.test(foundation)) subjects.add("Geography");
    if (/economics/i.test(foundation)) subjects.add("Economics");
    if (/visual arts/i.test(foundation)) subjects.add("Visual Arts");
    if (/dramatic arts/i.test(foundation)) subjects.add("Dramatic Arts");
    if (/technical drawing/i.test(foundation)) subjects.add("Engineering Graphics and Design");
    if (/computing|digital literacy/i.test(foundation)) subjects.add("Information Technology / Computer Applications Technology");
    if (/writing|written|reading|communication|language/i.test(foundation)) subjects.add("Languages");
    if (/history/i.test(foundation)) subjects.add("History");
  }
  const boldTypes = [...description.matchAll(/\*\*([^*]+)\*\*/g)].map((match) => match[1]!);
  const trailingTypes = description.match(/\*\*[^*]+\*\*(?:\s*,\s*\*\*[^*]+\*\*)+[.\s]*$/);
  const overview = trailingTypes?.index !== undefined && trailingTypes.index > 0 ? description.slice(0, trailingTypes.index).trim() : description;
  return {
    overview,
    skills,
    idealFor: typeof saved.ideal_for === "string" ? saved.ideal_for : getCareerIdealFor(name),
    specialisations: saved.specialisations == null ? boldTypes.length ? cleanSkills(boldTypes) : specialties[careerKey(name)] ?? [] : cleanSkills(saved.specialisations),
    subjects: saved.subjects == null ? [...subjects] : cleanSkills(saved.subjects),
  };
}
