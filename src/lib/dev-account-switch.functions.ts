import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Dev-only test personas for the account switcher (see SiteLayout.tsx DevAccountSwitcher).
 * Never rendered or callable in production — gated both client-side (import.meta.env.DEV)
 * and here on the server (NODE_ENV check) as defense in depth. */
export const DEV_PERSONAS = [
  { email: "info@georgiaadams.co.za", label: "Georgia Adams — Admin", role: "admin" as const },
  { email: "georgia.adams@smartify.co.za", label: "Internet Solutions — Company", role: "hr_admin" as const },
  { email: "nonastasia@gmail.com", label: "Anastasia — Mentor", role: "mentor" as const },
  { email: "elena@jobshadow.co.za", label: "Elena Nicolettis — Scholar", role: null },
] as const;

/** Shared password for dev-persona accounts; only ever used from the dev-only switcher, never shown to the person signing in. */
export const DEV_PERSONA_PASSWORD = "JobShadowDevSwitch!2026";

/** Ensures a dev persona's auth account, role and demo profile data exist, so its profile is
 * immediately viewable when you switch to it. Idempotent — safe to call every time you switch. */
export const bootstrapDevPersona = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().toLowerCase().email() }).parse(d))
  .handler(async ({ data }) => {
    if (process.env["NODE_ENV"] === "production") throw new Error("Dev account switching is disabled in production.");
    const persona = DEV_PERSONAS.find((p) => p.email.toLowerCase() === data.email);
    if (!persona) throw new Error("Unknown dev persona.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId: string | null = null;
    for (let page = 1; ; page++) {
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      const found = users.users.find((u) => u.email?.toLowerCase() === persona.email);
      if (found) { userId = found.id; break; }
      if (users.users.length < 1000) break;
    }

    if (!userId) {
      const created = await supabaseAdmin.auth.admin.createUser({ email: persona.email, password: DEV_PERSONA_PASSWORD, email_confirm: true });
      if (created.error || !created.data.user) throw new Error(created.error?.message ?? "Unable to create dev persona account.");
      userId = created.data.user.id;
    } else {
      // keep the password in sync in case it was ever changed from a real sign-in during testing
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: DEV_PERSONA_PASSWORD });
    }

    if (persona.role) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: persona.role }, { onConflict: "user_id,role" });
    }

    const personaName = persona.label.split(" — ")[0]!;
    const nameParts = personaName.split(" ");
    await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      first_name: nameParts[0] ?? null,
      last_name: nameParts.slice(1).join(" ") || null,
      display_name: personaName,
      updated_at: new Date().toISOString(),
    });

    if (persona.email === "elena@jobshadow.co.za") {
      const { data: existing } = await supabaseAdmin.from("scholar_profiles").select("user_id").eq("user_id", userId).maybeSingle();
      if (!existing) {
        const now = new Date().toISOString();
        await supabaseAdmin.from("scholar_profiles").insert({
          user_id: userId,
          first_name: "Elena", last_name: "Nicolettis", full_name: "Elena Nicolettis",
          contact_no: "+27821234567", id_number: "0501015800089",
          school: "Reddford House", school_type: "Private School",
          career_interests: "Fashion Design, Marketing",
          dietary: "None",
          guardian_first_name: "Maria", guardian_last_name: "Nicolettis", guardian_name: "Maria Nicolettis",
          guardian_contact: "+27821234568", guardian_email: "maria.nicolettis@example.com",
          population_group: "White", gender: "Female", disability: "None", citizenship: "South African",
          tc_accepted: true, tc_accepted_at: now, popi_accepted: true, popi_accepted_at: now,
        });
      }
    }

    if (persona.email === "georgia.adams@smartify.co.za" || persona.email === "nonastasia@gmail.com") {
      const { data: existingCompany } = await supabaseAdmin.from("companies").select("id").or(`hr_email.eq.${persona.email},mentor_email.eq.${persona.email}`).maybeSingle();
      if (!existingCompany) {
        const { data: maxRow } = await supabaseAdmin.from("companies").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
        const nextId = (maxRow?.id ?? 0) + 1;
        const inAWeek = new Date(Date.now() + 7 * 86400000);
        const dateStr = `${inAWeek.getMonth() + 1}/${inAWeek.getDate()}/${inAWeek.getFullYear()}`;
        await supabaseAdmin.from("companies").insert({
          id: nextId,
          company: "Internet Solutions",
          sector: "Information Technology", career: "Software Developer",
          location: "Cape Town", address: "1 Long Street, Cape Town",
          description: "A digital consultancy building web and mobile products for South African businesses.",
          dates: dateStr, availability: [dateStr],
          hr_name: "Georgia Adams", hr_email: "georgia.adams@smartify.co.za", hr_phone: "+27821112222",
          mentor_name: "Anastasia", mentor_email: "nonastasia@gmail.com", mentor_phone: "+27823334444", mentor_position: "Senior Developer",
          max_applicants: 2, days_per_shadow: 1, amount: 350, mode: "In person", active: true,
        });
      }
    }

    return { ok: true };
  });
