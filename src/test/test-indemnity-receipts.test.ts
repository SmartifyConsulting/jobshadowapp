import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ context: vi.fn(), from: vi.fn(), user: vi.fn(), insert: vi.fn(), eq: vi.fn(), single: vi.fn(), rows: [] as Record<string, unknown>[], ip: "192.0.2.99" as string | null }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { const b = { middleware: () => b, inputValidator: () => b, handler: (fn: unknown) => fn }; return b; } }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => ({ headers: new Headers(m.ip ? { "cf-connecting-ip": m.ip } : {}) }) }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/personal-onboarding.server", () => ({ personalContext: m.context, personalOnboardingAdmin: { from: m.from, auth: { admin: { getUserById: m.user } } } }));
import { signTestIndemnity, loadTestIndemnity } from "@/lib/test-indemnity.functions";
import { testIndemnityDocument } from "@/lib/test-indemnity.server";
const sign = signTestIndemnity as unknown as (x: unknown) => Promise<unknown>;
const load = loadTestIndemnity as unknown as (x: unknown) => Promise<unknown>;
const scholarId = "1ec456b0-6280-4732-9393-9e67991ffdfa";
const parentId = "ea29d396-45d1-430c-88d7-29d4504d9725";
const document = testIndemnityDocument();
const receipt = { signer_user_id: scholarId, signer_role: "scholar", signature_name: "Synthetic Scholar", signed_at: "2026-11-28T12:00:00Z", ip_address: "192.0.2.99", document_version: document.version };
const request = { context: { userId: scholarId, supabase: {} }, data: { scholarId, version: document.version, name: "Synthetic Scholar", signer_role: "parent", signed_at: "1900-01-01", ip_address: "client supplied" } };
beforeEach(() => {
  vi.clearAllMocks(); m.rows = []; m.ip = "192.0.2.99";
  m.context.mockResolvedValue({ scholarId, self: true, guardianEmail: "elena@moi.co.za" });
  m.user.mockImplementation(async (id: string) => ({ data: { user: { id, email: id === scholarId ? "elenanicolettis@icloud.com" : id === parentId ? "elena@moi.co.za" : "other@example.com", email_confirmed_at: "2026-11-01" } }, error: null }));
  m.single.mockResolvedValue({ data: receipt, error: null });
  m.from.mockImplementation(() => {
    const q = { select: () => q, eq: (...args: unknown[]) => { m.eq(...args); return q; }, insert: (value: unknown) => { m.insert(value); return q; }, single: m.single, maybeSingle: async () => ({ data: { role: "parent" }, error: null }), then: (resolve: (x: unknown) => unknown) => Promise.resolve({ data: m.rows, error: null }).then(resolve) }; return q;
  });
});
it("saves the exact test document and derives the signer and IP from the authenticated request", async () => {
  await expect(sign(request)).resolves.toEqual(receipt);
  expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({ signer_user_id: scholarId, signer_role: "scholar", scholar_user_id: scholarId, is_test: true, document_key: "form_d_test", document_body: document.body, document_version: document.version, ip_address: "192.0.2.99" }));
  expect(m.insert.mock.calls[0]![0]).not.toHaveProperty("signed_at");
});
it("saves the linked parent's own signature without letting them sign as the scholar", async () => {
  m.context.mockResolvedValue({ scholarId, self: false, guardianEmail: "elena@moi.co.za" });
  await sign({ ...request, context: { userId: parentId, supabase: {} } });
  expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({ signer_user_id: parentId, signer_role: "parent" }));
});
it("does not overwrite metadata after a repeated Sign click", async () => {
  m.single.mockResolvedValueOnce({ data: null, error: { code: "23505" } }).mockResolvedValueOnce({ data: receipt, error: null });
  await expect(sign(request)).resolves.toEqual(receipt);
  expect(m.eq).toHaveBeenCalledWith("signer_user_id", scholarId);
});
it("does not save a browser-invented IP when the host did not provide one", async () => {
  m.ip = null; await sign(request);
  expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({ ip_address: null }));
});
it("requires the current document version", async () => {
  await expect(sign({ ...request, data: { ...request.data, version: "0".repeat(64) } })).rejects.toThrow("form changed");
  expect(m.insert).not.toHaveBeenCalled();
});
it("rejects accounts outside the fixed test group before accessing the scholar", async () => {
  await expect(sign({ ...request, context: { userId: "unrelated", supabase: {} } })).rejects.toThrow("approved test profiles");
  expect(m.context).not.toHaveBeenCalled(); expect(m.insert).not.toHaveBeenCalled();
});
it("rejects an unlinked parent before saving any receipt", async () => {
  m.context.mockRejectedValue(new Error("Only the linked Parent/Guardian"));
  await expect(sign({ ...request, context: { userId: parentId, supabase: {} } })).rejects.toThrow("linked Parent");
  expect(m.insert).not.toHaveBeenCalled();
});
it("loads saved metadata for the authorized scholar and current document version", async () => {
  m.rows = [receipt]; await expect(load(request)).resolves.toMatchObject({ version: document.version, receipts: [receipt] });
  expect(m.eq).toHaveBeenCalledWith("scholar_user_id", scholarId);
  expect(m.eq).toHaveBeenCalledWith("document_key", "form_d_test");
  expect(m.eq).toHaveBeenCalledWith("is_test", true);
});
