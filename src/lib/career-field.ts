import { FIELDS } from "./data";

/** The curated sectors, plus a few extra ones modelled on university degree/faculty groupings
 * (Sciences, Humanities & Law) so careers that don't belong in Business & Finance - like an
 * Astronomer - stop being dumped there as a default. */
export const EXTRA_FIELDS = ["Sciences", "Humanities & Law"] as const;

/** Keyword cues for each sector, checked in order - first match wins. Order matters: more
 * specific sectors are checked before broad catch-alls like Business & Finance, so a career only
 * lands there when it's genuinely a business/finance role, not just "didn't match anything else". */
const CUES: { field: (typeof FIELDS)[number] | (typeof EXTRA_FIELDS)[number]; pattern: RegExp }[] = [
  { field: "Veterinary", pattern: /veterinar|animal health|zoo(?:keeper|logist)/i },
  { field: "Medical, Health & Wellness", pattern: /doctor|nurse|physio|dentist|surgeon|medic|pharmac|psych|therap|health|wellness|paramedic|optometr|radiograph|dietic|nutrition/i },
  { field: "Sciences", pattern: /astronom|physicist|\bphysics\b|chemist|biolog|geolog|statistician|mathematic|meteorolog|marine scien|environmental scien|forensic scien|research scientist|lab(?:oratory)? technician|botanist|microbiolog|zoolog|ecolog|geneticist/i },
  { field: "Architecture & Engineering", pattern: /engineer|architect|surveyor|construction|civil|mechanical|electrical|industrial design|draughts/i },
  { field: "ICT & Network Technology", pattern: /software|developer|programmer|\bit\b|information technology|network|cyber|data scien|data analy|computer|web design|systems analy|app developer|game develop/i },
  { field: "Design, Media & Marketing", pattern: /design|media|marketing|advertis|journalis|photograph|film|video|graphic|fashion|artist|writer|content creat|social media|\bpr\b|public relations/i },
  { field: "Education", pattern: /teacher|educat|lectur|tutor|principal|curriculum|early childhood/i },
  { field: "Agriculture", pattern: /agricultur|farm|horticultur|agronom|livestock|forestry|fisher/i },
  { field: "Humanities & Law", pattern: /lawyer|attorney|paralegal|advocate|\blaw\b|philosoph|histor(?:y|ian)|linguist|anthropolog|archaeolog|theolog|politic/i },
  { field: "Business & Finance", pattern: /account|\bfinance\b|\bbank|invest|audit|economist|actuar|business|entrepreneur|\bsales\b|insurance|\btax\b|payroll|procurement|supply chain|logistic/i },
  { field: "Admin", pattern: /admin|clerk|receptionist|secretar|office manager|\bhr\b|human resources|government|public service|police|security|social work|counsel/i },
];

/** Classify a career into a sector by its name/description, so every career (including ones an
 * admin adds directly) groups into a real sector accordion. Falls back to Admin (the closest
 * thing to a general-office catch-all) rather than Business & Finance, so that sector only ever
 * contains genuinely business/finance-related careers. */
export function guessCareerField(name: string, description?: string | null): (typeof FIELDS)[number] | (typeof EXTRA_FIELDS)[number] {
  const text = `${name} ${description ?? ""}`;
  for (const { field, pattern } of CUES) if (pattern.test(text)) return field;
  return "Admin";
}

/** Sub-groups within each sector (e.g. "C-Suite" inside Business & Finance), checked in order -
 * first match wins. Each sector falls back to a "General <sector>" division. The Business &
 * Finance fallback is deliberately scoped to backoffice/support functions, not a general catch-all. */
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
    { division: "Business Support & Operations", pattern: /payroll|procurement|supply chain|logistic|\bsales\b/i },
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
  "Sciences": [
    { division: "Physical & Earth Sciences", pattern: /astronom|physicist|\bphysics\b|geolog|meteorolog/i },
    { division: "Chemical Sciences", pattern: /chemist/i },
    { division: "Life Sciences", pattern: /biolog|botanist|microbiolog|zoolog|ecolog|geneticist|marine scien/i },
    { division: "Mathematics & Statistics", pattern: /mathematic|statistician/i },
    { division: "Research & Laboratory Services", pattern: /research scientist|lab(?:oratory)? technician|forensic scien|environmental scien/i },
  ],
  "Humanities & Law": [
    { division: "Legal Services", pattern: /lawyer|attorney|paralegal|advocate|\blaw\b/i },
    { division: "Humanities & Social Sciences", pattern: /philosoph|histor|linguist|anthropolog|archaeolog|theolog|politic/i },
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
