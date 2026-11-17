import { describe, expect, it } from "vitest";
import { combineApplicationRecords, applicationExportRow } from "@/lib/application-records";
import type { AccountRow } from "@/lib/users.server";

const user = { id: "user-1", email: "student@example.com", full_name: "Student One", display_name: "Student", roles: ["user", "mentor"], id_verified: true, contact_no: "0123" } as AccountRow;
describe("Combined application records", () => {
  it("includes host and HR contacts without altering source records", () => {
    const host = { id: 10, company_code: "ABC", career: "Engineer", hr_contact_name: "HR Person", mentor_email: "host@example.com" };
    const rows = combineApplicationRecords([user], [{ id: "b", user_id: user.id, company_id: 10 }], [{ id: 1, company_code: "abc", career: "Engineer" }], [], [host]);
    expect(rows[0]?.host?.["hr_contact_name"]).toBe("HR Person");
    expect(rows[1]?.host?.["mentor_email"]).toBe("host@example.com");
    expect(applicationExportRow(rows[0]!)).toHaveProperty("host_hr_contact_name", "HR Person");
    expect(rows[0]?.booking).not.toHaveProperty("hr_contact_name");
  });
  it("links bookings by user ID and imports by unique exact email", () => {
    const rows = combineApplicationRecords([user], [{ id: "booking-1", user_id: user.id, career: "Engineer", amount_due: 250 }], [{ id: 1, email: " Student@Example.com ", career: "Engineer" }], [{ user_id: user.id, guardian_name: "Guardian" }]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.user?.id).toBe(user.id); expect(rows[1]?.user?.id).toBe(user.id);
    expect(rows[0]?.scholar?.["guardian_name"]).toBe("Guardian");
    expect(rows[0]?.amount).toBe(250); expect(rows[1]?.amount).toBeNull();
  });
  it("does not match by name, blank email, or ambiguous email", () => {
    const duplicate = { ...user, id: "user-2" };
    const rows = combineApplicationRecords([user, duplicate], [{ id: "b", user_id: "someone-else", email: user.email }], [{ id: 1, name: user.full_name, email: "other@example.com" }, { id: 2, email: "" }, { id: 3, email: user.email }], []);
    expect(rows.every((row) => row.user === null)).toBe(true);
  });
  it("retains every original field with prefixes in complete exports", () => {
    const booking = { id: "booking-1", user_id: user.id, created_at: "booking-time", reminder_sent_at: "reminder-time", extra_field: "preserved" };
    const row = combineApplicationRecords([user], [booking], [], [])[0]!;
    expect(applicationExportRow(row)).toMatchObject({ booking_id: "booking-1", user_id: "user-1", booking_reminder_sent_at: "reminder-time", booking_extra_field: "preserved" });
    expect(booking.extra_field).toBe("preserved");
  });
  it("keeps unrecorded imported flags different from false", () => {
    const rows = combineApplicationRecords([], [], [{ id: 1, paid: null, indemnity: false }], []);
    expect(rows[0]?.paid).toBeNull(); expect(rows[0]?.indemnity).toBe(false);
  });
});
