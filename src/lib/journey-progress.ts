export const HOW_TO_DESTINATIONS = {
  studentProfile: "/profile?tab=bookings&step=profile",
  studentCareers: "/profile?tab=bookings&step=careers",
  studentRequest: "/profile?tab=bookings&step=request",
  studentPayment: "/profile?tab=bookings&step=payment",
  studentForms: "/profile?tab=bookings&step=forms",
  studentExperience: "/profile?tab=bookings&step=experience",
  studentFeedback: "/profile?tab=bookings&step=feedback",
  providerProfile: "/mentor?entry=onboarding&step=profile",
  providerAvailability: "/mentor?section=settings",
  providerBookings: "/mentor?section=shadows",
  providerExperience: "/mentor?section=calendar",
} as const;
export type JourneyDestination = keyof typeof HOW_TO_DESTINATIONS;
export function isJourneyDestination(value: unknown): value is JourneyDestination {
  return typeof value === "string" && Object.hasOwn(HOW_TO_DESTINATIONS, value);
}

type ProgressBooking = {
  id: string;
  status: string;
  career?: string | null | undefined;
  paid_at?: string | null;
  indemnity_received?: boolean;
  guardian_signature_status?: string;
};
export function journeyProgress({
  registered,
  profile,
  bookings,
  provider,
  hostProfile,
  placements,
  hostBookings,
  evaluations,
}: {
  registered: boolean;
  profile: boolean;
  bookings: ProgressBooking[];
  provider: boolean;
  hostProfile: boolean;
  placements: {
    active: boolean;
    dates: string | null;
    arrival_time: string | null;
    collection_time: string | null;
  }[];
  hostBookings: ProgressBooking[];
  evaluations: { booking_id: string; role: string }[];
}) {
  // A completed old visit must not mark the forms for a new pending booking complete.
  const current = bookings.find((booking) => booking.status !== "cancelled");
  const studentFeedback =
    current?.status === "completed" &&
    evaluations.some((entry) => entry.role === "scholar" && entry.booking_id === current.id);
  const hosted = hostBookings.filter((booking) => booking.status !== "cancelled");
  const receivedFeedback = evaluations.some(
    (entry) =>
      entry.role === "scholar" &&
      hosted.some((booking) => booking.id === entry.booking_id && booking.status === "completed"),
  );
  return {
    student: [
      registered,
      profile,
      !!current?.career,
      !!current,
      !!current?.paid_at ||
        ["indemnity_required", "confirmed", "completed"].includes(current?.status ?? ""),
      current?.status === "confirmed" || current?.status === "completed",
      current?.status === "completed",
      !!studentFeedback,
    ],
    provider: [
      provider,
      hostProfile,
      placements.some(
        (placement) =>
          placement.active &&
          !!placement.dates?.trim() &&
          !!placement.arrival_time &&
          !!placement.collection_time,
      ),
      false,
      hosted.length > 0,
      hosted.some((booking) => ["confirmed", "completed"].includes(booking.status)),
      hosted.some((booking) => booking.status === "completed"),
      hostProfile && receivedFeedback,
    ],
  };
}
