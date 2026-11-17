import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildSignedIndemnityPdf, standardIndemnityClauses } from "./indemnity-sign.server";

export const signIndemnityDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { bookingId: string; document: "standard" | "company"; guardianName: string; guardianContact: string; signatureDataUrl: string }) => d)
  .handler(async ({ context, data }) => {
    const { data: booking, error: bErr } = await context.supabase.from("bookings").select("*").eq("id", data.bookingId).eq("user_id", context.userId).single();
    if (bErr || !booking) throw new Error("Booking not found.");
    const { data: profile } = await context.supabase.from("scholar_profiles").select("*").eq("user_id", context.userId).maybeSingle();
    const { data: companyRows } = await context.supabase.rpc("get_booking_company_details", { _booking: data.bookingId });
    const company = companyRows?.[0] ?? null;

    if (!data.guardianName.trim() || !data.guardianContact.trim()) throw new Error("Please enter the parent/guardian's name and contact number.");
    if (!data.signatureDataUrl.startsWith("data:image/png")) throw new Error("Please sign before submitting.");

    const placement = {
      scholarName: profile?.full_name ?? "—",
      school: profile?.school ?? "—",
      career: booking.career ?? "—",
      shadowDate: booking.shadow_date,
      location: company?.address || company?.location || booking.location || "—",
    };

    const isCompany = data.document === "company";
    if (isCompany && !company?.custom_indemnity_text) throw new Error("This booking has no company-specific indemnity to sign.");

    const pdfBytes = await buildSignedIndemnityPdf({
      title: isCompany ? `${company?.company ?? "Host"} Indemnity & Consent Form` : "Job Shadow Indemnity & Consent Form",
      clauses: isCompany ? [company!.custom_indemnity_text as string] : standardIndemnityClauses(),
      placement,
      guardianName: data.guardianName.trim(),
      guardianContact: data.guardianContact.trim(),
      signaturePngDataUrl: data.signatureDataUrl,
    });

    const path = `${context.userId}/indemnity-${data.bookingId}-${data.document}-${Date.now()}.pdf`;
    const { error: upErr } = await context.supabase.storage.from("scholar-docs").upload(path, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true });
    if (upErr) throw new Error(upErr.message);

    const rpcName = isCompany ? "set_company_indemnity_path" : "set_indemnity_path";
    const { error: pathErr } = await context.supabase.rpc(rpcName, { _booking: data.bookingId, _path: path });
    if (pathErr) throw new Error(pathErr.message);

    await context.supabase.rpc("submit_indemnity", { _booking: data.bookingId });
    const { data: refreshed } = await context.supabase.from("bookings").select("status").eq("id", data.bookingId).single();
    return { ok: true, confirmed: refreshed?.status === "confirmed" };
  });
