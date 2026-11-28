import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { loadPersonalOnboarding } from "@/lib/personal-onboarding.functions";
import { supabase } from "@/integrations/supabase/client";
import { isSwitchPersona } from "@/lib/dev-personas";
import draft from "../../../docs/legal/form-d-indemnity-draft.json";

function SignaturePlacement({ signer, enabled }: { signer: "scholar" | "parent"; enabled: boolean }) {
  const [name, setName] = useState("");
  const label = signer === "scholar" ? "Scholar / Tertiary Student Signature" : "Parent / Guardian Signature Where Required";
  return <div className="space-y-2">
    <label className="block text-sm font-bold">{label}<input aria-label={label} disabled={!enabled} value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" maxLength={200} className={`mt-2 h-20 w-full rounded border border-input bg-transparent px-3 text-3xl disabled:opacity-100 ${signer === "scholar" ? "scholar-signature-font" : "guardian-signature-font"}`} /></label>
    {name && <p className="text-xs" role="status">Signature preview — not submitted.</p>}
    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs"><div><dt className="inline font-semibold">Date &amp; Time: </dt><dd className="inline">—</dd></div><div><dt className="inline font-semibold">IP Address: </dt><dd className="inline">—</dd></div></dl>
  </div>;
}

export function IndemnityDraftPreview({ scholarId }: { scholarId?: string | undefined }) {
  const user = useQuery({ queryKey: ["me"], queryFn: async () => (await supabase.auth.getUser()).data.user });
  const load = useServerFn(loadPersonalOnboarding);
  const consent = useQuery({ queryKey: ["personal-onboarding", scholarId], enabled: !!scholarId, queryFn: () => load({ data: { scholarId: scholarId! } }) });
  if (!user.data || !isSwitchPersona(user.data.id, user.data.email)) return null;
  const ownScholar = user.data.id === scholarId && consent.data?.self === true;
  const linkedParent = user.data.id !== scholarId && consent.data?.self === false;
  return <section aria-label="Indemnity Form" className="space-y-4">
    <h2 className="font-bold">Indemnity Form</h2>
      <div className="grid gap-6 md:grid-cols-2">
        <section aria-label="Scholar form" className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-[#FFFDF5] p-4">
          <h3 className="font-bold">Scholar / Tertiary Student</h3>
          {draft.sections.slice(0, 3).map(section => <section key={section.heading} className="space-y-2"><h4 className="font-bold">{section.heading}</h4><p className="text-sm leading-relaxed">{section.body}</p></section>)}
          <div className="mt-auto space-y-3 pt-2"><h4 className="font-bold">Scholar / Tertiary Student Declaration</h4><p className="text-sm leading-relaxed">{draft.scholar_declaration}</p><SignaturePlacement signer="scholar" enabled={ownScholar} /></div>
        </section>
        <section aria-label="Parent or guardian form" className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-[#FFFDF5] p-4">
          <h3 className="font-bold">Parent / Guardian</h3>
          {draft.sections.slice(3, 6).map(section => <section key={section.heading} className="space-y-2"><h4 className="font-bold">{section.heading}</h4><p className="text-sm leading-relaxed">{section.body}</p></section>)}
          <div className="mt-auto space-y-3 pt-2"><h4 className="font-bold">Parent / Guardian Consent and Indemnity</h4><p className="text-sm leading-relaxed">{draft.parent_declaration}</p><SignaturePlacement signer="parent" enabled={linkedParent} /></div>
        </section>
      </div>
  </section>;
}
