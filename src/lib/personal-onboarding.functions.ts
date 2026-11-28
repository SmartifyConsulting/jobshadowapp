import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { isIP } from "node:net";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { personalContext, personalOnboardingAdmin as admin, savePersonalVerification } from "./personal-onboarding.server";
const input = z.object({ scholarId: z.string().uuid().optional() });
export type SignatureRecord = { signature_name: string; signed_at: string; ip_address: string | null };
export type ParentSignatureHistory = { document_key: string; document_version: string; document_body: string; signature_name: string; signed_at: string; ip_address: string | null; is_test: boolean; scholar: SignatureRecord | null };
export const loadParentSignatureHistory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => input.parse(data)).handler(async ({ context, data }) => {
  const c = await personalContext(context.supabase, context.userId, data.scholarId ?? context.userId);
  if (c.self) throw new Error("Sign in as the linked Parent/Guardian to view this signing history.");
  const result = await admin.from("scholar_onboarding_signatures").select("document_key,document_version,document_body,signature_name,signed_at,ip_address,is_test").eq("scholar_user_id", c.scholarId).eq("signer_user_id", context.userId).eq("signer_role", "parent").order("signed_at", { ascending: false });
  if (result.error) throw new Error("Your signing history could not be loaded.");
  const scholarRows = await admin.from("scholar_onboarding_signatures").select("document_key,document_version,signature_name,signed_at,ip_address").eq("scholar_user_id", c.scholarId).eq("signer_role", "scholar");
  if (scholarRows.error) throw new Error("Your signing history could not be loaded.");
  return (result.data ?? []).map((row) => ({
    ...row,
    scholar:
      scholarRows.data?.find(
        (s) => s.document_key === row.document_key && s.document_version === row.document_version,
      ) ?? null,
  })) as ParentSignatureHistory[];
});
export const loadPersonalOnboarding = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => input.parse(data)).handler(async ({ context, data }) => {
  const c = await personalContext(context.supabase, context.userId, data.scholarId ?? context.userId);
  const registered = await admin.auth.admin.getUserById(c.scholarId);
  return { ...c, signedUpAt: registered.data.user?.created_at ?? null, identity: c.identity ? { status: c.identity.status, environment: c.identity.environment, verified_at: c.identity.verified_at, verification_url: c.self ? c.identity.verification_url : null } : null };
});
export const signPersonalFormA = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => input.extend({ version: z.string().regex(/^[a-f0-9]{64}$/), name: z.string().trim().min(1).max(200), accepted: z.literal(true) }).parse(data)).handler(async ({ context, data }) => {
  const c = await personalContext(context.supabase, context.userId, data.scholarId ?? context.userId);
  if (data.version !== c.version) throw new Error("Form A changed. Please review the latest version before signing.");
  const ip = getRequest().headers.get("cf-connecting-ip");
  const result = await admin.from("scholar_onboarding_signatures").insert({ scholar_user_id: c.scholarId, signer_user_id: context.userId, signer_role: c.self ? "scholar" : "parent", document_key: "form_a", document_version: c.version, document_body: c.body, document_hash: c.version, signature_name: data.name, signed_at: new Date().toISOString(), ip_address: ip && isIP(ip) ? ip : null });
  if (result.error && result.error.code !== "23505") throw new Error("Your signature could not be saved.");
  return { ok: true };
});
export const startPersonalIdentity = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => input.parse(data)).handler(async ({ context, data }) => {
  const c = await personalContext(context.supabase, context.userId, data.scholarId ?? context.userId);
  if (!c.self) throw new Error("Sign in as the scholar to verify their identity.");
  if (c.identity?.status === "approved" && c.identity.environment === "live") return { status: "approved", environment: "live", verification_url: null };
  if (!c.consentComplete) throw new Error("The scholar and linked Parent/Guardian must sign Form A before identity verification.");
  if (c.identity?.session_id) return { status: c.identity.status, environment: c.identity.environment, verification_url: c.identity.verification_url };
  const legacy = await admin.from("bookings").select("id,kyc_session_id").eq("user_id", c.scholarId).eq("kyc_status", "approved").eq("kyc_environment", "live").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (legacy.error) throw new Error("Your previous verification could not be checked.");
  if (legacy.data?.kyc_session_id) {
    const { getForusVerification } = await import("./forus-kyc.server");
    const verified = await getForusVerification(legacy.data.kyc_session_id, legacy.data.id);
    if (verified.status === "approved" && verified.environment === "live") {
      await savePersonalVerification(c.scholarId, verified, c.version);
      return { status: "approved", environment: "live", verification_url: null };
    }
  }
  const { createScholarVerification } = await import("./forus-kyc.server");
  const v = await createScholarVerification(c.scholarId, c.version);
  await savePersonalVerification(c.scholarId, v, c.version);
  return { status: v.status, environment: v.environment, verification_url: v.verification_url };
});
export const refreshPersonalIdentity = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => input.parse(data)).handler(async ({ context, data }) => {
  const c = await personalContext(context.supabase, context.userId, data.scholarId ?? context.userId);
  if (!c.self) throw new Error("Sign in as the scholar to refresh their verification.");
  const row = c.identity;
  if (row?.status === "approved" && row.environment === "live") return { ok: true };
  if (!row?.session_id || Date.now() - Date.parse(row.last_checked_at ?? row.updated_at) < 30_000) return { ok: true };
  let claim = admin.from("scholar_identity_verifications").update({ last_checked_at: new Date().toISOString() }).eq("user_id", c.scholarId);
  claim = row.last_checked_at ? claim.eq("last_checked_at", row.last_checked_at) : claim.is("last_checked_at", null);
  const claimed = await claim.select("user_id").maybeSingle();
  if (claimed.error) throw new Error("Your verification could not be refreshed.");
  if (!claimed.data) return { ok: true };
  const { getScholarVerification } = await import("./forus-kyc.server");
  await savePersonalVerification(c.scholarId, await getScholarVerification(row.session_id, c.scholarId), row.consent_version);
  return { ok: true };
});
