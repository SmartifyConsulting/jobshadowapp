import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loadPersonalOnboarding, signPersonalFormA, startPersonalIdentity, refreshPersonalIdentity } from "@/lib/personal-onboarding.functions";
import { LegalFormBody } from "@/components/LegalFormBody";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isSwitchPersona } from "@/lib/dev-personas";
export function ScholarSignupDate({ scholarId }: { scholarId: string }) {
  const load = useServerFn(loadPersonalOnboarding);
  const state = useQuery({ queryKey: ["personal-onboarding", scholarId], queryFn: () => load({ data: { scholarId } }) });
  const date = state.data?.signedUpAt ? new Date(state.data.signedUpAt) : null;
  return <p className="text-xs text-muted-foreground">{state.isPending ? "Loading sign-up date…" : date && !Number.isNaN(date.getTime()) ? `Signed up ${date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" })}` : "Sign-up date: Unknown"}</p>;
}
export function PersonalOnboarding({ scholarId, parent = false, testPassed = false, onTestPassed }: { scholarId: string; parent?: boolean; testPassed?: boolean; onTestPassed?: (() => void) | undefined }) {
  const qc = useQueryClient();
  const load = useServerFn(loadPersonalOnboarding);
  const sign = useServerFn(signPersonalFormA);
  const start = useServerFn(startPersonalIdentity);
  const refresh = useServerFn(refreshPersonalIdentity);
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = ["personal-onboarding", scholarId];
  const user = useQuery({ queryKey: ["me"], queryFn: async () => (await supabase.auth.getUser()).data.user });
  const canTestPass = !parent && user.data?.id === scholarId && isSwitchPersona(user.data.id, user.data.email);
  const state = useQuery({ queryKey: key, queryFn: async () => { if (!parent) await refresh({ data: { scholarId } }); return load({ data: { scholarId } }); }, refetchInterval: query => query.state.data && (!query.state.data.consentComplete || (query.state.data.identity && query.state.data.identity.status !== "approved" && !parent)) ? 30_000 : false });
  const save = useMutation({ mutationFn: () => sign({ data: { scholarId, name, accepted: true, version: state.data!.version } }), onSuccess: () => { setError(null); void qc.invalidateQueries({ queryKey: key }); }, onError: e => setError(e.message) });
  const begin = useMutation({ mutationFn: () => start({ data: { scholarId } }), onSuccess: v => { if (v.verification_url) window.open(v.verification_url, "_blank", "noopener"); void qc.invalidateQueries({ queryKey: key }); setError(null); }, onError: e => setError(e.message) });
  const check = useMutation({ mutationFn: () => refresh({ data: { scholarId } }), onSuccess: () => { void qc.invalidateQueries({ queryKey: key }); setError(null); }, onError: e => setError(e.message) });
  if (state.isPending) return <p role="status">Loading Form A and identity verification…</p>;
  if (state.isError || !state.data) return <p role="alert">Your onboarding details could not be loaded. <button className="underline" onClick={() => void state.refetch()}>Try Again</button></p>;
  const data = state.data;
  const signed = parent ? data.parentSigned : data.scholarSigned;
  const verified = data.identity?.status === "approved" && data.identity.environment === "live";
  return <div className="space-y-4">
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <details open className="rounded-lg border bg-[#FFFDF5] p-4">
      <summary className="cursor-pointer font-bold">Personal Information & Identity Verification Consent{data.consentComplete ? " — Signed" : ""}</summary>
      <div className="mt-4 space-y-4"><LegalFormBody body={data.body} />
        <div className="grid gap-6 md:grid-cols-2">{(["scholar", "parent"] as const).map(role => {
          const receipt = data.signatures.find(s => s.signer_role === role && (role !== "parent" || data.parentSigned));
          const own = role === (parent ? "parent" : "scholar");
          return <section key={role} className="space-y-2"><h4 className="font-bold">{role === "parent" ? "Parent / Guardian" : "Scholar"}</h4>
            {receipt ? <><p className={role === "parent" ? "guardian-signature-font text-3xl" : "scholar-signature-font text-3xl"}>{receipt.signature_name}</p><p className="text-xs">Signed: {new Date(receipt.signed_at).toLocaleString()} · IP: {receipt.ip_address ?? "Not available"}</p></> : own ? <><label className="block text-sm">Digital Signature<input aria-label={`${role === "parent" ? "Parent / Guardian" : "Scholar"} digital signature`} value={name} onChange={e => setName(e.target.value)} className={`mt-1 h-16 w-full rounded border bg-transparent px-3 text-3xl ${parent ? "guardian-signature-font" : "scholar-signature-font"}`} /></label><label className="flex gap-2 text-sm"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />I have read and agree to Form A.</label><Button disabled={!accepted || !name.trim() || save.isPending || signed} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Sign Form A"}</Button></> : <p className="text-sm">Waiting for the {role === "parent" ? "linked Parent/Guardian" : "scholar"} to sign from their own account.</p>}
          </section>;
        })}</div>
      </div>
    </details>
    {!parent && <div className="space-y-3 rounded-lg border bg-[#FFFDF5] p-4"><h3 className="font-bold">Identity Verification</h3>
      {canTestPass && testPassed && <p className="text-sm font-semibold">KYC passed for this test preview only. No identity verification or consent has been recorded.</p>}
      <p>{verified ? "Your identity is verified. This verification will be used for future Job Shadows." : !data.consentComplete ? "Complete Form A with your linked Parent/Guardian before verifying your identity." : "Verify your identity securely. You only need to complete this once."}</p>
      {verified && data.identity?.verified_at && <p className="text-sm">Verified: {new Date(data.identity.verified_at).toLocaleString()}</p>}
      {data.identity?.environment === "test" && <p className="text-sm font-semibold">Test verification only. This does not verify your identity for a live booking.</p>}
      {!verified && <div className="flex flex-wrap gap-2"><Button disabled={!data.parentSigned || !data.scholarSigned || !data.consentComplete || begin.isPending} onClick={() => begin.mutate()}>{begin.isPending ? "Starting…" : data.identity?.verification_url ? "Continue Identity Verification" : "Verify My Identity"}</Button>{data.identity && <Button variant="outline" disabled={check.isPending} onClick={() => check.mutate()}>Check Verification Status</Button>}</div>}
      {canTestPass && !verified && !testPassed && onTestPassed && <div className="space-y-2 border-t border-border pt-3"><p className="text-xs">Test preview only. Bypass this step without recording KYC or signatures.</p><Button onClick={() => { try { window.sessionStorage.setItem(`jobshadow-demo-identity:${scholarId}`, "passed"); } catch { /* In-memory test preview still works. */ } onTestPassed(); }}>Pass KYC</Button></div>}
    </div>}
  </div>;
}
