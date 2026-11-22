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
