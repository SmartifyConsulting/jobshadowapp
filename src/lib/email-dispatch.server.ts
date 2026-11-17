import { renderEmailHtml } from "./email-template";

const FROM_ADDRESS = "Job Shadow <bookings@jobshadow.co.za>";

/**
 * Set EMAIL_SAFE_MODE=true while testing against live data so nothing ever reaches a real
 * student, guardian or mentor. Every email is redirected to EMAIL_SAFE_MODE_RECIPIENT (or
 * info@jobshadow.co.za) instead, with the real recipient noted in the subject.
 */
function safeModeRecipient(): string | null {
  if (!process.env["EMAIL_SAFE_MODE"]) return null;
  return process.env["EMAIL_SAFE_MODE_RECIPIENT"] || "info@jobshadow.co.za";
}

export async function dispatchQueuedEmails(ids?: string[]) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  const safeMode = safeModeRecipient();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let q = supabaseAdmin.from("email_outbox").select("*").eq("status", "queued").order("created_at").limit(50);
  if (ids?.length) q = q.in("id", ids);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const row of rows ?? []) {
    const realTo = [...new Set((row.recipient ?? "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean))];
    if (!realTo.length && !safeMode) {
      await supabaseAdmin.from("email_outbox").update({ status: "failed" }).eq("id", row.id);
      results.push({ id: row.id, ok: false, error: "no recipient on file" });
      continue;
    }
    const to = safeMode ? [safeMode] : realTo;
    const subject = safeMode ? `[TEST - would go to: ${realTo.join(", ") || "(none)"}] ${row.subject}` : row.subject;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDRESS, to, reply_to: "info@jobshadow.co.za", subject,
        html: renderEmailHtml({ template: row.template, subject: row.subject, body: row.body }), text: row.body,
      }),
    });
    if (res.ok) {
      await supabaseAdmin.from("email_outbox").update({ status: "sent" }).eq("id", row.id);
      results.push({ id: row.id, ok: true });
    } else {
      const err = await res.text();
      console.error(`Resend failed [${res.status}]: ${err}`);
      await supabaseAdmin.from("email_outbox").update({ status: "failed" }).eq("id", row.id);
      results.push({ id: row.id, ok: false, error: `[${res.status}] ${err}` });
    }
  }
  return { processed: results.length, sent: results.filter((r) => r.ok).length, results };
}
