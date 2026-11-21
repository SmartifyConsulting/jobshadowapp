import { completeExportColumns, type ExportColumn } from "./admin-export";
import { applicationExportRow, type ApplicationRecord, type ApplicationData } from "./application-records";

export const BOOKING_EXPORT_COLS: { key: string; label: string }[] = [
  { key: "shadow_date", label: "Shadow date" }, { key: "status", label: "Status" },
  { key: "career", label: "Career" }, { key: "company", label: "Company" }, { key: "sector", label: "Sector" }, { key: "location", label: "Location" }, { key: "mode", label: "Mode" },
  { key: "student_name", label: "Student name" }, { key: "student_contact", label: "Student contact" }, { key: "student_id_number", label: "Student ID number" }, { key: "student_school", label: "School" }, { key: "student_career_interests", label: "Career interests" }, { key: "student_dietary", label: "Dietary" },
  { key: "guardian_name", label: "Parent/guardian name" }, { key: "guardian_contact", label: "Parent/guardian contact" }, { key: "guardian_email", label: "Parent/guardian email" },
  { key: "mentor_name", label: "Mentor name" }, { key: "mentor_position", label: "Mentor position" }, { key: "mentor_phone", label: "Mentor phone" }, { key: "mentor_email", label: "Mentor email" },
  { key: "hr_contact_name", label: "HR contact name" }, { key: "hr_contact_phone", label: "HR contact phone" }, { key: "hr_contact_email", label: "HR contact email" },
  { key: "amount_due", label: "Amount due" }, { key: "paid_at", label: "Paid status" }, { key: "indemnity_received", label: "Indemnity status" }, { key: "created_at", label: "Booked on" },
];

// Retain the headings of the Applications list, original import list and Bookings report.
export const APPLICATION_COLUMNS: ExportColumn[] = [
  { key: "reference", label: "Reference" }, { key: "learner", label: "Learner" },
  { key: "user_types", label: "User types" }, { key: "date", label: "Date" },
  { key: "status", label: "Status" }, { key: "paid", label: "Paid" }, { key: "indemnity", label: "Indemnity" },
  { key: "name", label: "Name" }, { key: "id_number", label: "ID No." },
  { key: "email", label: "Email" }, { key: "contact", label: "Contact" }, { key: "school", label: "School" },
  { key: "dates", label: "Dates" }, { key: "cancelled", label: "Cancelled" },
  { key: "student", label: "Student" }, { key: "mentor", label: "Mentor" }, { key: "hr_contact", label: "HR contact" },
  ...BOOKING_EXPORT_COLS,
];
export const DEFAULT_APPLICATION_COLUMNS = ["reference", "student_name", "user_types", "email", "school", "career", "company", "date", "status", "amount_due", "paid", "indemnity", "mentor", "hr_contact"];
export const APPLICATION_STATUS_CHIPS = [["all", "All"], ["pending", "Pending"], ["booked", "Booked"], ["rejected", "Rejected"], ["cancelled", "Cancelled"], ["completed", "Completed"], ["imported", "Imported"]] as const;
export function applicationStage(record: ApplicationRecord): string {
  if (record.status === "cancelled" || record.status === "canceled") return "cancelled";
  if (record.status === "rejected") return "rejected";
  if (record.status === "completed") return "completed";
  if (record.status === "confirmed") return "booked";
  return record.source === "Imported" ? "imported" : "pending";
}
const roles: Record<string, string> = { user: "Student", mentor: "Host", school: "School", hr_admin: "HR Admin", admin: "Admin" };
const first = (...values: unknown[]) => values.find((value) => value !== undefined && value !== null && value !== "") ?? null;
export function applicationTableRow(record: ApplicationRecord): ApplicationData {
  const b = record.booking ?? {}, i = record.imported ?? {}, s = record.scholar ?? {}, h = record.host ?? {}, u = record.user;
  const row: ApplicationData = { ...applicationExportRow(record), id: record.reference, name: record.name, student_name: record.name, student: record.name, user_types: u ? u.roles.map((role) => roles[role] ?? role).join(", ") || "Unclassified" : null,
    id_number: first(i["id_number"], s["id_number"], u?.id_number), contact: first(i["contact"], s["contact_no"], u?.contact_no), school: first(i["school"], s["school"], u?.school), dates: record.date, shadow_date: record.date,
    cancelled: record.status === "cancelled" ? true : first(i["cancelled"], record.source === "Booking" ? false : null),
    sector: first(b["sector"], h["sector"], i["sector"]), location: first(b["location"], h["location"], i["location"]), mode: first(b["mode"], h["mode"], i["mode"]),
    amount_due: record.amount, paid_at: first(b["paid_at"]), indemnity_received: record.indemnity, created_at: first(b["created_at"], i["created_at"]),
  };
  row["student_contact"] = row["contact"]; row["student_id_number"] = row["id_number"]; row["student_school"] = row["school"];
  for (const key of ["career_interests", "dietary"]) row["student_" + key] = first(s[key], i[key]);
  for (const key of ["guardian_name", "guardian_contact", "guardian_email"]) row[key] = first(s[key], i[key]);
  for (const key of ["mentor_name", "mentor_position", "mentor_phone", "mentor_email", "hr_contact_name", "hr_contact_phone", "hr_contact_email"]) row[key] = first(h[key], i[key]);
  row["mentor"] = row["mentor_name"]; row["hr_contact"] = row["hr_contact_name"];
  return row;
}
export function applicationColumns(rows: ApplicationData[]): ExportColumn[] {
  const unique = APPLICATION_COLUMNS.filter((column, index, columns) => columns.findIndex((item) => item.key === column.key) === index);
  return completeExportColumns(unique, rows);
}
