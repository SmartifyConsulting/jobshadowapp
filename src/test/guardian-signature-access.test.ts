import { beforeEach, expect, it, vi } from "vitest";

const pdf = vi.hoisted(() => vi.fn().mockResolvedValue(new Uint8Array([1])));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/indemnity-sign.server", () => ({ buildSignedIndemnityPdf: pdf, standardIndemnityClauses: async () => ["Agreement"] }));
import { signIndemnityDocument } from "@/lib/indemnity-sign.functions";
import { claimParentAccount } from "@/lib/parent-claim.functions";
const invoke = signIndemnityDocument as unknown as (input: unknown) => Promise<unknown>;
const submission = { bookingId: "booking", document: "standard", guardianName: "Parent", guardianContact: "123", signatureDataUrl: "data:image/png;base64,AQ==" };
beforeEach(() => pdf.mockClear());

it.each([false, null])("rejects a scholar or other non-parent account before creating a signature (%s)", async (role) => {
  const rpc = vi.fn().mockResolvedValue({ data: role, error: null });
  await expect(invoke({ data: submission, context: { userId: "scholar", supabase: { rpc } } })).rejects.toThrow("Parent/Guardian account");
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: "scholar", _role: "parent" });
  expect(pdf).not.toHaveBeenCalled();
});
it("fails closed when the parent role cannot be checked", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: true, error: { message: "Unavailable" } });
  await expect(invoke({ data: submission, context: { userId: "parent", supabase: { rpc } } })).rejects.toThrow("Parent/Guardian account");
  expect(pdf).not.toHaveBeenCalled();
});
it("rejects a Parent/Guardian account that is not linked to this booking", async () => {
  const rpc = vi.fn().mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: [{ viewer_role: "scholar" }], error: null });
  await expect(invoke({ data: submission, context: { userId: "parent", supabase: { rpc } } })).rejects.toThrow("Only the linked parent/guardian");
  expect(pdf).not.toHaveBeenCalled();
});
it("allows the linked parent to submit their own document", async () => {
  const rpc = vi.fn().mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: [{ viewer_role: "guardian", shadow_date: "2026-12-07" }], error: null }).mockResolvedValueOnce({ error: null });
  const upload = vi.fn().mockResolvedValue({ error: null });
  const supabase = { rpc, storage: { from: () => ({ upload }) }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { status: "confirmed" } }) }) }) }) };
  await expect(invoke({ data: submission, context: { userId: "parent", supabase } })).resolves.toEqual({ ok: true, confirmed: true });
  expect(pdf).toHaveBeenCalledTimes(1);
  expect(upload.mock.calls[0]?.[0]).toMatch(/^parent\/indemnity-/);
});
it("never grants parent access merely from a known email address", async () => {
  const claim = claimParentAccount as unknown as (input: unknown) => Promise<unknown>;
  await expect(claim({ data: { email: "parent@example.com", password: "NotARealPassword" } })).rejects.toThrow("private invitation");
});
