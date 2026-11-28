export type FormSignerRole = "scholar" | "parent" | "mentor" | "hr_admin";
export type SigningForm = {
  key: string;
  section: string;
  title: string;
  body: string;
  hash: string;
  signers: FormSignerRole[];
  legacy: "standard" | "company" | null;
};
export type SignatureReceipt = {
  id: string;
  signer_role: FormSignerRole;
  signer_name: string;
  signed_at: string;
  signer_ip: string | null;
  document_hash: string;
  pdf_path?: string;
};
export const signatureFont = (role: FormSignerRole) =>
  role === "scholar" ? "Caveat" : "Dancing Script";
export const internalLegalNote =
  /^(?:Displayed during the Shared Scholar-Parent Onboarding Wizard\b|Must be digitally signed by both the High School Scholar and the linked Parent\/Guardian\b|Executed digitally by Individual Mentors and Host Company HR Representatives during\b|Digitally signed by both the High School Scholar\b|Digitally executed with the Individual Mentor's or Host Company HR Representative's name\b)/i;
export function readableLegalText(text: string) {
  return text
    .replace(/my FORUS API identity verification/gi, "my digital KYC verification")
    .replace(
      /identity verification submitted via FORUS/gi,
      "identity information submitted for digital KYC verification",
    )
    .replace(/via the FORUS API/gi, "through digital KYC verification")
    .replace(/via FORUS(?: API)?/gi, "through digital KYC verification")
    .replace(/FORUS(?: API)?/g, "digital KYC verification");
}
export function legalBlocks(body: string) {
  return body
    .split(/\r?\n\s*\r?\n/)
    .map((block) => readableLegalText(block.trim()))
    .filter((block) => block && !internalLegalNote.test(block));
}
export function formParts(body: string) {
  return body
    .split(/(?=^##\s+Form\s+[A-Z]\s*:)/im)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const heading = part.match(/^##\s+(Form\s+([A-Z])\s*:[^\r\n]+)\r?\n?/i);
      return {
        section: heading?.[2]?.toUpperCase() ?? "",
        title: heading?.[1] ?? "Agreement",
        body: legalBlocks(heading ? part.slice(heading[0].length) : part).join("\n\n"),
      };
    });
}
