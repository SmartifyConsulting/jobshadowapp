import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isSwitchPersona } from "@/lib/dev-personas";
import draft from "../../../docs/legal/form-d-indemnity-draft.json";

export function IndemnityDraftPreview() {
  const user = useQuery({ queryKey: ["me"], queryFn: async () => (await supabase.auth.getUser()).data.user });
  if (!user.data || !isSwitchPersona(user.data.id, user.data.email)) return null;
  return <details className="rounded-lg border border-border bg-[#FFFDF5] p-4">
    <summary className="cursor-pointer font-bold">Indemnity Form (Consolidated Form B and Form C)</summary>
    <div className="mt-4 space-y-4">
      <p className="text-sm font-semibold">Form D — Draft for client review. Forms B and C remain unchanged.</p>
      {draft.sections.map(section => <section key={section.heading} className="space-y-2"><h4 className="font-bold">{section.heading}</h4><p className="text-sm leading-relaxed">{section.body}</p></section>)}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-2"><h4 className="font-bold">Scholar / Tertiary Student Declaration</h4><p className="text-sm leading-relaxed">{draft.scholar_declaration}</p><p className="font-bold">Scholar / Tertiary Student Signature</p></section>
        <section className="space-y-2"><h4 className="font-bold">Parent / Guardian Consent and Indemnity</h4><p className="text-sm leading-relaxed">{draft.parent_declaration}</p><p className="font-bold">Parent / Guardian Signature Where Required</p></section>
      </div>
      <p className="text-sm">For review only. Signing will be available after this draft is approved.</p>
    </div>
  </details>;
}
