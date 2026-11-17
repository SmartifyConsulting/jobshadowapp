export type AccountRow = {
  id: string;
  email: string | null;
  created_at: string;
  role: "user" | "mentor" | "hr_admin" | "admin";
  display_name: string | null;
  avatar_path: string | null;
  full_name: string | null;
  id_file_path: string | null;
  photo_path: string | null;
  has_profile: boolean;
  is_spam: boolean;
  booking_count: number;
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

  const [{ data: roles }, { data: profiles }, { data: scholars }, { data: legacy }, { data: bookingRows }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("user_id, role"),
    supabaseAdmin.from("profiles").select("user_id, display_name, avatar_path"),
    supabaseAdmin.from("scholar_profiles").select("user_id, full_name, id_file_path, photo_path"),
    supabaseAdmin.from("legacy_users").select("email, has_profile, is_spam"),
    supabaseAdmin.from("bookings").select("user_id"),
  ]);

  const roleByUser = new Map<string, string[]>();
  (roles ?? []).forEach((r) => roleByUser.set(r.user_id, [...(roleByUser.get(r.user_id) ?? []), r.role]));
  const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const scholarByUser = new Map((scholars ?? []).map((s) => [s.user_id, s]));
  const legacyByEmail = new Map((legacy ?? []).map((l) => [(l.email ?? "").trim().toLowerCase(), l]));
  const bookingCountByUser = new Map<string, number>();
  (bookingRows ?? []).forEach((b) => bookingCountByUser.set(b.user_id, (bookingCountByUser.get(b.user_id) ?? 0) + 1));

  return users
    .map((u) => {
      const userRoles = roleByUser.get(u.id) ?? [];
      const role = (ROLE_PRIORITY.find((r) => userRoles.includes(r)) ?? "user") as AccountRow["role"];
      const profile = profileByUser.get(u.id);
      const scholar = scholarByUser.get(u.id);
      const legacyRow = u.email ? legacyByEmail.get(u.email.trim().toLowerCase()) : undefined;
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        role,
        display_name: profile?.display_name ?? null,
        avatar_path: profile?.avatar_path ?? null,
        full_name: scholar?.full_name ?? null,
        id_file_path: scholar?.id_file_path ?? null,
        photo_path: scholar?.photo_path ?? null,
        has_profile: legacyRow?.has_profile ?? false,
        is_spam: legacyRow?.is_spam ?? false,
        booking_count: bookingCountByUser.get(u.id) ?? 0,
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function setAccountRole(userId: string, role: AccountRow["role"]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const del = await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  if (del.error) throw new Error(del.error.message);
  if (role === "user") return;
  const ins = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
  if (ins.error) throw new Error(ins.error.message);
}

export async function deleteAccount(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}
