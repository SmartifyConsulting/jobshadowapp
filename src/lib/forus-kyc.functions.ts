import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

const bookingInput = z.object({ bookingId: z.string().uuid() });
const MIN_POLL_INTERVAL_MS = 30_000;
async function ownBooking(supabase: SupabaseClient, userId: string, bookingId: string) {
  const result = await supabase.from("bookings").select("id,user_id,status,paid_at,guardian_signature_status,guardian_signed_at,indemnity_path,indemnity_received,kyc_session_id,kyc_environment,kyc_status,kyc_verification_url,kyc_updated_at,kyc_last_checked_at").eq("id", bookingId).eq("user_id", userId).maybeSingle();
  if (result.error || !result.data) throw new Error("Booking not found.");
  return result.data;
}
function view(booking: { kyc_status: string | null; kyc_verification_url: string | null; kyc_environment: string | null }) {
  return { status: booking.kyc_status, verificationUrl: booking.kyc_verification_url, environment: booking.kyc_environment };
}
export const startIdentityVerification = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => bookingInput.parse(data)).handler(async ({ context, data }) => {
  const { supabase, userId } = context as { supabase: SupabaseClient; userId: string };
  const booking = await ownBooking(supabase, userId, data.bookingId);
  if (booking.status === "cancelled" || !booking.paid_at || booking.guardian_signature_status !== "signed" || !booking.guardian_signed_at || !booking.indemnity_path || !booking.indemnity_received)
    throw new Error("Complete payment and the required parent/guardian consent and indemnity forms before identity verification.");
  // Re-opening a hosted link never creates a second session or bypasses the poll interval.
  if (booking.kyc_session_id) return view(booking);
  const { createForusVerification, saveForusVerification } = await import("./forus-kyc.server");
  const verification = await createForusVerification(data.bookingId);
  await saveForusVerification(data.bookingId, verification);
  return { status: verification.status, verificationUrl: verification.verification_url, environment: verification.environment };
});
export const getIdentityVerificationStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => bookingInput.parse(data)).handler(async ({ context, data }) => {
  const { supabase, userId } = context as { supabase: SupabaseClient; userId: string };
  const booking = await ownBooking(supabase, userId, data.bookingId);
  if (!booking.kyc_session_id) return { status: null as string | null, verificationUrl: null as string | null, environment: null as string | null };
  const lastChecked = booking.kyc_last_checked_at ? Date.parse(booking.kyc_last_checked_at) : 0;
  if (Date.now() - lastChecked < MIN_POLL_INTERVAL_MS) return view(booking);
  const { claimVerificationPoll, getForusVerification, saveForusVerification } = await import("./forus-kyc.server");
  if (!await claimVerificationPoll(data.bookingId, booking.kyc_last_checked_at)) return view(booking);
  const verification = await getForusVerification(booking.kyc_session_id, data.bookingId);
  await saveForusVerification(data.bookingId, verification);
  return { status: verification.status, verificationUrl: verification.verification_url, environment: verification.environment };
});
