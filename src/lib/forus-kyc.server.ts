import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { EMAIL_DELIVERY_PAUSED } from "./development-email";

const verificationSchema = z.object({
  id: z.string().uuid(), reference: z.string(), environment: z.enum(["test", "live"]),
  status: z.enum(["creating", "creation_failed", "in_progress", "awaiting_user", "approved", "declined", "review_required", "resubmission_required", "abandoned", "expired"]),
  verification_url: z.string().url().nullable(), updated_at: z.string().datetime({ offset: true }),
  last_checked_at: z.string().datetime({ offset: true }).nullable(),
});
export type ForusVerification = z.infer<typeof verificationSchema>;
export type ForusVerificationStatus = ForusVerification["status"];
const CONSENT_VERSION = "jobshadow-2026-11";

function forusKey() {
  const key = process.env["FORUS_API_KEY"];
  if (!key) throw new Error("Identity verification is not configured.");
  if (EMAIL_DELIVERY_PAUSED && !key.startsWith("forus_test_sk_"))
    throw new Error("Development identity verification requires a FORUS test secret key.");
  return key;
}
export function validateVerification(value: unknown, bookingId: string) {
  const parsed = verificationSchema.safeParse(value);
  if (!parsed.success) throw new Error("The verification service returned an incomplete response. Please try again later.");
  const result = parsed.data;
  if (result.reference !== "booking_" + bookingId) throw new Error("The verification result does not match this booking.");
  if (EMAIL_DELIVERY_PAUSED && result.environment !== "test") throw new Error("Live identity verification is disabled during development.");
  if (result.verification_url) {
    const url = new URL(result.verification_url);
    const allowed = url.hostname === "verify.didit.me" || url.hostname.endsWith(".didit.me") || url.hostname === "developer.forus.digital" || url.hostname.endsWith(".forus.digital");
    if (url.protocol !== "https:" || url.username || url.password || !allowed) throw new Error("The verification service returned an unsupported verification link.");
  }
  return result;
}
async function forusRequest(path: string, init: RequestInit, bookingId: string) {
  const response = await fetch("https://developer.forus.digital" + path, {
    ...init, signal: AbortSignal.timeout(15_000),
    headers: { Authorization: "Bearer " + forusKey(), "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) throw new Error(response.status === 429 ? "The verification service is busy. Please try again later." : "Identity verification is temporarily unavailable. Please try again later.");
  return validateVerification(await response.json(), bookingId);
}
export async function createForusVerification(bookingId: string) {
  return forusRequest("/v1/compliance/kyc", {
    method: "POST", headers: { "Idempotency-Key": "jobshadow-booking-" + bookingId },
    body: JSON.stringify({ reference: "booking_" + bookingId, consent: { obtained: true, version: CONSENT_VERSION } }),
  }, bookingId);
}
export async function getForusVerification(sessionId: string, bookingId: string) {
  const result = await forusRequest("/v1/compliance/kyc/" + sessionId, { method: "GET" }, bookingId);
  if (result.id !== sessionId) throw new Error("The verification result does not match this session.");
  return result;
}
export async function saveForusVerification(bookingId: string, verification: ForusVerification) {
  const result = await supabaseAdmin.from("bookings").update({
    kyc_session_id: verification.id, kyc_environment: verification.environment,
    kyc_status: verification.status, kyc_verification_url: verification.verification_url,
    kyc_updated_at: verification.updated_at, kyc_last_checked_at: new Date().toISOString(),
  }).eq("id", bookingId);
  if (result.error) throw new Error("Your verification status could not be saved. Please try again later.");
}
export async function claimVerificationPoll(bookingId: string, previous: string | null) {
  let query = supabaseAdmin.from("bookings").update({ kyc_last_checked_at: new Date().toISOString() }).eq("id", bookingId);
  query = previous ? query.eq("kyc_last_checked_at", previous) : query.is("kyc_last_checked_at", null);
  const result = await query.select("id").maybeSingle();
  if (result.error) throw new Error("Your verification status could not be refreshed.");
  return !!result.data;
}
