export type AdminRow = Record<string, unknown>;
export type ExportColumn = { key: string; label: string };

export async function fetchAllRows(fetchPage: (from: number, to: number) => Promise<AdminRow[]>, pageSize = 1000) {
  const rows: AdminRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

const contactFields = ["mentor_name", "mentor_position", "mentor_phone", "mentor_email", "backup_mentor_name", "backup_mentor_phone", "backup_mentor_email", "hr_contact_name", "hr_contact_phone", "hr_contact_email"];
const normalize = (value: unknown) => String(value ?? "").trim().toLowerCase();

export function joinApplicationContacts(applications: AdminRow[], companies: AdminRow[]) {
  const byCode = new Map<string, AdminRow[]>();
  for (const company of companies) {
    const code = normalize(company.company_code);
    if (code) byCode.set(code, [...(byCode.get(code) ?? []), company]);
  }
  return applications.map((application) => {
    const candidates = byCode.get(normalize(application.company_code)) ?? [];
    // A company code can cover several careers. Prefer the application's career;
    // never duplicate an application or arbitrarily take the first contact.
    const careerMatches = candidates.filter((company) => normalize(company.career) === normalize(application.career));
    const matches = careerMatches.length ? careerMatches : candidates;
    const contacts = Object.fromEntries(contactFields.map((field) => [field,
      [...new Set(matches.map((company) => String(company[field] ?? "").trim()).filter(Boolean))].join("; "),
    ]));
    return { ...application, ...contacts };
  });
}

export function completeExportColumns(columns: ExportColumn[], rows: AdminRow[]) {
  const keys = new Set(columns.map((column) => column.key));
  return [...columns, ...[...new Set(rows.flatMap((row) => Object.keys(row)))].filter((key) => !keys.has(key)).map((key) => ({ key, label: key.replaceAll("_", " ") }))];
}

export function toCsv(columns: ExportColumn[], rows: AdminRow[]) {
  const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [columns.map((column) => cell(column.label)).join(","), ...rows.map((row) => columns.map((column) => cell(row[column.key])).join(","))].join("\r\n");
}