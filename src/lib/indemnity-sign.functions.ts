import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSignedIndemnityPdf, standardIndemnityClauses } from "./indemnity-sign.server";

export const signIndemnityDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bookingId: string; document: "standard" | "company"; guardianName: string; guardianContact: string; signatureDataUrl: string }) => d)
  .handler(async ({ context, data }) => {
    const { data: ctxRows, error: ctxErr } = await context.supabase.rpc("get_indemnity_context", { _booking: data.bookingId });
    const ctx = ctxRows?.[0];
    if (ctxErr || !ctx) throw new Error(ctxErr?.message ?? "Booking not found.");
    if (ctx.viewer_role !== "guardian") throw new Error("Only the linked parent/guardian can sign this document — please sign in with the parent/guardian account instead.");

    if (!data.guardianName.trim() || !data.guardianContact.trim()) throw new Error("Please enter the parent/guardian's name and contact number.");
    if (!data.signatureDataUrl.startsWith("data:image/png")) throw new Error("Please sign before submitting.");

    const isCompany = data.document === "company";
    if (isCompany && !ctx.custom_indemnity_text) throw new Error("This booking has no company-specific indemnity to sign.");

    const pdfBytes = await buildSignedIndemnityPdf({
      title: isCompany ? `${ctx.company ?? "Host"} Indemnity & Consent Form` : "Job Shadow Indemnity & Consent Form",
      clauses: isCompany ? [ctx.custom_indemnity_text as string] : standardIndemnityClauses(),
      placement: { scholarName: ctx.scholar_name ?? "—", school: ctx.school ?? "—", career: ctx.career ?? "—", shadowDate: ctx.shadow_date, location: ctx.location ?? "—" },
      guardianName: data.guardianName.trim(),
      guardianContact: data.guardianContact.trim(),
      signaturePngDataUrl: data.signatureDataUrl,
    });

    const path = `${context.userId}/indemnity-${data.bookingId}-${data.document}-${Date.now()}.pdf`;
    const { error: upErr } = await context.supabase.storage.from("scholar-docs").upload(path, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true });
    if (upErr) throw new Error(upErr.message);

    const { error: signErr } = await context.supabase.rpc("submit_guardian_signature", { _booking: data.bookingId, _document: data.document, _path: path });
    if (signErr) throw new Error(signErr.message);
    const { data: refreshed } = await context.supabase.from("bookings").select("status").eq("id", data.bookingId).maybeSingle();
    return { ok: true, confirmed: refreshed?.status === "confirmed" };
  });
