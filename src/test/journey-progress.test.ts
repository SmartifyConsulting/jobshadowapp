import { describe, expect, it } from "vitest";
import { journeyProgress, isJourneyDestination } from "@/lib/journey-progress";

const blank = {
  registered: true,
  profile: true,
  bookings: [],
  provider: true,
  hostProfile: false,
  placements: [],
  hostBookings: [],
  evaluations: [],
};
describe("Personal journey completion", () => {
  it("counts only approved live identity checks as verified", () => {
    const booking = { id: "kyc", status: "confirmed", career: "Accountant", kyc_status: "approved" };
    expect(journeyProgress({ ...blank, bookings: [{ ...booking, kyc_environment: "test" }] }).student[6]).toBe(false);
    expect(journeyProgress({ ...blank, bookings: [{ ...booking, kyc_environment: "live" }] }).student[6]).toBe(true);
  });
  it("does not complete booking or paperwork steps just because someone visited", () => {
    expect(journeyProgress(blank).student).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(journeyProgress(blank).provider[3]).toBe(false);
  });
  it("keeps new booking progress separate from an older completed experience", () => {
    const progress = journeyProgress({
      ...blank,
      bookings: [
        { id: "new", status: "awaiting_payment", career: "Accountant" },
        { id: "old", status: "completed", career: "Teacher" },
      ],
      evaluations: [{ booking_id: "old", role: "scholar" }],
    });
    expect(progress.student).toEqual([true, true, true, true, false, false, false, false, false, false]);
  });
  it("ticks feedback only for the completed booking and verifies availability times", () => {
    const progress = journeyProgress({
      ...blank,
      bookings: [{ id: "done", status: "completed", career: "Accountant" }],
      evaluations: [{ booking_id: "done", role: "scholar" }],
      placements: [
        { active: true, dates: "12/1/2026", arrival_time: "09:00", collection_time: null },
      ],
    });
    expect(progress.student[6]).toBe(false);
    expect(progress.student.filter((_, index) => index !== 6).every(Boolean)).toBe(true);
    expect(progress.provider[2]).toBe(false);
  });
  it("accepts only known internal sign-in destinations", () => {
    expect(isJourneyDestination("studentForms")).toBe(true);
    expect(isJourneyDestination("https://evil.example")).toBe(false);
    expect(isJourneyDestination("constructor")).toBe(false);
  });
  it("marks recorded payment separately from outstanding forms", () => {
    const result = journeyProgress({
      ...blank,
      bookings: [{ id: "paid", status: "indemnity_required", career: "Accountant" }],
    });
    expect(result.student[4]).toBe(true);
    expect(result.student[5]).toBe(false);
  });
});
