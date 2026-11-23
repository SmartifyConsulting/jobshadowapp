import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { journeyProgress } from "@/lib/journey-progress";
import { fetchAllRows } from "@/lib/admin-export";

export function useHowToProgress(userId: string | undefined, roles: string[]) {
  const provider = roles.includes("mentor") || roles.includes("hr_admin");
  return useQuery({
    queryKey: ["how-to-progress", userId, provider],
    enabled: !!userId,
    queryFn: async () => {
      const [profile, bookings, placements, hosted, hostProfile, applications] = await Promise.all([
        supabase.from("scholar_profiles").select("user_id").eq("user_id", userId!).maybeSingle(),
        supabase
          .from("bookings")
          .select("id,status,career,paid_at,indemnity_received,guardian_signature_status")
          .eq("user_id", userId!)
          .order("created_at", { ascending: false }),
        provider
          ? supabase.rpc("list_mentor_placements")
          : Promise.resolve({ data: [], error: null }),
        provider
          ? supabase.rpc("list_mentor_bookings")
          : Promise.resolve({ data: [], error: null }),
        provider
          ? supabase.rpc("get_my_host_profile")
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from("partner_applications")
          .select("applicant_type,status")
          .eq("user_id", userId!),
      ]);
      for (const result of [profile, bookings, placements, hosted, hostProfile, applications])
        if (result.error) throw result.error;
      const ids = [
        ...new Set(
          [...(bookings.data ?? []), ...(hosted.data ?? [])]
            .filter((booking) => booking.status === "completed")
            .map((booking) => booking.id),
        ),
      ];
      const evaluations: { booking_id: string; role: string }[] = [];
      for (let start = 0; start < ids.length; start += 100) {
        evaluations.push(
          ...((await fetchAllRows(async (from, to) => {
            const result = await supabase
              .from("evaluations")
              .select("booking_id,role")
              .in("booking_id", ids.slice(start, start + 100))
              .order("id")
              .range(from, to);
            if (result.error) throw result.error;
            return result.data ?? [];
          })) as { booking_id: string; role: string }[]),
        );
      }
      const progress = journeyProgress({
        registered: !!userId,
        profile: !!profile.data,
        bookings: bookings.data ?? [],
        provider,
        hostProfile: !!hostProfile.data?.bio?.trim() && !!hostProfile.data.specialties?.length,
        placements: placements.data ?? [],
        hostBookings: hosted.data ?? [],
        evaluations,
      });
      return {
        mentorLinkedin: !!hostProfile.data?.linkedin_url?.trim(),
        student: progress.student,
        mentor: progress.provider.map((done, i) =>
          i === 0
            ? provider ||
              (applications.data ?? []).some(
                (application) => application.applicant_type === "mentor",
              )
            : done,
        ),
        host: progress.provider.map((done, i) =>
          i === 0
            ? provider ||
              (applications.data ?? []).some((application) => application.applicant_type === "host")
            : done,
        ),
      };
    },
  });
}
