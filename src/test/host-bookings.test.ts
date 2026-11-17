import { describe, expect, it } from "vitest";
import { countByDay, filterHostBookings } from "@/lib/host-bookings";

const rows = [
  { shadow_date: "11/26/2026", status: "confirmed" },
  { shadow_date: "12/01/2026", status: "awaiting_payment" },
  { shadow_date: "01/05/2026", status: "confirmed" },
  { shadow_date: "11/26/2026", status: "cancelled" },
];

describe("host bookings", () => {
  it("upcoming shows future, not cancelled", () => {
    expect(filterHostBookings(rows, "upcoming", "2026-11-17")).toHaveLength(2);
  });
  it("pending shows awaiting payment or indemnity", () => {
    expect(filterHostBookings(rows, "pending", "2026-11-17")).toEqual([rows[1]]);
  });
  it("calendar badge counts booked students per day, excluding cancelled", () => {
    expect(countByDay(rows).get("2026-11-26")).toBe(1);
  });
});
