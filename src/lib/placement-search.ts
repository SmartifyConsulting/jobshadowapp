import { hasPlacementTimes } from "./mentor-availability";
export function bookingDateKey(value: string) {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match && !iso) return null;
  const year = Number(match ? match[3] : iso![1]),
    month = Number(match ? match[1] : iso![2]),
    day = Number(match ? match[2] : iso![3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function datesInRange(
  value: string | string[] | null | undefined,
  from: string,
  to: string,
) {
  return [
    ...new Set(
      (Array.isArray(value) ? value : (value ?? "").split(","))
        .map((v) => bookingDateKey(v))
        .filter((v): v is string => !!v && v >= from && v <= to),
    ),
  ].sort();
}
export function placementsInDateRange<
  T extends {
    availability: string | string[] | null;
    arrival_time: string | null;
    collection_time: string | null;
  },
>(rows: T[], from: string, to: string) {
  if (!bookingDateKey(from) || !bookingDateKey(to) || from > to) return [];
  return rows.filter(
    (row) => hasPlacementTimes(row) && datesInRange(row.availability, from, to).length > 0,
  );
}
