import { getUserApplications, type AccountApplication } from "./user-applications";

export type AccountRow = {
  id: string;
  email: string | null;
  created_at: string;
  role: "user" | "mentor" | "hr_admin" | "school" | "admin" | "parent" | null;
  roles: ("user" | "mentor" | "hr_admin" | "school" | "admin" | "parent")[];
  has_scholar_profile: boolean;
  classification_unconfirmed?: boolean;
  first_name?: string | null | undefined;
  last_name?: string | null | undefined;
  scholar_first_name?: string | null | undefined;
  scholar_last_name?: string | null | undefined;
  display_name: string | null;
  avatar_path: string | null;
  full_name: string | null;
  contact_no: string | null;
  school: string | null;
  school_country_code?: string | null | undefined;
  id_number: string | null;
  applications: AccountApplication[];
  id_file_path: string | null;
  photo_path: string | null;
  id_verified: boolean | null;
  has_profile: boolean;
  is_spam: boolean;
  booking_count: number;
  self_registered: boolean;
  last_accessed_at: string | null;
};

const ROLE_PRIORITY = ["admin", "hr_admin", "mentor", "school", "user"] as const;

async function readAllRows<T>(
  load: (
    from: number,
    to: number,
  ) => Promise<{ data: T[] | null; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await load(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

export async function listAccounts(): Promise<AccountRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const users: {
    id: string;
    email: string | null;
    created_at: string;
    last_accessed_at: string | null;
  }[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(
      ...data.users.map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        last_accessed_at: u.last_sign_in_at ?? null,
      })),
    );
    if (data.users.length < 1000) break;
    page += 1;
  }

  const [
    { data: roles },
    { data: profiles },
    { data: scholars },
    { data: legacy },
    bookingRows,
    applicationRows,
  ] = await Promise.all([
    (async () => ({
      data: await readAllRows(
        async (from, to) =>
          await supabaseAdmin
            .from("user_roles")
            .select("user_id, role")
            .order("user_id")
            .order("role")
            .range(from, to),
      ),
    }))(),
    (async () => ({
      data: await readAllRows(
        async (from, to) =>
          await supabaseAdmin
            .from("profiles")
            .select("user_id, display_name, avatar_path, first_name, last_name, self_registered")
            .order("user_id")
            .range(from, to),
      ),
    }))(),
    (async () => ({
      data: await readAllRows(
        async (from, to) =>
          await supabaseAdmin
            .from("scholar_profiles")
            .select(
              "user_id, full_name, first_name, last_name, contact_no, school, school_country_code, id_number, id_file_path, photo_path, id_verified",
            )
            .order("user_id")
            .range(from, to),
      ),
    }))(),
    (async () => ({
      data: await readAllRows(
        async (from, to) =>
          await supabaseAdmin
            .from("legacy_users")
            .select("email, name, first_name, last_name, has_profile, is_spam")
            .order("id")
            .range(from, to),
      ),
    }))(),
    readAllRows(
      async (from, to) =>
        await supabaseAdmin
          .from("bookings")
          .select("id, user_id, company, career, shadow_date, paid_at, indemnity_received, status")
          .order("created_at", { ascending: false })
          .order("id")
          .range(from, to),
    ),
    readAllRows(
      async (from, to) =>
        await supabaseAdmin
          .from("legacy_applications")
          .select(
            "id, name, email, contact, school, id_number, company, career, dates, paid, indemnity, cancelled",
          )
          .order("id", { ascending: false })
          .range(from, to),
    ),
  ]);

  const roleByUser = new Map<string, string[]>();
  (roles ?? []).forEach((r) =>
    roleByUser.set(r.user_id, [...(roleByUser.get(r.user_id) ?? []), r.role]),
  );
  const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const scholarByUser = new Map((scholars ?? []).map((s) => [s.user_id, s]));
  const legacyByEmail = new Map(
    (legacy ?? []).map((l) => [(l.email ?? "").trim().toLowerCase(), l]),
  );
  const bookingCountByUser = new Map<string, number>();
  (bookingRows ?? []).forEach((b) =>
    bookingCountByUser.set(b.user_id, (bookingCountByUser.get(b.user_id) ?? 0) + 1),
  );

  return users
    .map((u) => {
      const userRoles = roleByUser.get(u.id) ?? [];
      const role = ROLE_PRIORITY.find((r) => userRoles.includes(r)) ?? null;
      const profile = profileByUser.get(u.id);
      const scholar = scholarByUser.get(u.id);
      const { latestImported, applications } = getUserApplications(u, applicationRows, bookingRows);
      const legacyRow = u.email ? legacyByEmail.get(u.email.trim().toLowerCase()) : undefined;
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        role,
        roles: [...new Set(userRoles)] as AccountRow["roles"],
        has_scholar_profile: !!scholar,
        first_name: profile?.first_name ?? legacyRow?.first_name ?? null,
        last_name: profile?.last_name ?? legacyRow?.last_name ?? null,
        scholar_first_name: scholar?.first_name ?? null,
        scholar_last_name: scholar?.last_name ?? null,
        display_name: profile?.display_name ?? legacyRow?.name ?? null,
        avatar_path: profile?.avatar_path ?? null,
        full_name: scholar?.full_name || latestImported?.name || null,
        contact_no: scholar?.contact_no || latestImported?.contact || null,
        school: scholar?.school || latestImported?.school || null,
        school_country_code: scholar?.school_country_code ?? null,
        id_number: scholar?.id_number || latestImported?.id_number || null,
        applications,
        id_file_path: scholar?.id_file_path ?? null,
        photo_path: scholar?.photo_path ?? null,
        id_verified: scholar?.id_verified ?? null,
        has_profile: legacyRow?.has_profile ?? false,
        is_spam: legacyRow?.is_spam ?? false,
        booking_count: bookingCountByUser.get(u.id) ?? 0,
        self_registered: profile?.self_registered ?? true,
        last_accessed_at: u.last_accessed_at,
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export type AccountEdit = {
  userId: string;
  display_name: string;
  full_name: string;
  contact_no: string;
  school: string;
  id_number: string;
  roles: AccountRow["roles"];
  first_name?: string | null | undefined;
  last_name?: string | null | undefined;
  scholar_first_name?: string | null | undefined;
  scholar_last_name?: string | null | undefined;
};

export async function editAccount(data: AccountEdit) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const profile = await supabaseAdmin
    .from("profiles")
    .upsert({
      user_id: data.userId,
      display_name: data.display_name,
      ...(data.first_name !== undefined ? { first_name: data.first_name } : {}),
      ...(data.last_name !== undefined ? { last_name: data.last_name } : {}),
    });
  if (profile.error) throw new Error(profile.error.message);
  // Never create scholar consent or a profile on the user's behalf.
  const scholar = await supabaseAdmin
    .from("scholar_profiles")
    .update({
      full_name: data.full_name,
      contact_no: data.contact_no,
      school: data.school,
      id_number: data.id_number,
      ...(data.scholar_first_name !== undefined ? { first_name: data.scholar_first_name } : {}),
      ...(data.scholar_last_name !== undefined ? { last_name: data.scholar_last_name } : {}),
    })
    .eq("user_id", data.userId);
  if (scholar.error) throw new Error(scholar.error.message);
  const current = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId);
  if (current.error) throw new Error(current.error.message);
  const wanted = [...new Set(data.roles)];
  const existing = (current.data ?? []).map((r) => r.role);
  const added = wanted.filter((role) => !existing.includes(role));
  if (added.length) {
    const result = await supabaseAdmin
      .from("user_roles")
      .insert(added.map((role) => ({ user_id: data.userId, role })));
    if (result.error) throw new Error(result.error.message);
  }
  const removed = existing.filter((role) => !wanted.includes(role));
  if (removed.length) {
    const result = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .in("role", removed);
    if (result.error) throw new Error(result.error.message);
  }
}

export async function deleteAccount(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
}

/** Admin account creation deliberately sends no invitation, confirmation or password email. */
export async function createAccountSilently(
  email: string,
  name: string,
  role: AccountRow["roles"][number],
  parts?: { first_name: string; last_name: string },
  selfRegistered = true,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const created = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { name, display_name: name, ...parts },
  });
  if (created.error || !created.data.user)
    throw new Error(created.error?.message ?? "Unable to create account.");
  const id = created.data.user.id;
  try {
    const profile = await supabaseAdmin
      .from("profiles")
      .upsert({ user_id: id, display_name: name, self_registered: selfRegistered, ...parts });
    if (profile.error) throw profile.error;
    const removed = await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    if (removed.error) throw removed.error;
    const assigned = await supabaseAdmin.from("user_roles").insert({ user_id: id, role });
    if (assigned.error) throw assigned.error;
    return { id, email, emailSent: false };
  } catch (error) {
    // Deleting an auth account also reconciles legacy applications by email.
    // Keep the unconfirmed account for repair rather than risk deleting imported history.
    const reason =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Setup failed";
    throw new Error(
      `The account was created without email, but setup is incomplete: ${reason}. Refresh Users and edit this account to finish setup.`,
    );
  }
}
