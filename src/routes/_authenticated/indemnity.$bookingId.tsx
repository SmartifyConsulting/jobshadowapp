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

  const data = useQuery({
    queryKey: ["indemnity", bookingId],
    queryFn: async () => {
      const { data: booking } = await supabase.from("bookings").select("*").eq("id", bookingId).single();
      if (!booking) return null;
      const [{ data: profile }, { data: companyRows }] = await Promise.all([
        supabase.from("scholar_profiles").select("*").eq("user_id", booking.user_id).maybeSingle(),
        supabase.rpc("get_booking_company_details", { _booking: bookingId }),
      ]);
      return { booking, profile, company: companyRows?.[0] ?? null };
    },
  });

  if (data.isLoading) return <p className="p-8">Loading…</p>;
  if (!data.data?.booking) return <p className="p-8">Booking not found.</p>;
  const { booking, profile, company } = data.data;
  const needsCompanyDoc = !!company?.custom_indemnity_text;
  const standardSigned = !!booking.indemnity_path;
  const companySigned = !!booking.company_indemnity_path;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10 text-sm leading-relaxed text-foreground print:px-0">
      <style>{`@media print { .no-print { display: none !important; } .page-break { break-before: page; } }`}</style>
      <div className="no-print mb-6 flex justify-end">
        <button onClick={() => window.print()} className="rounded bg-primary px-4 py-2 text-sm font-bold uppercase text-primary-foreground">Print / Save as PDF</button>
      </div>

      {needsCompanyDoc && (
        <p className="no-print mb-8 rounded-md border border-primary/30 bg-muted/40 p-3 text-xs text-muted-foreground">
          {company?.company || "This host"} requires its own indemnity in addition to the standard JobShadow form below.
          Both must be signed and filed for this job shadow — see the second document further down.
        </p>
      )}

      <h1 className="font-display text-2xl font-bold">Job Shadow Indemnity &amp; Consent Form</h1>
      <p className="mt-1 text-muted-foreground">Please read, then have your parent/guardian sign digitally below to confirm this booking.</p>

      <h2 className="mt-6 font-semibold">Placement details</h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
        <div><dt className="font-semibold">Scholar</dt><dd>{profile?.full_name ?? "—"}</dd></div>
        <div><dt className="font-semibold">School</dt><dd>{profile?.school ?? "—"}</dd></div>
        <div><dt className="font-semibold">Career / Role</dt><dd>{booking.career}</dd></div>
        <div><dt className="font-semibold">Shadow date</dt><dd>{booking.shadow_date}</dd></div>
        <div><dt className="font-semibold">Location</dt><dd>{company?.address || booking.location || "—"}</dd></div>
        <div><dt className="font-semibold">Arrival / Collection</dt><dd>{company?.arrival_time || "TBC"} / {company?.collection_time || "TBC"}</dd></div>
      </dl>

      <h2 className="mt-6 font-semibold">Acknowledgement of risk and indemnity</h2>
      <p className="mt-2">
        I, the undersigned parent/legal guardian of the above-named scholar, consent to their participation in the Job
        Shadow placement described above. I understand that the scholar will spend time at a host company's premises
        under the supervision of a mentor, and that reasonable precautions will be taken for their safety, but that
        job shadowing, like any workplace activity, carries some inherent risk.
      </p>
      <p className="mt-2">
        I hereby release and indemnify Job Shadow, the host company, and their respective employees and
        representatives, against any claim for loss, injury, illness or damage arising from the scholar's
        participation in this placement, except to the extent caused by their gross negligence or wilful misconduct.
        I confirm that the scholar has no medical condition that I have not disclosed to Job Shadow which could
        affect their participation, and that I have provided accurate contact and emergency information.
      </p>
      <p className="mt-2">
        I understand that photographs or video may be taken during the placement for Job Shadow's records and may be
        used for promotional purposes unless I notify Job Shadow in writing that I do not consent to this.
      </p>

      <SignForm bookingId={bookingId} document="standard" alreadySigned={standardSigned} />

      {needsCompanyDoc && (
        <div className="page-break mt-16 border-t border-border pt-10">
          <h1 className="font-display text-2xl font-bold">{company?.company || "Host"} Indemnity &amp; Consent Form</h1>
          <p className="mt-1 text-muted-foreground">
            This additional form is required by the host company for this placement. It must be signed and filed
            alongside the standard JobShadow form above.
          </p>
          <div className="mt-6 whitespace-pre-wrap">{company?.custom_indemnity_text}</div>
          <SignForm bookingId={bookingId} document="company" alreadySigned={companySigned} />
        </div>
      )}
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
    if (!guardianName.trim() || !guardianContact.trim()) return setErr("Please enter the parent/guardian's name and contact number.");
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
          Parent / Guardian name
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
