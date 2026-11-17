export type AccountRow = {
  id: string;
  email: string | null;
  created_at: string;
  role: "user" | "mentor" | "hr_admin" | "admin";
  display_name: string | null;
  avatar_path: string | null;
};

const ROLE_PRIORITY = ["admin", "hr_admin", "mentor"] as const;

export async function listAccounts(): Promise<AccountRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const users: { id: string; email: string | null; created_at: string }[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(...data.users.map((u) => ({ id: u.id, email: u.email ?? null, created_at: u.created_at })));
    if (data.users.length < 1000) break;
    page += 1;
  }

  const [{ data: roles }, { data: profiles }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("user_id, role"),
    supabaseAdmin.from("profiles").select("user_id, display_name, avatar_path"),
  ]);

  const roleByUser = new Map<string, string[]>();
  (roles ?? []).forEach((r) => roleByUser.set(r.user_id, [...(roleByUser.get(r.user_id) ?? []), r.role]));
  const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  return users
    .map((u) => {
      const userRoles = roleByUser.get(u.id) ?? [];
      const role = (ROLE_PRIORITY.find((r) => userRoles.includes(r)) ?? "user") as AccountRow["role"];
      const profile = profileByUser.get(u.id);
      return { id: u.id, email: u.email, created_at: u.created_at, role, display_name: profile?.display_name ?? null, avatar_path: profile?.avatar_path ?? null };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function setAccountRole(userId: string, role: AccountRow["role"]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const del = await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  if (del.error) throw new Error(del.error.message);
  if (role === "user") return;
  // The HR admin role isn't in the live database yet (its migration hasn't been applied).
  if (role === "hr_admin") throw new Error("The HR admin role is not available yet.");
  const ins = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
  if (ins.error) throw new Error(ins.error.message);
}
