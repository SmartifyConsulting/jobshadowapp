export type HostBookingLike = { shadow_date: string; status: string };

/** Booking dates are stored as M/D/YYYY. Returns YYYY-MM-DD or null. */
export function bookingDayKey(mdy: string): string | null {
  const [m, d, y] = mdy.split("/").map(Number);
  if (!m || !d || !y) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export const PENDING_STATUSES = ["awaiting_payment", "indemnity_required"];

export function filterHostBookings<T extends HostBookingLike>(rows: T[], filter: "upcoming" | "pending" | "all", todayKey: string): T[] {
  if (filter === "pending") return rows.filter((b) => PENDING_STATUSES.includes(b.status));
  if (filter === "upcoming") return rows.filter((b) => b.status !== "cancelled" && b.status !== "completed" && (bookingDayKey(b.shadow_date) ?? "") >= todayKey);
  return rows;
}

/** Students booked per day, cancelled bookings excluded. */
export function countByDay(rows: HostBookingLike[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const b of rows) {
    if (b.status === "cancelled") continue;
    const k = bookingDayKey(b.shadow_date);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}
