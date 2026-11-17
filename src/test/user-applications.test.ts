import { describe, expect, it } from "vitest";
import { getUserApplications, type ImportedUserApplication, type UserBooking } from "@/lib/user-applications";

const application: ImportedUserApplication = {
  id: 4, name: "Test Learner", email: "learner@example.com", contact: "0000000000",
  school: "Test School", id_number: "TEST001", company: "Host A", career: "Engineer",
  dates: "11/26/2026", paid: null, indemnity: false, cancelled: false,
};
const booking: UserBooking = {
  id: "booking-1", user_id: "learner-1", company: "Host B", career: "Developer",
  shadow_date: "12/02/2026", paid_at: "2026-11-17T10:00:00Z", indemnity_received: true,
  status: "confirmed",
};

describe("Applications displayed for a user", () => {
  it("retains each imported placement and the user's current booking separately", () => {
    const result = getUserApplications(
      { id: "learner-1", email: " Learner@Example.com " },
      [application, { ...application, id: 8, company: "Host C" }],
      [booking],
    );
    expect(result.applications.map((a) => a.company)).toEqual(["Host B", "Host C", "Host A"]);
    expect(result.latestImported?.id).toBe(8);
    expect(result.applications[0]).toMatchObject({ paid: true, indemnity: true, cancelled: false });
    expect(result.applications[1]?.paid).toBeNull();
  });

  it("never joins applications by name or joins a booking belonging to another user", () => {
    const result = getUserApplications(
      { id: "other-user", email: "other@example.com" }, [application], [booking],
    );
    expect(result.applications).toEqual([]);
    expect(result.latestImported).toBeNull();
  });

  it("does not join records with missing or blank email addresses", () => {
    for (const email of [null, "", "   "]) {
      expect(getUserApplications(
        { id: "other-user", email }, [{ ...application, email: null }], [],
      ).applications).toEqual([]);
    }
  });

  it("keeps unknown imported flags distinct from recorded No and handles cancelled bookings", () => {
    const result = getUserApplications(
      { id: "learner-1", email: "learner@example.com" }, [application],
      [{ ...booking, paid_at: null, status: "cancelled" }],
    );
    expect(result.applications[0]).toMatchObject({ paid: false, cancelled: true });
    expect(result.applications[1]).toMatchObject({ paid: null, indemnity: false });
  });
});
