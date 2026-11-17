import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { renderEmailHtml } from "./email-template";

const ORIGINS = ["https://jobshadow.co.za", "https://www.jobshadow.co.za", "https://apply.jobshadow.co.za", "https://jobshadowapp.lovable.app"];

/** Public: always resolves ok so it never reveals whether an account exists. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().email().max(255), origin: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["RESEND_API_KEY"];
    if (!key) throw new Error("RESEND_API_KEY is not configured");
    const origin = ORIGINS.includes(data.origin) || /^https:\/\/[a-z0-9-]+\.(lovable\.app|lovableproject\.com)$/.test(data.origin) || data.origin.startsWith("http://localhost") ? data.origin : ORIGINS[0];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery", email: data.email, options: { redirectTo: `${origin}/reset-password` },
    });
    if (error || !link?.properties?.action_link) return { ok: true };
    const url = link.properties.action_link;
    const subject = "JobShadow: Reset your password";
    const body = `We received a request to reset the password for your Job Shadow account.\n\nClick the button below to choose a new password. This link expires in 1 hour.\n\nIf the button does not work, copy this link into your browser: ${url}\n\nIf you did not request a password reset, you can safely ignore this email.`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Job Shadow <bookings@jobshadow.co.za>", to: [data.email], reply_to: "info@jobshadow.co.za", subject,
        html: renderEmailHtml({ template: "password_reset", subject, body, ctaUrl: url }), text: body,
      }),
    });
    if (!res.ok) console.error(`Resend reset failed [${res.status}]: ${await res.text()}`);
    return { ok: true };
  });
