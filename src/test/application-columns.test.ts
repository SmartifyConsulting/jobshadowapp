import { describe, expect, it } from "vitest";
import { combineApplicationRecords } from "@/lib/application-records";
import { applicationColumns, applicationTableRow, applicationStage, BOOKING_EXPORT_COLS } from "@/lib/application-columns";

describe("Merged application columns", () => {
  it("preserves the headings from both screens and the booking export", () => {
    const headings = applicationColumns([]).map((column) => column.label);
    for (const label of ["Reference", "Learner", "User types", "Date", "Status", "Amount due", "Paid", "Indemnity", "Student", "School", "Mentor", "HR contact", "Name", "ID No.", "Email", "Contact", "Dates", "Cancelled", ...BOOKING_EXPORT_COLS.map((column) => column.label)]) expect(headings).toContain(label);
    expect(headings).not.toContain("ID");
  });
  it("maps student, guardian and host contacts while preserving extra source columns", () => {
    const [record] = combineApplicationRecords([], [{ id: "b", user_id: "u", company_id: 3, status: "confirmed", paid_at: "payment-time", extra_field: "original" }], [], [{ user_id: "u", full_name: "Student", school: "School", guardian_email: "guardian@example.com" }], [{ id: 3, mentor_name: "Host", hr_contact_email: "hr@example.com" }]);
    const row = applicationTableRow(record!);
    expect(row).toMatchObject({ student_name: "Student", school: "School", guardian_email: "guardian@example.com", mentor_name: "Host", hr_contact_email: "hr@example.com", booking_extra_field: "original", booking_paid_at: "payment-time" });
    expect(applicationColumns([row]).some((column) => column.key === "booking_extra_field")).toBe(true);
  });
  it("keeps imported records with unknown decisions separate from booked requests", () => {
    const rows = combineApplicationRecords([], [
      { id: "pending", status: "awaiting_payment" }, { id: "confirmed", status: "confirmed" },
      { id: "rejected", status: "rejected" }, { id: "cancelled", status: "cancelled" }, { id: "completed", status: "completed" },
    ], [{ id: 1, paid: true, indemnity: true }, { id: 2, cancelled: true }], []);
    expect(rows.map(applicationStage)).toEqual(["pending", "booked", "rejected", "cancelled", "completed", "imported", "cancelled"]);
  });
});
