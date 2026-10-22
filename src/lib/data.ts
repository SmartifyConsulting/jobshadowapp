import raw from "./roles.json";

export interface Role {
  slug: string;
  title: string;
  field: string;
  summary: string;
  video: string | null;
}

const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const ROLES: Role[] = (raw as Omit<Role, "slug">[]).map((r) => ({ ...r, slug: `${slugify(r.field)}--${slugify(r.title)}` }));
export const FIELDS: string[] = [...new Set(ROLES.map((r) => r.field))];
/** Unique role titles for selection lists (some roles appear under several fields). */
export const ROLE_TITLES: string[] = [...new Set(ROLES.map((r) => r.title))].sort();

export const ROLES_PDF = "https://jobshadow.co.za/wp-content/uploads/2026/03/ROLES-as-at-2026_03_19.pdf";
export const CONTACT_EMAIL = "info@jobshadow.co.za";

export const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];

export const STATUSES = ["Submitted", "Under Review", "Host Matched", "Date Confirmed", "Completed"] as const;
export type Status = (typeof STATUSES)[number];
