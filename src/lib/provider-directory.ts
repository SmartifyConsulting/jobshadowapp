import { classifyCompanies, companyKey, contactEmails, type CompanyContacts } from "./company-classification";

export type ProviderGroup = { key: string; company: string; kind: "mentor" | "host"; names: string[]; emails: string[]; careers: string[]; records: Record<string, unknown>[] };
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const unique = (values: string[]) => [...new Map(values.filter(Boolean).map((value) => [value.toLowerCase(), value])).values()];
export function providerGroups(records: Record<string, unknown>[]): ProviderGroup[] {
  const kinds = classifyCompanies(records as CompanyContacts[]);
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const record of records) { const key = companyKey(text(record["company"])); if (key) groups.set(key, [...(groups.get(key) ?? []), record]); }
  return [...groups].flatMap(([key, rows]) => {
    const kind = kinds.get(key); if (!kind) return [];
    return [{ key, kind, company: text(rows[0]?.["company"]), names: unique(rows.flatMap((row) => [text(row["mentor_name"]), text(row["backup_mentor_name"])])), emails: unique(rows.flatMap((row) => [...contactEmails(text(row["mentor_email"])), ...contactEmails(text(row["backup_mentor_email"]))])), careers: unique(rows.map((row) => text(row["career"]))), records: rows }];
  });
}

/** One record per named mentor person, regardless of whether their company is classified as a solo mentor or a multi-mentor host — so every individual mentor shows as their own row in the Mentors tab instead of being folded into a host's "Mentors" column. */
export function mentorGroups(records: Record<string, unknown>[]): ProviderGroup[] {
  const people = new Map<string, ProviderGroup>();
  for (const record of records) {
    const company = text(record["company"]);
    const career = text(record["career"]);
    for (const [nameField, emailField] of [["mentor_name", "mentor_email"], ["backup_mentor_name", "backup_mentor_email"]] as const) {
      const name = text(record[nameField]);
      const emails = contactEmails(text(record[emailField]));
      if (!name && !emails.length) continue;
      const key = companyKey(company) + "|" + (companyKey(name) || emails.join(";"));
      const existing = people.get(key);
      if (existing) {
        existing.careers = unique([...existing.careers, career]);
        existing.emails = unique([...existing.emails, ...emails]);
        existing.records.push(record);
      } else {
        people.set(key, { key, kind: "mentor", company, names: name ? [name] : [], emails: unique(emails), careers: unique([career]), records: [record] });
      }
    }
  }
  return [...people.values()];
}
