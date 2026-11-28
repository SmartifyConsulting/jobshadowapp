import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { loadPersonalOnboarding } from "@/lib/personal-onboarding.functions";
import { loadTestIndemnity, signTestIndemnity } from "@/lib/test-indemnity.functions";
import type { TestIndemnityReceipt, TestIndemnityContent } from "@/lib/test-indemnity.server";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isSwitchPersona } from "@/lib/dev-personas";
import draft from "../../../docs/legal/form-d-indemnity-draft.json";

function SignaturePlacement({ signer, enabled, scholarId, version, receipt }: { signer: "scholar" | "parent"; enabled: boolean; scholarId?: string | undefined; version?: string | undefined; receipt?: TestIndemnityReceipt | undefined }) {
  const [name, setName] = useState("");
  const sign = useServerFn(signTestIndemnity);
  const qc = useQueryClient();
  const save = useMutation({ mutationFn: () => {
    if (!scholarId || !version) throw new Error("Please wait for the signature details to load.");
    return sign({ data: { scholarId, version, name: name.trim() } });
  }, onSuccess: saved => {
    qc.setQueryData<{ version: string; document?: TestIndemnityContent; receipts: TestIndemnityReceipt[] }>(["test-indemnity-signatures", scholarId], previous => ({ ...previous, version: saved.document_version, receipts: [...(previous?.receipts ?? []).filter(item => item.signer_role !== saved.signer_role), saved] }));
    void qc.invalidateQueries({ queryKey: ["test-indemnity-signatures", scholarId] });
    void qc.invalidateQueries({ queryKey: ["parent-signature-history", scholarId] });
  } });
  const label = signer === "scholar" ? "Scholar / Tertiary Student Signature" : "Parent / Guardian Signature Where Required";
  return <div className="space-y-2">
    <label className="block text-sm font-bold">{label}<input aria-label={label} disabled={!enabled || !!receipt || save.isPending} value={receipt?.signature_name ?? name} onChange={e => setName(e.target.value)} placeholder="Full Name" maxLength={200} className={`mt-2 h-20 w-full rounded border border-input bg-transparent px-3 text-3xl disabled:opacity-100 ${signer === "scholar" ? "scholar-signature-font" : "guardian-signature-font"}`} /></label>
    {enabled && !receipt && <Button disabled={!name.trim() || !version || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Signing…" : "Sign"}</Button>}
    {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
    {receipt && <p className="text-xs text-green-700" role="status">Signed · Test signature</p>}
    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs"><div><dt className="inline font-semibold">Date &amp; Time: </dt><dd className="inline">{receipt ? new Date(receipt.signed_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }) : "—"}</dd></div><div><dt className="inline font-semibold">IP Address: </dt><dd className="inline">{receipt ? receipt.ip_address ?? "Unavailable" : "—"}</dd></div></dl>
  </div>;
}

export function IndemnityDraftPreview({ scholarId }: { scholarId?: string | undefined }) {
  const user = useQuery({ queryKey: ["me"], queryFn: async () => (await supabase.auth.getUser()).data.user });
  const load = useServerFn(loadPersonalOnboarding);
  const consent = useQuery({ queryKey: ["personal-onboarding", scholarId], enabled: !!scholarId, queryFn: () => load({ data: { scholarId: scholarId! } }) });
  const loadSignatures = useServerFn(loadTestIndemnity);
  const signatures = useQuery({ queryKey: ["test-indemnity-signatures", scholarId], enabled: !!scholarId && !!user.data && isSwitchPersona(user.data.id, user.data.email), queryFn: () => loadSignatures({ data: { scholarId: scholarId! } }), refetchInterval: 30_000 });
  if (!user.data || !isSwitchPersona(user.data.id, user.data.email)) return null;
  const ownScholar = user.data.id === scholarId && consent.data?.self === true;
  const linkedParent = user.data.id !== scholarId && consent.data?.self === false;
  const document = signatures.data?.document ?? draft;
  return <section aria-label="Indemnity Form" className="space-y-4">
      {signatures.isError && <p role="alert" className="text-sm text-destructive">Saved signatures could not be loaded. <button className="underline" onClick={() => void signatures.refetch()}>Try Again</button></p>}
      <div className="grid gap-6 md:grid-cols-2">
        <section aria-label="Scholar form" aria-disabled={!ownScholar} className={`flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-[#FFFDF5] p-4 ${ownScholar ? "" : "opacity-50"}`}>
          <h3 className="font-bold">Scholar / Tertiary Student</h3>
          {document.sections.slice(0, 3).map(section => <section key={section.heading} className="space-y-2"><h4 className="font-bold">{section.heading}</h4><p className="text-sm leading-relaxed">{section.body}</p></section>)}
          <div className="mt-auto space-y-3 pt-2"><h4 className="font-bold">Scholar / Tertiary Student Declaration</h4><p className="text-sm leading-relaxed">{document.scholar_declaration}</p><SignaturePlacement signer="scholar" enabled={ownScholar} scholarId={scholarId} version={signatures.data?.version} receipt={signatures.data?.receipts.find(item => item.signer_role === "scholar")} /></div>
        </section>
        <section aria-label="Parent or guardian form" aria-disabled={!linkedParent} className={`flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-[#FFFDF5] p-4 ${linkedParent ? "" : "opacity-50"}`}>
          <h3 className="font-bold">Parent / Guardian</h3>
          {document.sections.slice(3, 6).map(section => <section key={section.heading} className="space-y-2"><h4 className="font-bold">{section.heading}</h4><p className="text-sm leading-relaxed">{section.body}</p></section>)}
          <div className="mt-auto space-y-3 pt-2"><h4 className="font-bold">Parent / Guardian Consent and Indemnity</h4><p className="text-sm leading-relaxed">{document.parent_declaration}</p><SignaturePlacement signer="parent" enabled={linkedParent} scholarId={scholarId} version={signatures.data?.version} receipt={signatures.data?.receipts.find(item => item.signer_role === "parent")} /></div>
        </section>
      </div>
  </section>;
}
