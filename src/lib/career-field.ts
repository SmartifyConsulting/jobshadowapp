import { FIELDS } from "./data";

/** Keyword cues for each curated sector, checked in order - first match wins. Covers common career
 * naming patterns so every admin-added career lands in a real sector accordion automatically,
 * without needing anyone to assign one by hand. */
const CUES: { field: (typeof FIELDS)[number]; pattern: RegExp }[] = [
  { field: "Medical, Health & Wellness", pattern: /doctor|nurse|physio|dentist|surgeon|medic|pharmac|psych|therap|health|wellness|paramedic|optometr|radiograph|dietic|nutrition|veterinar/i },
  { field: "Veterinary", pattern: /veterinar|animal health|zoo(?:keeper|logist)/i },
  { field: "Architecture & Engineering", pattern: /engineer|architect|surveyor|construction|civil|mechanical|electrical|industrial design|draughts/i },
  { field: "ICT & Network Technology", pattern: /software|developer|programmer|it\b|information technology|network|cyber|data scien|computer|web design|systems analy|app developer|game develop/i },
  { field: "Design, Media & Marketing", pattern: /design|media|marketing|advertis|journalis|photograph|film|video|graphic|fashion|artist|writer|content creat|social media|pr\b|public relations/i },
  { field: "Education", pattern: /teacher|educat|lectur|tutor|principal|curriculum|early childhood/i },
  { field: "Agriculture", pattern: /agricultur|farm|horticultur|agronom|livestock|forestry|fisher/i },
  { field: "Business & Finance", pattern: /account|finance|bank|invest|audit|economist|actuar|business|entrepreneur|sales|insurance|tax|payroll|procurement|supply chain|logistic/i },
  { field: "Admin", pattern: /admin|clerk|receptionist|secretar|office manager|hr\b|human resources|legal|lawyer|attorney|paralegal|law\b|government|public service|police|security|social work|counsel/i },
];

/** Classify a career into one of the curated sectors by its name/description, so every career
 * (including ones an admin adds directly) groups into a real sector accordion rather than a
 * catch-all "Other Careers" bucket. */
export function guessCareerField(name: string, description?: string | null): (typeof FIELDS)[number] {
  const text = `${name} ${description ?? ""}`;
  for (const { field, pattern } of CUES) if (pattern.test(text)) return field;
  return "Business & Finance";
}
