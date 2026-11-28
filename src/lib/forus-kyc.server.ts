import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FORUS_BASE_URL = "https://developer.forus.digital";
const CONSENT_VERSION = "jobshadow-2026-11";

export type ForusVerificationStatus =
  | "creating"
  | "creation_failed"
  | "in_progress"
  | "awaiting_user"
  | "approved"
  | "declined"
  | "review_required"
  | "resubmission_required"
  | "abandoned"
  | "expired";

type ForusVerification = {
  id: string;
  reference: string;
  environment: "test" | "live";
  status: ForusVerificationStatus;
  verification_url: string | null;
  updated_at: string;
  last_checked_at: string | null;
};

function forusKey() {
  const key = process.env["FORUS_API_KEY"];
  if (!key) throw new Error("Identity verification is not configured.");
  return key;
}

async function forusRequest(path: string, init: RequestInit) {
  const response = await fetch(`${FORUS_BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${forusKey()}`, "Content-Type": "application/json", ...init.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 202) {
    throw new Error(
      (body as { error?: string }).error
        ? `Identity verification could not be started (${(body as { error?: string }).error}).`
        : "Identity verification could not be started. Please try again shortly.",
    );
  }
  return body as ForusVerification;
}

/** Creates a FORUS-hosted KYC session for a booking. Only an opaque booking reference is sent -
 * never the scholar's name, ID number or documents; those are supplied in FORUS's own hosted flow. */
export async function createForusVerification(bookingId: string) {
  return forusRequest("/v1/compliance/kyc", {
    method: "POST",
    headers: { "Idempotency-Key": `jobshadow-booking-${bookingId}` },
    body: JSON.stringify({
      reference: `booking_${bookingId}`,
      consent: { obtained: true, version: CONSENT_VERSION },
    }),
  });
}

/** Polls FORUS for the current status of an existing session. Callers must not call this more
 * than once every 30 seconds per FORUS's rate limit guidance. */
export async function getForusVerification(sessionId: string) {
  return forusRequest(`/v1/compliance/kyc/${sessionId}`, { method: "GET" });
}

export async function saveForusVerification(bookingId: string, verification: ForusVerification) {
  const result = await supabaseAdmin
    .from("bookings")
    .update({
      kyc_session_id: verification.id,
      kyc_environment: verification.environment,
      kyc_status: verification.status,
      kyc_verification_url: verification.verification_url,
      kyc_updated_at: verification.updated_at,
      kyc_last_checked_at: verification.last_checked_at,
    })
    .eq("id", bookingId);
  if (result.error) throw new Error(result.error.message);
}
