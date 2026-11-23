import { describe, expect, it } from "vitest";
import { parseTimeEntry, displayTime } from "@/lib/time-entry";
import { selectedDaySlots, validDaySlot } from "@/lib/placement-day-times";
describe("per-day availability", () => {
  it("normalizes midnight, noon, typed AM/PM and custom minutes", () => {
    for (const [input, result] of [
      ["12am", "00:00"],
      ["12pm", "12:00"],
      ["9:15 am", "09:15"],
      ["23:45", "23:45"],
      ["9", "09:00"],
    ])
      expect(parseTimeEntry(input!)).toBe(result);
    expect(displayTime("00:00")).toBe("12:00 AM");
    expect(displayTime("15:17")).toBe("3:17 PM");
    for (const input of ["25:00", "12:60", "0pm", "13am", "bad"])
      expect(parseTimeEntry(input)).toBeNull();
  });
  it("preserves different saved hours, applies per-date edits and omits removed dates", () => {
    const slots = selectedDaySlots(
      "2/3/2027, 2/2/2027, 2/3/2027",
      [
        { available_on: "2027-02-02", from_time: "09:00", to_time: "12:00" },
        { available_on: "2027-02-03", from_time: "10:15", to_time: "15:00" },
      ],
      { "2027-02-03": { to_time: "16:45" }, "2027-02-04": { to_time: "17:00" } },
    );
    expect(slots).toEqual([
      { day: "2027-02-02", from_time: "09:00", to_time: "12:00" },
      { day: "2027-02-03", from_time: "10:15", to_time: "16:45" },
    ]);
    expect(slots.every(validDaySlot)).toBe(true);
    expect(validDaySlot({ ...slots[0]!, to_time: "09:00" })).toBe(false);
    expect(validDaySlot({ ...slots[0]!, from_time: "" })).toBe(false);
  });
  it("copies legacy hours to new selected days without discarding custom hours", () => {
    expect(
      selectedDaySlots(
        "2/2/2027, 2/3/2027",
        [{ available_on: "2027-02-02", from_time: "10:00", to_time: "13:00" }],
        {},
        "9:00",
        "15:00",
      ),
    ).toEqual([
      { day: "2027-02-02", from_time: "10:00", to_time: "13:00" },
      { day: "2027-02-03", from_time: "09:00", to_time: "15:00" },
    ]);
  });
});
