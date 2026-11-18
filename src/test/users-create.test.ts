import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  create: vi.fn(), remove: vi.fn(), invite: vi.fn(), reset: vi.fn(), assign: vi.fn(), profile: vi.fn(), clear: vi.fn(), failRole: false,
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  auth: { admin: { createUser: db.create, deleteUser: db.remove, inviteUserByEmail: db.invite }, resetPasswordForEmail: db.reset },
  from: (table: string) => table === "profiles" ? { upsert: async (row: unknown) => { db.profile(row); return { error: null }; } } : {
    delete: () => ({ eq: async (_field: string, id: string) => { db.clear(id); return { error: null }; } }),
    insert: async (row: unknown) => { db.assign(row); return { error: db.failRole ? new Error("Role assignment failed") : null }; },
  },
} }));
import { createAccountSilently, type AccountRow } from "@/lib/users.server";
beforeEach(() => {
  vi.clearAllMocks(); db.failRole = false;
  db.create.mockResolvedValue({ data: { user: { id: "brand-new-user" } }, error: null });
  db.remove.mockResolvedValue({ error: null });
});
describe("No-email account creation", () => {
  it.each(["user", "mentor", "school", "hr_admin", "admin"] as AccountRow["roles"][number][])("creates the %s account without inviting or emailing", async (role) => {
    await expect(createAccountSilently("test@example.com", "Test Name", role)).resolves.toMatchObject({ id: "brand-new-user", emailSent: false });
    expect(db.create).toHaveBeenCalledWith({ email: "test@example.com", email_confirm: false, user_metadata: { name: "Test Name", display_name: "Test Name" } });
    expect(db.assign).toHaveBeenCalledWith({ user_id: "brand-new-user", role });
    expect(db.invite).not.toHaveBeenCalled(); expect(db.reset).not.toHaveBeenCalled();
  });
  it("preserves imported history by keeping an incomplete account for repair", async () => {
    db.failRole = true;
    await expect(createAccountSilently("test@example.com", "Test Name", "admin")).rejects.toThrow("Role assignment failed");
    expect(db.remove).not.toHaveBeenCalled();
    expect(db.invite).not.toHaveBeenCalled();
  });
  it("never removes an existing account on duplicate email", async () => {
    db.create.mockResolvedValue({ data: { user: null }, error: { message: "Email already exists" } });
    await expect(createAccountSilently("existing@example.com", "Existing", "user")).rejects.toThrow("Email already exists");
    expect(db.remove).not.toHaveBeenCalled(); expect(db.invite).not.toHaveBeenCalled();
  });
});
