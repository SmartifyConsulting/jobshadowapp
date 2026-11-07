import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_ADDRESS = "Job Shadow <bookings@jobshadow.co.za>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY secret not set" }), { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let ids: string[] | null = null;
  try {
    const body = await req.json();
    if (Array.isArray(body?.ids)) ids = body.ids;
  } catch {
    // no body — process whatever is queued
  }

  let query = supabase.from("email_outbox").select("*").eq("status", "queued");
  if (ids && ids.length > 0) query = query.in("id", ids);
  const { data: rows, error } = await query;
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const row of rows ?? []) {
    if (!row.recipient) {
      await supabase.from("email_outbox").update({ status: "failed" }).eq("id", row.id);
      results.push({ id: row.id, ok: false, error: "no recipient on file" });
      continue;
    }
    const to = row.recipient.split(",").map((s: string) => s.trim()).filter(Boolean);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject: row.subject, text: row.body }),
    });
    if (res.ok) {
      await supabase.from("email_outbox").update({ status: "sent" }).eq("id", row.id);
      results.push({ id: row.id, ok: true });
    } else {
      const errText = await res.text();
      await supabase.from("email_outbox").update({ status: "failed" }).eq("id", row.id);
      results.push({ id: row.id, ok: false, error: errText });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
