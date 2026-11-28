import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));
import { createForusVerification, validateVerification } from "@/lib/forus-kyc.server";
const booking = "00000000-0000-4000-8000-000000000001";
const reply = { id: "00000000-0000-4000-8000-000000000002", reference: "booking_" + booking, environment: "test", status: "in_progress", verification_url: "https://verify.didit.me/session/test", updated_at: "2026-11-28T00:00:00Z", last_checked_at: null };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("uses the configured FORUS_API_KEY on the server and reuses its idempotency key", async () => {
  vi.stubEnv("FORUS_API_KEY", "forus_test_sk_mock");
  const request = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => reply }); vi.stubGlobal("fetch", request);
  await createForusVerification(booking); await createForusVerification(booking);
  const args = request.mock.calls[0]!; expect(args[0]).toBe("https://developer.forus.digital/v1/compliance/kyc");
  expect(args[1].headers.Authorization).toBe("Bearer forus_test_sk_mock");
  expect(args[1].headers["Idempotency-Key"]).toBe(request.mock.calls[1]![1].headers["Idempotency-Key"]);
  expect(JSON.parse(args[1].body)).toEqual({ reference: "booking_" + booking, consent: { obtained: true, version: "jobshadow-2026-11" } });
});
it("blocks live keys during development before making a request", async () => {
  vi.stubEnv("FORUS_API_KEY", "forus_live_sk_mock"); const request = vi.fn(); vi.stubGlobal("fetch", request);
  await expect(createForusVerification(booking)).rejects.toThrow("test secret key"); expect(request).not.toHaveBeenCalled();
});
it.each([{ reference: "another-person" }, { verification_url: "https://verify.didit.me.attacker.invalid/" }, { verification_url: "javascript:alert(1)" }, { status: "unknown" }, { environment: "live" }])("rejects untrusted or mismatched provider results: %j", change => {
  expect(() => validateVerification({ ...reply, ...change }, booking)).toThrow();
});
it("does not accept a malformed response as a successful verification", () => { expect(() => validateVerification({}, booking)).toThrow("incomplete response"); });
