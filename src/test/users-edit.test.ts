import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  profileUpdate: vi.fn(), scholarUpdate: vi.fn(), roleInsert: vi.fn(), roleDelete: vi.fn(),
  roles: ["user", "mentor"] as string[],
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  from: (table: string) => {
    if (table === "profiles") return { upsert: async (values: unknown) => { db.profileUpdate(values); return { error: null }; } };
    if (table === "scholar_profiles") return {
      update: (values: unknown) => ({ eq: async () => {
        db.scholarUpdate(values);
        return { error: null };
      } }),
    };
    if (table === "user_roles") return {
      select: () => ({ eq: async () => ({ data: db.roles.map((role) => ({ role })), error: null }) }),
      insert: async (values: unknown) => { db.roleInsert(values); return { error: null }; },
      delete: () => ({ eq: () => ({ in: async (_field: string, roles: string[]) => { db.roleDelete(roles); return { error: null }; } }) }),
    };
    throw new Error("Unexpected table: " + table);
  },
} }));
import { editAccount, type AccountEdit } from "@/lib/users.server";
const edit: AccountEdit = { userId: "test-user", display_name: "Test", full_name: "Test User", school: "Test School", contact_no: "000", id_number: "TEST", roles: ["user", "mentor"] };
beforeEach(() => { vi.clearAllMocks(); db.roles = ["user", "mentor"]; });
describe("Admin account editing", () => {
  it("retains all roles when only personal details change", async () => {
    await editAccount(edit);
    expect(db.profileUpdate).toHaveBeenCalledWith({ user_id: "test-user", display_name: "Test" });
    expect(db.scholarUpdate).toHaveBeenCalledWith({ full_name: "Test User", school: "Test School", contact_no: "000", id_number: "TEST" });
    expect(db.roleInsert).not.toHaveBeenCalled();
    expect(db.roleDelete).not.toHaveBeenCalled();
  });
  it("adds and removes only explicitly changed roles", async () => {
    await editAccount({ ...edit, roles: ["mentor", "hr_admin", "hr_admin"] });
    expect(db.roleInsert).toHaveBeenCalledWith([{ user_id: "test-user", role: "hr_admin" }]);
    expect(db.roleDelete).toHaveBeenCalledWith(["user"]);
  });
});
