import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { isIP } from "node:net";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { personalContext, personalOnboardingAdmin as admin } from "./personal-onboarding.server";
import { requireTestSigner, testIndemnityDocument, receiptFields, type TestIndemnityReceipt } from "./test-indemnity.server";
const input = z.object({ scholarId: z.string().uuid() });

export const loadTestIndemnity = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => input.parse(data)).handler(async ({ context, data }) => {
  await requireTestSigner(context.userId);
  const c = await personalContext(context.supabase, context.userId, data.scholarId);
  const document = testIndemnityDocument();
  const result = await admin.from("scholar_onboarding_signatures").select(receiptFields).eq("scholar_user_id", c.scholarId).eq("document_key", "form_d_test").eq("is_test", true).eq("document_version", document.version);
  if (result.error) throw new Error("Your saved test signatures could not be loaded.");
  const receipts: TestIndemnityReceipt[] = [];
  for (const receipt of (result.data ?? []) as TestIndemnityReceipt[]) {
    if (receipt.signer_role === "scholar" && receipt.signer_user_id === c.scholarId) receipts.push(receipt);
    else if (receipt.signer_role === "parent") {
      const parent = await admin.auth.admin.getUserById(receipt.signer_user_id);
      const role = await admin.from("user_roles").select("role").eq("user_id", receipt.signer_user_id).eq("role", "parent").maybeSingle();
      if (parent.data.user?.email_confirmed_at && !role.error && role.data && parent.data.user.email?.toLowerCase() === c.guardianEmail?.trim().toLowerCase()) receipts.push(receipt);
    }
  }
  return { version: document.version, document: document.content, receipts };
});

export const signTestIndemnity = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data: unknown) => input.extend({ version: z.string().regex(/^[a-f0-9]{64}$/), name: z.string().trim().min(1).max(200) }).parse(data)).handler(async ({ context, data }) => {
  await requireTestSigner(context.userId);
  const c = await personalContext(context.supabase, context.userId, data.scholarId);
  const document = testIndemnityDocument();
  if (data.version !== document.version) throw new Error("The form changed. Please review it again before signing.");
  const ip = getRequest().headers.get("cf-connecting-ip");
  const result = await admin.from("scholar_onboarding_signatures").insert({ scholar_user_id: c.scholarId, signer_user_id: context.userId, signer_role: c.self ? "scholar" : "parent", document_key: "form_d_test", is_test: true, document_version: document.version, document_hash: document.version, document_body: document.body, signature_name: data.name, ip_address: ip && isIP(ip) ? ip : null }).select(receiptFields).single();
  if (!result.error && result.data) return result.data as TestIndemnityReceipt;
  if (result.error?.code !== "23505") throw new Error("Your signature could not be saved. Please try again.");
  const saved = await admin.from("scholar_onboarding_signatures").select(receiptFields).eq("scholar_user_id", c.scholarId).eq("signer_user_id", context.userId).eq("document_key", "form_d_test").eq("is_test", true).eq("document_version", document.version).single();
  if (saved.error || !saved.data) throw new Error("Your saved signature could not be loaded. Please refresh.");
  return saved.data as TestIndemnityReceipt;
});
