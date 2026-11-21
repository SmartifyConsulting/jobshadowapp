import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Lets a parent/guardian "claim" the account implied by being named as a scholar's
 * guardian_email: they just set a password, no separate registration. Per AGENTS.md, this
 * never sends an email - the account is created/confirmed silently. */
export const claimParentAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(255), password: z.string().min(8).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: match } = await supabaseAdmin.from("scholar_profiles").select("user_id").ilike("guardian_email", data.email).limit(1).maybeSingle();
    if (!match) throw new Error("We couldn't find a scholar profile linked to this email. Check the email address, or ask your scholar to add it as their parent/guardian email on their profile first.");

    let existingId: string | null = null;
    for (let page = 1; ; page++) {
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      const found = users.users.find((u) => u.email?.toLowerCase() === data.email);
      if (found) { existingId = found.id; break; }
      if (users.users.length < 1000) break;
    }

    if (existingId) {
      throw new Error("An account already exists for this email. Please sign in instead, or use 'Forgot your password' if you don't remember it.");
    }

    const created = await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error(created.error?.message ?? "Unable to create account.");
    const userId = created.data.user.id;

    const assigned = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "parent" });
    if (assigned.error) throw new Error(assigned.error.message);

    return { ok: true };
  });
