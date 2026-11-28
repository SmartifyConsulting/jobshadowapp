import { beforeEach, expect, it, vi } from "vitest";
const calls = vi.hoisted(() => ({ create: vi.fn(), poll: vi.fn(), save: vi.fn(), claim: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn }; return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/forus-kyc.server", () => ({ createForusVerification: calls.create, getForusVerification: calls.poll, saveForusVerification: calls.save, claimVerificationPoll: calls.claim }));
import { startIdentityVerification, getIdentityVerificationStatus } from "@/lib/forus-kyc.functions";
const start = startIdentityVerification as unknown as (input: unknown) => Promise<unknown>;
const poll = getIdentityVerificationStatus as unknown as (input: unknown) => Promise<unknown>;
const id = "00000000-0000-4000-8000-000000000001";
const verification = { id: "00000000-0000-4000-8000-000000000002", status: "in_progress", environment: "test", verification_url: "https://verify.didit.me/session/test" };
const base = { id, user_id: "scholar", status: "confirmed", paid_at: "2026-11-28T00:00:00Z", guardian_signature_status: "signed", guardian_signed_at: "2026-11-28T00:00:00Z", indemnity_path: "parent/signed.pdf", indemnity_received: true, kyc_session_id: null, kyc_status: null, kyc_environment: null, kyc_verification_url: null, kyc_last_checked_at: null };
function input(data: Record<string, unknown> | null) {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) };
  return { data: { bookingId: id }, context: { userId: "scholar", supabase: { from: () => query } }, query };
}
beforeEach(() => { vi.clearAllMocks(); calls.create.mockResolvedValue(verification); calls.poll.mockResolvedValue(verification); calls.save.mockResolvedValue(undefined); calls.claim.mockResolvedValue(true); });
it("requires the authenticated scholar to own the booking", async () => {
  const ctx = input(null); await expect(start(ctx)).rejects.toThrow("Booking not found");
  expect(ctx.query.eq).toHaveBeenCalledWith("user_id", "scholar"); expect(calls.create).not.toHaveBeenCalled();
});
it.each([{ paid_at: null }, { guardian_signature_status: "pending" }, { guardian_signed_at: null }, { indemnity_path: null }, { indemnity_received: false }, { status: "cancelled" }])("requires recorded payment and guardian consent before contacting FORUS: %j", async (change) => {
  await expect(start(input({ ...base, ...change }))).rejects.toThrow("consent and indemnity"); expect(calls.create).not.toHaveBeenCalled();
});
it("starts a consented booking using only its opaque ID", async () => {
  await expect(start(input(base))).resolves.toMatchObject({ status: "in_progress", environment: "test" });
  expect(calls.create).toHaveBeenCalledExactlyOnceWith(id); expect(calls.save).toHaveBeenCalledWith(id, verification);
});
it("reopens the existing link without creating or polling another session", async () => {
  const saved = { ...base, kyc_session_id: verification.id, kyc_status: "in_progress", kyc_environment: "test", kyc_verification_url: verification.verification_url };
  await expect(start(input(saved))).resolves.toMatchObject({ verificationUrl: verification.verification_url }); expect(calls.create).not.toHaveBeenCalled(); expect(calls.poll).not.toHaveBeenCalled();
});
it("does not poll within the provider's 30-second interval", async () => {
  await poll(input({ ...base, kyc_session_id: verification.id, kyc_last_checked_at: new Date().toISOString() })); expect(calls.poll).not.toHaveBeenCalled(); expect(calls.claim).not.toHaveBeenCalled();
});
it("does not duplicate a poll reserved by another request", async () => {
  calls.claim.mockResolvedValue(false); await poll(input({ ...base, kyc_session_id: verification.id })); expect(calls.poll).not.toHaveBeenCalled();
});
it("polls only the booking's stored session and saves its validated result", async () => {
  await poll(input({ ...base, kyc_session_id: verification.id })); expect(calls.poll).toHaveBeenCalledWith(verification.id, id); expect(calls.save).toHaveBeenCalledWith(id, verification);
});
