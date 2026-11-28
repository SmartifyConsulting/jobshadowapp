import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
const admin = supabaseAdmin as unknown as SupabaseClient;
export async function personalContext(client: SupabaseClient, callerId: string, scholarId: string) {
  const profile = await admin.from("scholar_profiles").select("user_id,full_name,guardian_name,guardian_email").eq("user_id", scholarId).maybeSingle();
  if (profile.error || !profile.data) throw new Error("Scholar profile not found.");
  const self = callerId === scholarId;
  if (!self) {
    const allowed = await client.rpc("can_sign_as_guardian", { _scholar: scholarId });
    if (allowed.error || allowed.data !== true) throw new Error("Only the linked Parent/Guardian can access this consent form.");
  }
  const source = await admin.from("legal_documents").select("body").eq("key", "consent_forms").single();
  if (source.error || !source.data?.body) throw new Error("Form A could not be loaded.");
  const section = (source.data.body as string).split(/(?=^##\s+Form\s+[A-Z]\s*:)/im).find(part => /^##\s+Form\s+A\s*:/i.test(part.trim()));
  if (!section) throw new Error("Form A has not been configured.");
  const body = section.replace(/^##[^\n]+\n?/, "").split(/\n\s*\n/).filter(p => !/^Displayed during/i.test(p.trim())).join("\n\n").trim();
  const hash = createHash("sha256").update(body).digest("hex");
  const signatures = await admin.from("scholar_onboarding_signatures").select("signer_user_id,signer_role,signature_name,signed_at,ip_address").eq("scholar_user_id", scholarId).eq("document_key", "form_a").eq("document_version", hash);
  if (signatures.error) throw new Error("Your saved signatures could not be loaded.");
  // An old parent's signature cannot authorize a newly linked parent's access or KYC consent.
  const guardianSignatures = signatures.data?.filter(s => s.signer_role === "parent") ?? [];
  let parentSigned = false;
  let currentGuardianId: string | null = null;
  for (const guardianSignature of guardianSignatures) {
    const parent = await admin.auth.admin.getUserById(guardianSignature.signer_user_id);
    const role = await admin.from("user_roles").select("role").eq("user_id", guardianSignature.signer_user_id).eq("role", "parent").maybeSingle();
    parentSigned = !!parent.data.user?.email_confirmed_at && !role.error && !!role.data && parent.data.user?.email?.toLowerCase() === profile.data.guardian_email?.trim().toLowerCase();
    if (parentSigned) { currentGuardianId = guardianSignature.signer_user_id; break; }
  }
  const scholarSigned = !!signatures.data?.some(s => s.signer_role === "scholar" && s.signer_user_id === scholarId);
  const identity = await admin.from("scholar_identity_verifications").select("*").eq("user_id", scholarId).maybeSingle();
  if (identity.error) throw new Error("Your identity verification could not be loaded.");
  return { scholarId, scholarName: profile.data.full_name as string, guardianEmail: profile.data.guardian_email as string | null, body, version: hash, self, signatures: (signatures.data ?? []).filter(s => s.signer_role !== "parent" || s.signer_user_id === currentGuardianId), scholarSigned, parentSigned, consentComplete: scholarSigned && parentSigned, identity: identity.data };
}
export async function savePersonalVerification(userId: string, verification: { id: string; reference: string; environment: string; status: string; verification_url: string | null; updated_at: string }, consentVersion: string) {
  const result = await admin.from("scholar_identity_verifications").upsert({ user_id: userId, provider: "forus", reference: verification.reference, session_id: verification.id, environment: verification.environment, status: verification.status, verification_url: verification.verification_url, consent_version: consentVersion, consent_recorded_at: new Date().toISOString(), verified_at: verification.status === "approved" && verification.environment === "live" ? new Date().toISOString() : null, last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  if (result.error) throw new Error("Your identity verification could not be saved.");
}
export { admin as personalOnboardingAdmin };
