import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

const bookingInput = z.object({ bookingId: z.string().uuid() });
const MIN_POLL_INTERVAL_MS = 30_000;

async function ownBooking(supabase: SupabaseClient, userId: string, bookingId: string) {
  const result = await supabase
    .from("bookings")
    .select(
      "id,user_id,kyc_session_id,kyc_status,kyc_verification_url,kyc_updated_at,kyc_last_checked_at",
    )
    .eq("id", bookingId)
    .eq("user_id", userId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  if (!result.data) throw new Error("Booking not found.");
  return result.data;
}

export const startIdentityVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bookingInput.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: SupabaseClient; userId: string };
    const booking = await ownBooking(supabase, userId, data.bookingId);
    const { createForusVerification, getForusVerification, saveForusVerification } = await import(
      "./forus-kyc.server"
    );
    const verification =
      booking.kyc_session_id && booking.kyc_status !== "creation_failed"
        ? await getForusVerification(booking.kyc_session_id)
        : await createForusVerification(data.bookingId);
    await saveForusVerification(data.bookingId, verification);
    return {
      status: verification.status,
      verificationUrl: verification.verification_url,
    };
  });

export const getIdentityVerificationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => bookingInput.parse(data))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as { supabase: SupabaseClient; userId: string };
    const booking = await ownBooking(supabase, userId, data.bookingId);
    if (!booking.kyc_session_id)
      return { status: null as string | null, verificationUrl: null as string | null };
    const lastChecked = booking.kyc_last_checked_at ? Date.parse(booking.kyc_last_checked_at) : 0;
    if (Date.now() - lastChecked < MIN_POLL_INTERVAL_MS)
      return { status: booking.kyc_status, verificationUrl: booking.kyc_verification_url };
    const { getForusVerification, saveForusVerification } = await import("./forus-kyc.server");
    const verification = await getForusVerification(booking.kyc_session_id);
    await saveForusVerification(data.bookingId, verification);
    return { status: verification.status, verificationUrl: verification.verification_url };
  });
