export type ImportedUserApplication = {
  id: number;
  name: string | null;
  email: string | null;
  contact: string | null;
  school: string | null;
  id_number: string | null;
  company: string | null;
  career: string | null;
  dates: string | null;
  paid: boolean | null;
  indemnity: boolean | null;
  cancelled: boolean | null;
};

export type UserBooking = {
  id: string;
  user_id: string;
  company: string | null;
  career: string | null;
  shadow_date: string;
  paid_at: string | null;
  indemnity_received: boolean;
  status: string;
};

export type AccountApplication = {
  id: string;
  source: "Application" | "Booking";
  company: string | null;
  career: string | null;
  dates: string | null;
  paid: boolean | null;
  indemnity: boolean | null;
  cancelled: boolean | null;
};

/** Match historical records by exact normalized email, never by a person's name. */
export function getUserApplications(
  user: { id: string; email: string | null },
  imported: ImportedUserApplication[],
  bookings: UserBooking[],
) {
  const email = user.email?.trim().toLowerCase();
  const matching = email
    ? imported.filter((a) => a.email?.trim().toLowerCase() === email).sort((a, b) => b.id - a.id)
    : [];
  const applications: AccountApplication[] = [
    ...bookings.filter((b) => b.user_id === user.id).map((b): AccountApplication => ({
      id: b.id, source: "Booking", company: b.company, career: b.career,
      dates: b.shadow_date, paid: !!b.paid_at, indemnity: b.indemnity_received,
      cancelled: ["cancelled", "canceled"].includes(b.status),
    })),
    ...matching.map((a): AccountApplication => ({
      id: String(a.id), source: "Application", company: a.company, career: a.career,
      dates: a.dates, paid: a.paid, indemnity: a.indemnity, cancelled: a.cancelled,
    })),
  ];
  return { latestImported: matching[0] ?? null, applications };
}
