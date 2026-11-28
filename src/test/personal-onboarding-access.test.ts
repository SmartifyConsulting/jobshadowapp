import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ context: vi.fn(), insert: vi.fn(), save: vi.fn(), create: vi.fn(), poll: vi.fn(), user: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { const b = { middleware: () => b, inputValidator: () => b, handler: (fn: unknown) => fn }; return b; } }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => ({ headers: new Headers({ "cf-connecting-ip": "192.0.2.10" }) }) }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/personal-onboarding.server", () => ({ personalContext: m.context, savePersonalVerification: m.save, personalOnboardingAdmin: { from: () => ({ insert: m.insert }), auth: { admin: { getUserById: m.user } } } }));
vi.mock("@/lib/forus-kyc.server", () => ({ createScholarVerification: m.create, getScholarVerification: m.poll }));
import { loadPersonalOnboarding, signPersonalFormA, startPersonalIdentity, refreshPersonalIdentity } from "@/lib/personal-onboarding.functions";
const load = loadPersonalOnboarding as unknown as (x: unknown) => Promise<unknown>;
const sign = signPersonalFormA as unknown as (x: unknown) => Promise<unknown>;
const start = startPersonalIdentity as unknown as (x: unknown) => Promise<unknown>;
const refresh = refreshPersonalIdentity as unknown as (x: unknown) => Promise<unknown>;
const base = { scholarId: "scholar", self: true, version: "a".repeat(64), body: "Exact form", consentComplete: true, identity: null };
const request = { context: { userId: "scholar", supabase: {} }, data: { scholarId: "scholar", name: "Synthetic Scholar", accepted: true, version: base.version, signer_role: "parent" } };
beforeEach(() => { vi.resetAllMocks(); m.context.mockResolvedValue(base); m.insert.mockResolvedValue({ error: null }); m.user.mockResolvedValue({ data: { user: { created_at: "2026-11-12T10:00:00Z" } } }); });
it("returns the account's original sign-up date only after authorizing the scholar relationship", async () => {
  await expect(load(request)).resolves.toMatchObject({ signedUpAt: "2026-11-12T10:00:00Z" });
  expect(m.user).toHaveBeenCalledWith("scholar");
  m.user.mockClear(); m.context.mockRejectedValue(new Error("Not linked"));
  await expect(load(request)).rejects.toThrow("Not linked");
  expect(m.user).not.toHaveBeenCalled();
});
it("never lets a scholar choose the parent's signing role and stamps the server receipt", async () => {
  await sign(request);
  expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({ signer_user_id: "scholar", scholar_user_id: "scholar", signer_role: "scholar", document_body: "Exact form", document_hash: base.version, ip_address: "192.0.2.10" }));
});
it("saves a parent's signature under their own user ID after linked-parent authorization", async () => {
  m.context.mockResolvedValue({ ...base, self: false });
  await sign({ ...request, context: { userId: "linked-parent", supabase: {} } });
  expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({ signer_user_id: "linked-parent", signer_role: "parent", scholar_user_id: "scholar" }));
});
it("rejects unrelated parents before saving a signature", async () => {
  m.context.mockRejectedValue(new Error("Only the linked Parent/Guardian"));
  await expect(sign(request)).rejects.toThrow("linked Parent");
  expect(m.insert).not.toHaveBeenCalled();
});
it("requires review of the exact form version", async () => {
  await expect(sign({ ...request, data: { ...request.data, version: "b".repeat(64) } })).rejects.toThrow("changed");
  expect(m.insert).not.toHaveBeenCalled();
});
it("does not start KYC without both required signatures", async () => {
  m.context.mockResolvedValue({ ...base, consentComplete: false });
  await expect(start(request)).rejects.toThrow("must sign Form A");
  expect(m.create).not.toHaveBeenCalled();
});
it("reuses a live verified account without another session or provider poll on a later booking", async () => {
  m.context.mockResolvedValue({ ...base, identity: { status: "approved", environment: "live" } });
  await expect(start(request)).resolves.toMatchObject({ status: "approved", environment: "live" });
  await refresh(request);
  expect(m.create).not.toHaveBeenCalled(); expect(m.poll).not.toHaveBeenCalled();
});
it("a parent cannot start KYC on behalf of the scholar", async () => {
  m.context.mockResolvedValue({ ...base, self: false });
  await expect(start(request)).rejects.toThrow("Sign in as the scholar");
});
