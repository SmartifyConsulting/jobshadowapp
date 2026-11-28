import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ from: vi.fn(), parent: vi.fn(), signatures: [] as Record<string, unknown>[] }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: m.from, auth: { admin: { getUserById: m.parent } } } }));
import { personalContext } from "@/lib/personal-onboarding.server";
import type { SupabaseClient } from "@supabase/supabase-js";
beforeEach(() => {
  vi.clearAllMocks(); m.signatures = [];
  m.from.mockImplementation((table: string) => {
    const data = table === "scholar_profiles" ? { full_name: "Synthetic Scholar", guardian_email: "current-parent@example.com" } : table === "legal_documents" ? { body: "## Form A: Consent\n\nScholar Accuracy Declaration: Consent\n\n## Form B: Booking" } : table === "scholar_onboarding_signatures" ? m.signatures : table === "user_roles" ? { role: "parent" } : null;
    const q = { select: () => q, eq: () => q, single: async () => ({ data, error: null }), maybeSingle: async () => ({ data, error: null }), then: (resolve: (x: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve) }; return q;
  });
});
it("rejects an unrelated parent before exposing documents, signatures or verification", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
  await expect(personalContext({ rpc } as unknown as SupabaseClient, "unrelated-parent", "scholar")).rejects.toThrow("linked Parent/Guardian");
  expect(rpc).toHaveBeenCalledWith("can_sign_as_guardian", { _scholar: "scholar" });
  expect(m.from).not.toHaveBeenCalledWith("scholar_identity_verifications");
});
it("does not reuse a former parent's consent after the guardian link changes", async () => {
  m.signatures = [{ signer_role: "scholar", signer_user_id: "scholar" }, { signer_role: "parent", signer_user_id: "former-parent" }];
  m.parent.mockResolvedValue({ data: { user: { email: "former-parent@example.com", email_confirmed_at: "2026-11-28" } } });
  const c = await personalContext({} as SupabaseClient, "scholar", "scholar");
  expect(c.scholarSigned).toBe(true); expect(c.parentSigned).toBe(false); expect(c.consentComplete).toBe(false);
  expect(c.signatures).toHaveLength(1);
});
