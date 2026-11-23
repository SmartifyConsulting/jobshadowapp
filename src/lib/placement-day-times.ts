import { bookingDateKey } from "./placement-search";
import { parseTimeEntry } from "./time-entry";

export type DayTime = { available_on: string; from_time: string | null; to_time: string | null };
export type DaySlot = { day: string; from_time: string; to_time: string };
export function selectedDaySlots(
  dates: string,
  saved: DayTime[],
  edits: Record<string, Partial<DaySlot>>,
  from = "",
  to = "",
): DaySlot[] {
  return [
    ...new Set(
      dates
        .split(",")
        .map(bookingDateKey)
        .filter((d): d is string => !!d),
    ),
  ]
    .sort()
    .map((day) => {
      const original = saved.find((s) => s.available_on === day);
      return {
        day,
        from_time: parseTimeEntry(original?.from_time ?? from) ?? "",
        to_time: parseTimeEntry(original?.to_time ?? to) ?? "",
        ...edits[day],
      };
    });
}
export function validDaySlot(slot: DaySlot) {
  return (
    /^\d{2}:\d{2}$/.test(slot.from_time) &&
    /^\d{2}:\d{2}$/.test(slot.to_time) &&
    parseTimeEntry(slot.from_time) === slot.from_time &&
    parseTimeEntry(slot.to_time) === slot.to_time &&
    slot.to_time > slot.from_time
  );
}
