import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { switchTarget, isSwitchPersona } from "./dev-personas";

/** Switching authenticates only between the four fixed test accounts. It never
 * creates users, changes roles/profiles, emails links, or uses a shared password. */
export const switchDevPersona = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().trim().toLowerCase().email() }).strict().parse(d),
  )
  .handler(async ({ context, data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const callerEmail = typeof context.claims["email"] === "string" ? context.claims["email"] : "";
    const target = switchTarget(context.userId, callerEmail, data.email);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const caller = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const user = await supabaseAdmin.auth.admin.getUserById(target.id);
    if (
      caller.error ||
      !caller.data.user?.email_confirmed_at ||
      (caller.data.user.banned_until && Date.parse(caller.data.user.banned_until) > Date.now()) ||
      !isSwitchPersona(caller.data.user.id, caller.data.user.email)
    )
      throw new Error("This account cannot switch profiles.");
    if (
      user.error ||
      !user.data.user?.email_confirmed_at ||
      (user.data.user.banned_until && Date.parse(user.data.user.banned_until) > Date.now()) ||
      !isSwitchPersona(user.data.user.id, user.data.user.email)
    )
      throw new Error("The test profile is unavailable.");
    const generated = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: target.email,
    });
    if (
      generated.error ||
      generated.data.user?.id !== target.id ||
      !generated.data.properties?.hashed_token
    )
      throw new Error("Unable to switch profile.");
    const { createClient } = await import("@supabase/supabase-js");
    const publicKey = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, publicKey, {
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (
            (publicKey.startsWith("sb_publishable_") || publicKey.startsWith("sb_secret_")) &&
            headers.get("Authorization") === `Bearer ${publicKey}`
          )
            headers.delete("Authorization");
          headers.set("apikey", publicKey);
          return fetch(input, { ...init, headers });
        },
      },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const verified = await client.auth.verifyOtp({
      type: "magiclink",
      token_hash: generated.data.properties.hashed_token,
    });
    const session = verified.data.session;
    if (verified.error || !session || verified.data.user?.id !== target.id)
      throw new Error("Unable to switch profile.");
    return { access_token: session.access_token, refresh_token: session.refresh_token };
  });
