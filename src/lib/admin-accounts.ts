import { supabase } from "@/integrations/supabase/client";
import type { AccountRow } from "@/lib/users.server";
import { fetchAllRows } from "@/lib/admin-export";

const ROLE_PRIORITY = ["admin", "hr_admin", "mentor", "school", "user"] as const;
const PAGE = 1000;

/** Loads every account, page by page, so the list is never capped at the server's 1000-row limit. */
export async function fetchAllAccounts(): Promise<AccountRow[]> {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.rpc("admin_list_accounts").range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  const reviews = await fetchAllRows(async (from, to) => {
    const result = await supabase.from("account_classification_reviews").select("user_id").order("user_id").range(from, to);
    if (result.error) throw result.error;
    return result.data ?? [];
  });
  const unconfirmed = new Set(reviews.map((row) => String(row["user_id"])));
  return rows.map((row): AccountRow => {
    const roles = row.roles as AccountRow["roles"];
    return { ...row, roles, role: ROLE_PRIORITY.find((r) => roles.includes(r)) ?? null, applications: [], classification_unconfirmed: unconfirmed.has(row.id) };
  });
}
