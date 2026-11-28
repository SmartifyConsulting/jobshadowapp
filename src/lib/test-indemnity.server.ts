import { createHash } from "node:crypto";
import { isSwitchPersona } from "./dev-personas";
import { personalOnboardingAdmin as admin } from "./personal-onboarding.server";
import document from "../../docs/legal/form-d-indemnity-draft.json";

export type TestIndemnityReceipt = {
  signer_user_id: string; signer_role: "scholar" | "parent"; signature_name: string;
  signed_at: string; ip_address: string | null; document_version: string;
};
export type TestIndemnityContent = { title: string; sections: { heading: string; body: string }[]; scholar_declaration: string; parent_declaration: string };
export const receiptFields = "signer_user_id,signer_role,signature_name,signed_at,ip_address,document_version";
export function testIndemnityDocument() {
  const content: TestIndemnityContent = { title: document.title, sections: document.sections.slice(0, 6), scholar_declaration: document.scholar_declaration, parent_declaration: document.parent_declaration };
  const body = JSON.stringify(content);
  return { body, version: createHash("sha256").update(body).digest("hex"), content };
}
export async function requireTestSigner(userId: string) {
  const found = await admin.auth.admin.getUserById(userId);
  const user = found.data.user;
  const banned = user?.banned_until && Date.parse(user.banned_until) > Date.now();
  if (found.error || !user || !user.email_confirmed_at || banned || !isSwitchPersona(user.id, user.email))
    throw new Error("Test signing is available only to the approved test profiles.");
}
