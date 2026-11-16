import { renderEmailHtml } from "./email-template";

const FROM_ADDRESS = "Job Shadow <bookings@jobshadow.co.za>";

export async function dispatchQueuedEmails(ids?: string[]) {
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let q = supabaseAdmin.from("email_outbox").select("*").eq("status", "queued").order("created_at").limit(50);
  if (ids?.length) q = q.in("id", ids);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const row of rows ?? []) {
    const to = [...new Set((row.recipient ?? "").split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean))];
    if (!to.length) {
      await supabaseAdmin.from("email_outbox").update({ status: "failed" }).eq("id", row.id);
      results.push({ id: row.id, ok: false, error: "no recipient on file" });
      continue;
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDRESS, to, reply_to: "info@jobshadow.co.za", subject: row.subject,
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
