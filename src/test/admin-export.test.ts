import { describe, expect, it } from "vitest";
import { completeExportColumns, fetchAllRows, joinApplicationContacts, toCsv } from "@/lib/admin-export";

describe("Complete admin exports", () => {
  it("exports all rows beyond the 1000-row API limit", async () => {
    const dataset = Array.from({ length: 2015 }, (_, id) => ({ id }));
    const rows = await fetchAllRows(async (from, to) => dataset.slice(from, to + 1));
    expect(rows).toHaveLength(2015);
    expect(rows.at(-1)?.id).toBe(2014);
  });
  it("joins mentor position and HR contacts by company_code, not name", () => {
    const rows = joinApplicationContacts([{ id: 1, company_code: " JS1 ", career: "Engineer" }], [
      { company_code: "js1", career: "Engineer", mentor_name: "Mentor", mentor_position: "Lead engineer", hr_contact_name: "HR", hr_contact_email: "hr@example.test" },
      { company_code: "js1", career: "Doctor", mentor_name: "Other mentor" },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ mentor_name: "Mentor", mentor_position: "Lead engineer", hr_contact_name: "HR", hr_contact_email: "hr@example.test" });
  });
  it("retains unmatched applications and avoids matching blank codes", () => {
    expect(joinApplicationContacts([{ id: 2, company_code: null }], [{ company_code: null, mentor_name: "Wrong" }])[0]).toMatchObject({ id: 2, mentor_name: "" });
  });
  it("includes fields not visible in the table and escapes CSV data", () => {
    const rows = [{ id: 1, referral: 'School, "A"' }];
    const columns = completeExportColumns([{ key: "id", label: "ID" }], rows);
    expect(toCsv(columns, rows)).toBe('"ID","referral"\r\n"1","School, ""A"""');
  });
});