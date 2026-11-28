import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { getRequestIP } from "@tanstack/react-start/server";
import { guardianDb, scholarAccess, signingContext, type GuardianActor } from "./guardian.server";
import { buildSignedIndemnityPdf } from "./indemnity-sign.server";
import { signatureFont } from "./guardian-contract";

type Submission = { scholarId?: string | undefined; bookingId?: string | undefined; mentor?: boolean | undefined; key: string; section: string; hash: string; mode: "typed" | "drawn"; typedName: string; signatureDataUrl: string; accepted: true };
export function signatureImage(dataUrl: string) {
  if (!dataUrl.startsWith("data:image/png;base64,")) throw new Error("Provide a PNG signature.");
  const bytes = Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");
  if (bytes.length < 24 || bytes.length > 350_000 || bytes.subarray(0,8).toString("hex") !== "89504e470d0a1a0a") throw new Error("The signature image is invalid.");
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (!width || !height || width>2000 || height>700) throw new Error("The signature image is too large.");
  return bytes;
}
export async function storeFormSignature(actor: GuardianActor, data: Submission) {
  const context = await signingContext(actor, data);
  const form = context.forms.find((f) => f.key===data.key && f.section===data.section);
  if (!form || form.hash!==data.hash) throw new Error("The form has changed. Reload and read the latest version before signing.");
  if (!context.canSign.includes(`${form.key}:${form.section}`) || !form.signers.includes(context.role)) throw new Error("You cannot sign in this person's signature space.");
  if (!data.accepted) throw new Error("Confirm that you have read and agree to this form.");
  if (!context.signerName.trim()) throw new Error("Complete your own name before signing.");
  if (data.mode==="typed" && data.typedName.trim().replace(/\s+/g," ").toLocaleLowerCase()!==context.signerName.trim().replace(/\s+/g," ").toLocaleLowerCase()) throw new Error("Type your own full name as shown on your account.");
  const png = signatureImage(data.signatureDataUrl);
  const existing = await guardianDb.from("document_signature_events").select("id").eq("signer_user_id",actor.userId).eq("document_hash",form.hash).eq("document_key",form.key).eq("document_section",form.section).eq("scholar_user_id",data.mentor ? actor.userId : context.scholarId).limit(1).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return { id: existing.data.id as string, alreadySigned: true };
  const now = new Date().toISOString();
  // Use the server/runtime connection address. Never accept an IP or timestamp in the payload.
  const detectedIp = getRequestIP();
  const ip = detectedIp && isIP(detectedIp) ? detectedIp : null;
  const id = randomUUID();
  const folder = data.mentor ? actor.userId : context.scholarId;
  const basePath = `${folder}/signatures/${data.bookingId ?? "account"}/${id}`;
  const pngPath = `${basePath}.png`, pdfPath = `${basePath}.pdf`;
  const pdf = await buildSignedIndemnityPdf({ title: form.title, clauses: form.body.split(/\n\s*\n/), placement: { scholarName: String(context.profile["full_name"] ?? context.signerName), school: String(context.profile["school"] ?? "—"), career: String(context.booking?.["career"] ?? "—"), shadowDate: String(context.booking?.["shadow_date"] ?? "—"), location: String(context.booking?.["location"] ?? "—") }, guardianName: context.signerName, guardianContact: String(context.role==="parent" ? context.profile["guardian_contact"] ?? "" : context.profile["contact_no"] ?? ""), signaturePngDataUrl: data.signatureDataUrl, signedAt: now, signerIp: ip, signerRole: context.role, documentHash: form.hash });
  const uploads = await Promise.all([
    guardianDb.storage.from("scholar-docs").upload(pngPath,png,{contentType:"image/png",upsert:false}),
    guardianDb.storage.from("scholar-docs").upload(pdfPath,Buffer.from(pdf),{contentType:"application/pdf",upsert:false}),
  ]);
  if (uploads.some((r)=>r.error)) { await guardianDb.storage.from("scholar-docs").remove([pngPath,pdfPath]); throw new Error("Your signature could not be saved. Please try again."); }
  const event = await guardianDb.from("document_signature_events").insert({ id, scholar_user_id: data.mentor ? null : context.scholarId, booking_id: data.bookingId ?? null, signer_user_id: actor.userId, signer_account_id: actor.userId, signer_name: context.signerName, signer_role: context.role, document_key:form.key, document_section:form.section, legacy_document:form.legacy, document_body:`${form.title}\n\n${form.body}`, document_hash:form.hash, signature_mode:data.mode, signature_font:data.mode==="typed" ? signatureFont(context.role) : null, signature_path:pngPath,pdf_path:pdfPath,signed_at:now,signer_ip:ip });
  if (event.error) { await guardianDb.storage.from("scholar-docs").remove([pngPath,pdfPath]); throw new Error("Your signature could not be recorded. Please try again."); }
  if (data.bookingId && form.legacy && context.role==="parent") {
    const result = await actor.supabase.rpc("submit_guardian_signature",{_booking:data.bookingId,_document:form.legacy,_path:pdfPath});
    if (result.error) throw new Error(result.error.message);
  }
  if (data.bookingId) {
    const result = await actor.supabase.rpc("finalize_booking_forms",{_booking:data.bookingId});
    if (result.error) throw new Error(result.error.message);
  }
  return { id, alreadySigned:false };
}
export async function signedFormDownload(actor: GuardianActor, id: string) {
  const result = await guardianDb.from("document_signature_events").select("signer_user_id,scholar_user_id,pdf_path").eq("id",id).single();
  if (result.error || !result.data) throw new Error("Signed form not found.");
  if (result.data.signer_user_id!==actor.userId) {
    if (!result.data.scholar_user_id) throw new Error("You cannot view this signed form.");
    await scholarAccess(actor,result.data.scholar_user_id);
  }
  const url = await guardianDb.storage.from("scholar-docs").createSignedUrl(result.data.pdf_path,120);
  if (url.error || !url.data) throw new Error("The signed form could not be opened.");
  return { url:url.data.signedUrl };
}
