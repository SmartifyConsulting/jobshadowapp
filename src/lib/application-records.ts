import { joinApplicationContacts } from "./admin-export";
import type { AccountRow } from "./users.server";

export type ApplicationData = Record<string, unknown>;
export type ApplicationRecord = {
  key: string; source: "Booking" | "Imported"; reference: string;
  user: AccountRow | null; scholar: ApplicationData | null;
  host: ApplicationData | null; booking: ApplicationData | null; imported: ApplicationData | null;
  name: string; email: string; career: string; company: string; date: string;
  status: string; paid: boolean | null; indemnity: boolean | null; amount: number | null;
};
const text = (value: unknown) => value === null || value === undefined ? "" : String(value);
const emailKey = (value: unknown) => text(value).trim().toLowerCase();

/** Preserve each source record. Only immutable user IDs or unique exact emails link people. */
export function combineApplicationRecords(accounts: AccountRow[], bookings: ApplicationData[], imported: ApplicationData[], scholars: ApplicationData[], companies: ApplicationData[] = []): ApplicationRecord[] {
  const users = new Map(accounts.map((user) => [user.id, user]));
  const byEmail = new Map<string, AccountRow[]>();
  for (const user of accounts) {
    const key = emailKey(user.email);
    if (key) byEmail.set(key, [...(byEmail.get(key) ?? []), user]);
  }
  const profiles = new Map(scholars.map((profile) => [text(profile["user_id"]), profile]));
  const hosts = new Map(companies.map((company) => [text(company["id"]), company]));
  const importedContacts = joinApplicationContacts(imported, companies);
  return [
    ...bookings.map((booking): ApplicationRecord => {
      const user = users.get(text(booking["user_id"])) ?? null;
      const scholar = profiles.get(text(booking["user_id"])) ?? null;
      return {
        key: "booking:" + text(booking["id"]), reference: text(booking["id"]), source: "Booking", user, scholar, booking, imported: null, host: hosts.get(text(booking["company_id"])) ?? null,
        name: text(scholar?.["full_name"]) || user?.full_name || user?.display_name || user?.email || "Unlinked learner",
        email: user?.email ?? "", career: text(booking["career"]), company: text(booking["company"]), date: text(booking["shadow_date"]),
        status: text(booking["status"]), paid: !!booking["paid_at"], indemnity: typeof booking["indemnity_received"] === "boolean" ? booking["indemnity_received"] : null,
        amount: typeof booking["amount_due"] === "number" ? booking["amount_due"] : null,
      };
    }),
    ...imported.map((application, index): ApplicationRecord => {
      const matches = byEmail.get(emailKey(application["email"])) ?? [];
      const user = matches.length === 1 ? matches[0]! : null;
      return {
        key: "imported:" + text(application["id"]), reference: text(application["id"]), source: "Imported", user,
        scholar: user ? profiles.get(user.id) ?? null : null, booking: null, imported: application,
        host: Object.fromEntries(Object.entries(importedContacts[index] ?? {}).filter(([key]) => /^(mentor_|backup_mentor_|hr_contact_)/.test(key))),
        name: text(application["name"]) || user?.full_name || user?.display_name || "Name not recorded",
        email: text(application["email"]), career: text(application["career"]), company: text(application["company"]), date: text(application["dates"]),
        status: application["cancelled"] === true ? "cancelled" : "Imported application",
        paid: typeof application["paid"] === "boolean" ? application["paid"] : null,
        indemnity: typeof application["indemnity"] === "boolean" ? application["indemnity"] : null, amount: null,
      };
    }),
  ];
}

/** All source fields remain in full exports, with prefixes to avoid name collisions. */
export function applicationExportRow(record: ApplicationRecord) {
  const row: ApplicationData = { source: record.source, reference: record.reference, learner: record.name, email: record.email, career: record.career, company: record.company, date: record.date, status: record.status, paid: record.paid, indemnity: record.indemnity, amount_due: record.amount };
  for (const [prefix, data] of [["user", record.user], ["scholar", record.scholar], ["booking", record.booking], ["application", record.imported], ["host", record.host]] as const) {
    for (const [key, value] of Object.entries(data ?? {})) row[`${prefix}_${key}`] = value && typeof value === "object" ? JSON.stringify(value) : value;
  }
  return row;
}
