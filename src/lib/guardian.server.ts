import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { EMAIL_DELIVERY_PAUSED } from "./development-email";
import { renderEmailHtml, SITE_URL } from "./email-template";
import { formParts, legalBlocks, type FormSignerRole, type SigningForm } from "./guardian-contract";

export type GuardianActor = { userId: string; supabase: SupabaseClient };
export const guardianDb = supabaseAdmin as unknown as SupabaseClient;
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const fail = (error: unknown) => { if (error) throw new Error((error as { message?: string }).message ?? "The request could not be completed."); };

export async function ownAccount(actor: GuardianActor) {
  const result = await supabaseAdmin.auth.admin.getUserById(actor.userId);
  fail(result.error);
  if (!result.data.user) throw new Error("Sign in to continue.");
  return result.data.user;
}
export async function scholarAccess(actor: GuardianActor, scholarId: string) {
  if (actor.userId === scholarId) return "scholar" as const;
  const result = await actor.supabase.rpc("is_shared_guardian", { _scholar: scholarId });
  fail(result.error);
  if (result.data !== true) throw new Error("This scholar profile is not linked to your account.");
  return "parent" as const;
}
export async function profileFor(scholarId: string) {
  const result = await guardianDb.from("scholar_profiles").select("*").eq("user_id", scholarId).maybeSingle();
  fail(result.error);
  if (!result.data) throw new Error("Complete the scholar profile first.");
  return result.data;
}
export async function guardianState(actor: GuardianActor) {
  const profile = await profileFor(actor.userId);
  const activated = await actor.supabase.rpc("has_activated_guardian", { _scholar: actor.userId });
  fail(activated.error);
  return { activated: activated.data === true, email: String(profile.guardian_email ?? ""), deliveryPaused: EMAIL_DELIVERY_PAUSED };
}
async function notification(row: { scholar_user_id: string; invitation_id?: string; booking_id?: string; kind: string; recipient: string; subject: string; body: string; url: string }) {
  const html = renderEmailHtml({ template: row.kind, subject: row.subject, body: row.body, ctaUrl: row.url });
  const saved = await guardianDb.from("guardian_notification_outbox").insert({
    scholar_user_id: row.scholar_user_id, invitation_id: row.invitation_id ?? null, booking_id: row.booking_id ?? null,
    kind: row.kind, recipient: row.recipient, subject: row.subject, html_body: html, text_body: row.body,
    status: EMAIL_DELIVERY_PAUSED ? "blocked_dev" : "queued",
  }).select("id").single();
  fail(saved.error);
  if (!saved.data) throw new Error("The notification could not be queued.");
  // Hard development stop, shared with all other account email actions. No provider request.
  if (EMAIL_DELIVERY_PAUSED) return { paused: true };
  const key = process.env["RESEND_API_KEY"];
  if (!key) throw new Error("Email delivery is not configured.");
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: "Job Shadow <bookings@jobshadow.co.za>", to: [row.recipient], reply_to: "info@jobshadow.co.za", subject: row.subject, html, text: row.body }) });
  const result = await response.json().catch(() => ({})) as { id?: string };
  const update = await guardianDb.from("guardian_notification_outbox").update({ status: response.ok ? "sent" : "failed", sent_at: response.ok ? new Date().toISOString() : null, resend_message_id: result.id ?? null }).eq("id", saved.data.id);
  fail(update.error);
  if (!response.ok) throw new Error("The email could not be sent. Please try again later.");
  return { paused: false };
}
export async function issueGuardianInvitation(actor: GuardianActor, scholarId = actor.userId) {
  if (actor.userId !== scholarId) {
    const admin = await actor.supabase.rpc("has_role", { _user_id: actor.userId, _role: "admin" });
    if (admin.data !== true) throw new Error("Only an administrator can invite on another scholar's behalf.");
  }
  const profile = await profileFor(scholarId);
  const email = String(profile.guardian_email ?? "").trim().toLowerCase();
  if (!email) throw new Error("Enter the parent/guardian email in the scholar profile first.");
  const account = await ownAccount(actor);
  if (account.id === scholarId && account.email?.toLowerCase() === email) throw new Error("The parent/guardian needs a separate email and account.");
  const existing = await guardianDb.from("guardian_invitations").select("id").eq("scholar_user_id", scholarId).eq("guardian_email", email).is("revoked_at", null).is("accepted_at", null).gt("expires_at", new Date().toISOString()).limit(1).maybeSingle();
  fail(existing.error);
  if (existing.data) return { pending: true, deliveryPaused: EMAIL_DELIVERY_PAUSED };
  const token = randomBytes(32).toString("hex");
  const invitation = await guardianDb.from("guardian_invitations").insert({ scholar_user_id: scholarId, guardian_email: email, token_hash: tokenHash(token), created_by: actor.userId }).select("id").single();
  fail(invitation.error);
  if (!invitation.data) throw new Error("The invitation could not be created.");
  const url = `${SITE_URL}/parent-signup?invite=${invitation.data.id}#token=${token}`;
  await notification({ scholar_user_id: scholarId, invitation_id: invitation.data.id, kind: "guardian_invitation", recipient: email, subject: "Job Shadow: Activate your parent/guardian account", body: `You have been named as the parent/guardian for ${profile["full_name"] || "a scholar"}.\n\nCreate an account or sign in to review their profile and sign the required forms. Your access is read-only except for your own signatures. This invitation expires in seven days.\n\n${url}`, url });
  return { pending: true, deliveryPaused: EMAIL_DELIVERY_PAUSED };
}
async function validInvitation(invite: string, token: string) {
  const result = await guardianDb.from("guardian_invitations").select("*").eq("id", invite).eq("token_hash", tokenHash(token)).is("accepted_at", null).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  fail(result.error);
  if (!result.data) throw new Error("This invitation has expired or has already been used.");
  const profile = await profileFor(result.data.scholar_user_id);
  if (String(profile.guardian_email).trim().toLowerCase() !== result.data.guardian_email) throw new Error("The parent/guardian details have changed. Ask for a new invitation.");
  return { invitation: result.data, profile };
}
async function findAccount(email: string) {
  for (let page = 1; page <= 1000; page++) {
    const result = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    fail(result.error);
    const found = result.data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found;
    if (result.data.users.length < 1000) return null;
  }
  throw new Error("Account lookup is temporarily unavailable.");
}
export async function invitationInfo(invite: string, token: string) {
  const { invitation, profile } = await validInvitation(invite, token);
  return { email: invitation.guardian_email as string, scholarName: String(profile.full_name ?? "your scholar"), parentName: String(profile.guardian_name ?? ""), existingAccount: !!(await findAccount(invitation.guardian_email)) };
}
export async function prepareParentAccount(data: { invite: string; token: string; password: string; firstName: string; lastName: string }) {
  const { invitation } = await validInvitation(data.invite, data.token);
  if (await findAccount(invitation.guardian_email)) return { existingAccount: true, email: invitation.guardian_email as string };
  const name = `${data.firstName.trim()} ${data.lastName.trim()}`;
  // The one-use invitation proves possession of the named parent's activation link.
  // createUser never sends a Supabase invitation or confirmation email.
  const created = await supabaseAdmin.auth.admin.createUser({ email: invitation.guardian_email, password: data.password, email_confirm: true, user_metadata: { first_name: data.firstName.trim(), last_name: data.lastName.trim(), display_name: name } });
  fail(created.error);
  if (!created.data.user) throw new Error("The parent account could not be created.");
  const profile = await guardianDb.from("profiles").upsert({ user_id: created.data.user.id, first_name: data.firstName.trim(), last_name: data.lastName.trim(), display_name: name });
  fail(profile.error);
  return { existingAccount: false, email: invitation.guardian_email as string };
}
export async function acceptGuardianInvitation(actor: GuardianActor, invite: string, token: string) {
  const { invitation } = await validInvitation(invite, token);
  const account = await ownAccount(actor);
  if (!account.email_confirmed_at || account.email?.toLowerCase() !== invitation.guardian_email) throw new Error("Sign in with the parent/guardian account named on this invitation.");
  const accepted = await guardianDb.rpc("accept_guardian_invitation", { _invite: invite, _guardian: actor.userId, _token_hash: tokenHash(token) });
  fail(accepted.error);
  return { scholarId: invitation.scholar_user_id as string };
}
export async function sharedChild(actor: GuardianActor, scholarId: string) {
  await scholarAccess(actor, scholarId);
  const [profile, bookings] = await Promise.all([actor.supabase.from("scholar_profiles").select("*").eq("user_id", scholarId).single(), actor.supabase.from("bookings").select("*").eq("user_id", scholarId).order("created_at", { ascending: false })]);
  fail(profile.error); fail(bookings.error);
  return { profile: profile.data as Record<string, Json>, bookings: bookings.data ?? [] };
}
export async function signingContext(actor: GuardianActor, input: { scholarId?: string | undefined; bookingId?: string | undefined; mentor?: boolean | undefined }) {
  const account = await ownAccount(actor);
  let role: FormSignerRole, profile: Record<string, Json> = {}, booking: Record<string, Json> | null = null;
  let scholarId = input.scholarId ?? actor.userId;
  if (input.mentor) {
    const roles = await guardianDb.from("user_roles").select("role").eq("user_id", actor.userId);
    fail(roles.error);
    role = (roles.data ?? []).some((r) => r.role === "hr_admin") ? "hr_admin" : "mentor";
    if (!(roles.data ?? []).some((r) => r.role === role)) throw new Error("Only mentors and company representatives can sign this form.");
  } else {
    if (input.bookingId) {
      const row = await guardianDb.from("bookings").select("*").eq("id", input.bookingId).maybeSingle();
      fail(row.error); if (!row.data) throw new Error("Booking not found.");
      booking = row.data; scholarId = String(row.data.user_id);
    }
    role = await scholarAccess(actor, scholarId);
    profile = await profileFor(scholarId);
  }
  const ownProfile = await guardianDb.from("profiles").select("first_name,last_name,display_name").eq("user_id", actor.userId).maybeSingle();
  fail(ownProfile.error);
  const ownName = [ownProfile.data?.first_name, ownProfile.data?.last_name].filter(Boolean).join(" ") || ownProfile.data?.display_name || String(account.user_metadata["display_name"] ?? "");
  const signerName = role === "scholar" ? String(profile["full_name"] ?? ownName) : ownName || String(profile["guardian_name"] ?? "");
  const docs = await guardianDb.from("legal_documents").select("key,title,body").in("key", ["consent_forms", "standard_indemnity_clauses"]);
  fail(docs.error);
  const forms: SigningForm[] = [];
  for (const doc of docs.data ?? []) {
    if (doc.key === "consent_forms") for (const part of formParts(doc.body)) {
      if (!part.section || (input.mentor ? part.section !== "C" : part.section === "C")) continue;
      const hash = tokenHash(`${part.title}\n\n${part.body}`);
      forms.push({ key: doc.key, section: part.section, title: part.title, body: part.body, hash, signers: part.section === "C" ? [role] : ["scholar", "parent"], legacy: null });
    }
    else if (!input.mentor) {
      const title = "Form C: Standard JobShadow Indemnity Clauses", body = legalBlocks(doc.body).join("\n\n");
      forms.push({ key: doc.key, section: "C", title, body, hash: tokenHash(`${title}\n\n${body}`), signers: ["parent"], legacy: "standard" });
    }
  }
  if (booking) {
    const company = await guardianDb.from("companies").select("custom_indemnity_text,company").eq("id", booking["company_id"]).maybeSingle();
    fail(company.error);
    if (company.data?.custom_indemnity_text) {
      const title = `${company.data.company} Indemnity`, body = String(company.data.custom_indemnity_text);
      forms.push({ key: "company_indemnity", section: "", title, body, hash: tokenHash(`${title}\n\n${body}`), signers: ["parent"], legacy: "company" });
    }
  }
  const receiptsQuery = guardianDb.from("document_signature_events").select("id,signer_role,signer_name,signed_at,signer_ip,document_hash,pdf_path,booking_id,document_key,document_section").order("signed_at", { ascending: false });
  const receipts = await (input.mentor ? receiptsQuery.eq("signer_user_id", actor.userId).eq("document_key", "consent_forms").eq("document_section", "C") : receiptsQuery.eq("scholar_user_id", scholarId));
  fail(receipts.error);
  const visibleReceipts = (receipts.data ?? []).filter((r) => input.mentor || (r.document_key === "consent_forms" && r.document_section === "A") || r.booking_id === input.bookingId);
  const activated = input.mentor ? { data: true, error: null } : await actor.supabase.rpc("has_activated_guardian", { _scholar: scholarId });
  fail(activated.error);
  const paid = !!booking?.["paid_at"] && ["indemnity_required", "confirmed"].includes(String(booking?.["status"]));
  return { role, signerName, scholarId, forms: forms.sort((a,b) => a.section.localeCompare(b.section)), receipts: visibleReceipts, profile, booking, activated: activated.data === true, canSign: forms.filter((f) => f.signers.includes(role) && (input.mentor || (activated.data === true && (f.key === "consent_forms" && f.section === "A" || paid)))).map((f) => `${f.key}:${f.section}`) };
}
export async function requestGuardianSignature(actor: GuardianActor, bookingId: string) {
  const context = await signingContext(actor, { bookingId });
  if (context.role !== "scholar" || !context.booking?.["paid_at"]) throw new Error("Only the scholar can request a signature for their paid booking.");
  const recent = await guardianDb.from("guardian_notification_outbox").select("id").eq("booking_id", bookingId).eq("kind", "signature_request").gte("created_at", new Date(Date.now()-15*60_000).toISOString()).limit(1);
  fail(recent.error);
  if (recent.data?.length) return { pending: true, deliveryPaused: EMAIL_DELIVERY_PAUSED };
  const email = String(context.profile["guardian_email"] ?? "").trim().toLowerCase();
  const url = `${SITE_URL}/parent?booking=${bookingId}`;
  await notification({ scholar_user_id: context.scholarId, booking_id: bookingId, kind: "signature_request", recipient: email, subject: "Job Shadow: Your signature is needed", body: `${context.profile["full_name"]} has forms ready for your signature.\n\nSign in to your parent/guardian account to review the forms and sign in your own signature spaces.\n\n${url}`, url });
  return { pending: true, deliveryPaused: EMAIL_DELIVERY_PAUSED };
}
export async function adminGuardianMessages(actor: GuardianActor) {
  const allowed = await actor.supabase.rpc("has_role", { _user_id: actor.userId, _role: "admin" });
  if (allowed.data !== true) throw new Error("Admin access is required.");
  const result = await guardianDb.from("guardian_notification_outbox").select("id,recipient,subject,text_body,html_body,status,created_at").order("created_at", { ascending: false }).limit(100);
  fail(result.error);
  return result.data ?? [];
}
