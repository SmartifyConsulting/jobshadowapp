import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SignaturePad } from "@/components/SignaturePad";
import { signIndemnityDocument } from "@/lib/indemnity-sign.functions";
import { notify } from "@/lib/dialogs";

export const Route = createFileRoute("/_authenticated/indemnity/$bookingId")({
  head: () => ({
    meta: [{ title: "Indemnity Form | JobShadow" }, { name: "robots", content: "noindex" }],
  }),
  component: IndemnityForm,
});

function IndemnityForm() {
  const { bookingId } = Route.useParams();

  const ctx = useQuery({
    queryKey: ["indemnity", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_indemnity_context", { _booking: bookingId });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  const clausesQuery = useQuery({
    queryKey: ["legal-document", "standard_indemnity_clauses"],
    queryFn: async () => {
      const { data } = await supabase.from("legal_documents").select("body").eq("key", "standard_indemnity_clauses").maybeSingle();
      return (data?.body ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    },
  });

  if (ctx.isLoading) return <p className="p-8">Loading…</p>;
  if (ctx.error) return <p className="p-8 text-destructive">{(ctx.error as Error).message}</p>;
  if (!ctx.data) return <p className="p-8">Booking not found.</p>;
  const d = ctx.data;
  const isGuardian = d.viewer_role === "guardian";

  return (
    <div className="mx-auto max-w-3xl px-8 py-10 text-sm leading-relaxed text-foreground print:px-0">
      <style>{`@media print { .no-print { display: none !important; } .page-break { break-before: page; } }`}</style>
      {isGuardian && (
        <div className="no-print mb-6 flex justify-end">
          <button onClick={() => window.print()} className="rounded bg-primary px-4 py-2 text-sm font-bold uppercase text-primary-foreground">Print / Save as PDF</button>
        </div>
      )}

      {!isGuardian && (
        <div className="no-print mb-8 rounded-md border border-accent/40 bg-accent/10 p-4 text-sm">
          This indemnity must be signed by your parent/guardian from their own account — it can't be signed on their behalf.
          {d.standard_signed && (!d.needs_company_doc || d.company_signed) ? " Good news: it's already signed and this booking is confirmed." : " Ask them to sign in (or set up their parent account) and open this same link."}
        </div>
      )}

      {d.needs_company_doc && (
        <p className="no-print mb-8 rounded-md border border-primary/30 bg-muted/40 p-3 text-xs text-muted-foreground">
          {d.company || "This host"} requires its own indemnity in addition to the standard JobShadow form below.
          Both must be signed and filed for this job shadow — see the second document further down.
        </p>
      )}

      <h1 className="font-display text-2xl font-bold">Job Shadow Indemnity &amp; Consent Form</h1>
      <p className="mt-1 text-muted-foreground">Please read, then have your parent/guardian sign digitally below to confirm this booking.</p>

      <h2 className="mt-6 font-semibold">Placement details</h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
        <div><dt className="font-semibold">Scholar</dt><dd>{d.scholar_name ?? "—"}</dd></div>
        <div><dt className="font-semibold">School</dt><dd>{d.school ?? "—"}</dd></div>
        <div><dt className="font-semibold">Career / Role</dt><dd>{d.career}</dd></div>
        <div><dt className="font-semibold">Shadow date</dt><dd>{d.shadow_date}</dd></div>
        <div><dt className="font-semibold">Location</dt><dd>{d.location ?? "—"}</dd></div>
      </dl>

      <h2 className="mt-6 font-semibold">Acknowledgement of risk and indemnity</h2>
      {(clausesQuery.data ?? []).map((p, i) => <p key={i} className="mt-2">{p}</p>)}

      {isGuardian ? <SignForm bookingId={bookingId} document="standard" alreadySigned={d.standard_signed} /> : <StatusOnly signed={d.standard_signed} />}

      {d.needs_company_doc && (
        <div className="page-break mt-16 border-t border-border pt-10">
          <h1 className="font-display text-2xl font-bold">{d.company || "Host"} Indemnity &amp; Consent Form</h1>
          <p className="mt-1 text-muted-foreground">
            This additional form is required by the host company for this placement. It must be signed and filed
            alongside the standard JobShadow form above.
          </p>
          <div className="mt-6 whitespace-pre-wrap">{d.custom_indemnity_text}</div>
          {isGuardian ? <SignForm bookingId={bookingId} document="company" alreadySigned={d.company_signed} /> : <StatusOnly signed={d.company_signed} />}
        </div>
      )}
    </div>
  );
}

function StatusOnly({ signed }: { signed: boolean }) {
  return (
    <div className="no-print mt-10 rounded-md border border-border p-4 text-sm text-muted-foreground">
      {signed ? "Signed by your parent/guardian." : "Awaiting your parent/guardian's signature."}
    </div>
  );
}

function SignForm({ bookingId, document, alreadySigned }: { bookingId: string; document: "standard" | "company"; alreadySigned: boolean }) {
  const qc = useQueryClient();
  const sign = useServerFn(signIndemnityDocument);
  const [guardianName, setGuardianName] = useState("");
  const [guardianContact, setGuardianContact] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(alreadySigned);

  async function submit() {
    if (!guardianName.trim() || !guardianContact.trim()) return setErr("Please enter your name and contact number.");
    if (!signatureDataUrl) return setErr("Please sign above before submitting.");
    setBusy(true);
    setErr(null);
    try {
      const res = await sign({ data: { bookingId, document, guardianName, guardianContact, signatureDataUrl } });
      setDone(true);
      qc.invalidateQueries({ queryKey: ["indemnity", bookingId] });
      notify(res.confirmed ? "Thank you — your booking is now confirmed." : "Signed. One more document still needs signing to confirm this booking.", "success");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <div className="no-print mt-10 rounded-md border border-primary/30 bg-muted/30 p-4 text-sm">This document has been digitally signed. Thank you.</div>;
  }

  return (
    <div className="no-print mt-10 rounded-md border border-border p-5">
      <h3 className="font-semibold">Parent / Guardian digital signature</h3>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Your name
          <input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="mt-1 w-full border-b border-input bg-transparent px-1 py-2 outline-none focus:border-primary" />
        </label>
        <label className="block text-sm">
          Contact number
          <input value={guardianContact} onChange={(e) => setGuardianContact(e.target.value)} className="mt-1 w-full border-b border-input bg-transparent px-1 py-2 outline-none focus:border-primary" />
        </label>
      </div>
      <div className="mt-4">
        <SignaturePad onChange={setSignatureDataUrl} />
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      <button onClick={submit} disabled={busy} className="mt-4 rounded bg-primary px-5 py-2 text-sm font-bold uppercase text-primary-foreground disabled:opacity-50">
        {busy ? "Submitting…" : "Sign & Submit"}
      </button>
    </div>
  );
}
