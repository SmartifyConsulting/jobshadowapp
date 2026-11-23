import { describe, expect, it } from "vitest";
import { bookingDateKey, datesInRange, placementsInDateRange } from "@/lib/placement-search";
describe("mentor date-range search", () => {
  it("uses inclusive dates and rejects invalid dates", () => {
    expect(
      datesInRange("6/1/2099, 6/30/2099, 7/1/2099, 6/31/2099", "2099-06-01", "2099-06-30"),
    ).toEqual(["2099-06-01", "2099-06-30"]);
    expect(bookingDateKey("2/29/2099")).toBeNull();
  });
  it("returns all matching placements with valid times, without inventing availability", () => {
    const rows = [
      { id: 1, availability: "6/1/2099", arrival_time: "09:00", collection_time: "15:00" },
      {
        id: 2,
        availability: "6/2/2099, 7/1/2099",
        arrival_time: "10:00",
        collection_time: "16:00",
      },
      { id: 3, availability: "6/2/2099", arrival_time: null, collection_time: null },
      { id: 4, availability: "7/1/2099", arrival_time: "09:00", collection_time: "15:00" },
    ];
    expect(placementsInDateRange(rows, "2099-06-01", "2099-06-30").map((row) => row.id)).toEqual([
      1, 2,
    ]);
    expect(placementsInDateRange(rows, "2099-06-30", "2099-06-01")).toEqual([]);
  });
});
