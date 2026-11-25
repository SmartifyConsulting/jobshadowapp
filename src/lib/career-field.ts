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

/** Sub-groups within each sector (e.g. "C-Suite" inside Business & Finance), checked in order -
 * first match wins. Each sector falls back to a "General <sector>" division. */
const DIVISIONS: Record<string, { division: string; pattern: RegExp }[]> = {
  "Business & Finance": [
    { division: "C-Suite & Executive Leadership", pattern: /\bce[o]\b|\bcf[o]\b|\bci[o]\b|\bco[o]\b|\bct[o]\b|chief .*officer|managing director|company secretary|executive director/i },
    { division: "Accounting & Audit", pattern: /account|book\s?keep|audit|tax\b/i },
    { division: "Actuarial Science", pattern: /actuar/i },
    { division: "Banking & Investment", pattern: /bank|invest|portfolio|fund manag|trader|stockbrok/i },
    { division: "Economics", pattern: /econom/i },
    { division: "Insurance & Risk", pattern: /insuranc|underwrit|risk/i },
    { division: "Business Analysis & Strategy", pattern: /business analy|analytics|strateg|consult/i },
    { division: "Entrepreneurship & Management", pattern: /entrepreneur|general manag|operations manag|business owner/i },
  ],
  "Admin": [
    { division: "Legal Services", pattern: /lawyer|attorney|paralegal|legal|law\b|advocate/i },
    { division: "Human Resources", pattern: /human resources|\bhr\b|recruit/i },
    { division: "Office & Clerical", pattern: /clerk|receptionist|secretar|office manag|admin(?:istrative)? assistant/i },
    { division: "Government & Public Service", pattern: /government|public service|municipal|police|home affairs/i },
    { division: "Social Services", pattern: /social work|counsel/i },
  ],
  "Medical, Health & Wellness": [
    { division: "Medical Practitioners", pattern: /doctor|surgeon|anaesthe|general practitioner|\bgp\b|physician/i },
    { division: "Nursing & Allied Health", pattern: /nurse|paramedic|physio|occupational therap|radiograph/i },
    { division: "Pharmacy", pattern: /pharmac/i },
    { division: "Dental", pattern: /dent/i },
    { division: "Mental Health", pattern: /psych|counsel/i },
    { division: "Nutrition & Wellness", pattern: /dietic|nutrition|wellness/i },
  ],
  "Veterinary": [
    { division: "Veterinary Practice", pattern: /veterinar/i },
    { division: "Animal Care", pattern: /animal|zoo/i },
  ],
  "Architecture & Engineering": [
    { division: "Civil & Structural Engineering", pattern: /civil|structural|survey/i },
    { division: "Mechanical & Industrial Engineering", pattern: /mechanical|industrial/i },
    { division: "Electrical & Electronic Engineering", pattern: /electric|electronic/i },
    { division: "Architecture & Construction", pattern: /architect|construction|draughts/i },
  ],
  "ICT & Network Technology": [
    { division: "Software Development", pattern: /developer|programmer|software engineer|front end|back end|full stack/i },
    { division: "Data & Analytics", pattern: /data scien|data analy|business intelligence|analytics and modelling/i },
    { division: "Networks & Cybersecurity", pattern: /network|cyber|security/i },
    { division: "Game & Animation", pattern: /game develop|animator|visual effects|3d\b/i },
  ],
  "Design, Media & Marketing": [
    { division: "Marketing & Advertising", pattern: /marketing|advertis|brand|\bpr\b|public relations/i },
    { division: "Media & Journalism", pattern: /journalis|media|film|video|photograph/i },
    { division: "Design", pattern: /design|fashion|artist|graphic/i },
  ],
  "Education": [
    { division: "Teaching", pattern: /teacher|tutor|lectur/i },
    { division: "Education Leadership", pattern: /principal|curriculum/i },
    { division: "Early Childhood Development", pattern: /early childhood/i },
  ],
  "Agriculture": [
    { division: "Farming & Production", pattern: /farm|livestock|horticultur|fisher|forestry/i },
    { division: "Agribusiness & Economics", pattern: /agricultural econom|agribusiness|agronom/i },
  ],
};

/** Sub-group a career within its sector (e.g. "C-Suite & Executive Leadership" inside
 * Business & Finance), so each sector accordion shows logical divisions instead of one long
 * alphabetical list. Falls back to "General <sector>" when nothing matches. */
export function guessCareerDivision(name: string, field: string, description?: string | null): string {
  const text = `${name} ${description ?? ""}`;
  for (const { division, pattern } of DIVISIONS[field] ?? []) if (pattern.test(text)) return division;
  return `General ${field}`;
}
