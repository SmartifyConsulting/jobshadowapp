import { describe, expect, it } from "vitest";
import { hasPlacementTimes, mentorAvailability } from "@/lib/mentor-availability";

describe("actual mentor availability", () => {
  it("counts distinct primary mentors, requiring active future dates and both times", () => {
    const base = { company: "Example", career: "Software Developer", mentor_name: "Test Mentor", active: true, dates: "11/30/2026", arrival_time: "09:00", collection_time: "15:00" };
    const counts = mentorAvailability([base, { ...base }, { ...base, mentor_name: "No Time", collection_time: null }, { ...base, mentor_name: "Inactive", active: false }, { ...base, mentor_name: "Past", dates: "11/01/2026" }], new Date(2026, 10, 23));
    expect(counts.get("softwaredeveloper")).toEqual({ total: 4, available: 1 });
  });
  it("shows zero for future dates without times and rejects invalid dates and reversed times", () => {
    const base = { company: "Example", career: "Accountant", mentor_name: "Test Mentor", active: true, dates: "11/30/2026", arrival_time: null, collection_time: null };
    expect(mentorAvailability([base], new Date(2026, 10, 23)).get("accountant")).toEqual({ total: 1, available: 0 });
    expect(mentorAvailability([{ ...base, dates: "11/31/2026", arrival_time: "09:00", collection_time: "15:00" }], new Date(2026, 10, 23)).get("accountant")?.available).toBe(0);
    expect(hasPlacementTimes({ arrival_time: "15:00", collection_time: "09:00" })).toBe(false);
    expect(hasPlacementTimes({ arrival_time: "9:00 am", collection_time: "3:00 pm" })).toBe(true);
  });
});
