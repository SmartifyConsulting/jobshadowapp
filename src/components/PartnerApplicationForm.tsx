import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { partnerApplicationSchema } from "@/lib/partner-applications";
import { PhoneInput } from "./PhoneInput";

export function PartnerApplicationForm({ type, userId, email }: { type: "mentor" | "host"; userId: string | null; email: string | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ company: "", first_name: "", last_name: "", phone: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const input = "mt-1 w-full border-b border-current/40 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-current/70";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || receipt) return;
    const result = partnerApplicationSchema.safeParse({ ...form, applicant_type: type });
    if (!result.success) return setError(result.error.issues[0]?.message ?? "Please check the form.");
    setBusy(true); setError(null);
    try {
      const data = result.data;
      const saved = await supabase.rpc("submit_partner_application", { _applicant_type: data.applicant_type, _company: data.company, _first_name: data.first_name, _last_name: data.last_name, _phone: data.phone, _message: data.message });
      if (saved.error) throw saved.error;
      if (!saved.data) throw new Error("Your application could not be confirmed. Please try again.");
      setReceipt(saved.data);
      void qc.invalidateQueries({ queryKey: ["admin", "partner-applications"] });
    } catch (error) { setError(error instanceof Error ? error.message : (error as { message?: string })?.message ?? "Unable to submit your application. Please try again."); }
    finally { setBusy(false); }
  }

  if (!userId) return <div className="mt-6 space-y-4 text-sm"><p>Please sign in to submit your {type === "mentor" ? "mentor" : "company host"} application.</p><Link to="/auth" search={{ contact: type }} className="inline-block rounded-full bg-cta px-5 py-2 font-bold uppercase text-cta-foreground">Sign In To Apply</Link></div>;
  if (receipt) return <div role="status" className="mt-6 space-y-3 text-sm"><p className="font-semibold">Your application has been submitted and is pending review.</p><p>Reference: <span className="break-all">{receipt}</span></p></div>;
  return <form onSubmit={submit} className="mt-6 grid gap-4">
    <p className="text-sm">Applying as {email}</p>
    <label className="text-xs uppercase tracking-wide">Company Name<input required maxLength={200} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={input} /></label>
    <div className="grid gap-4 sm:grid-cols-2">{([['first_name', 'First Name'], ['last_name', 'Last Name']] as const).map(([key, label]) => <label key={key} className="text-xs uppercase tracking-wide">{label}<input required maxLength={100} autoComplete={key === 'first_name' ? 'given-name' : 'family-name'} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={input} /></label>)}</div>
    <div><label htmlFor="partner-mobile" className="mb-1 block text-xs uppercase tracking-wide">Mobile Number</label><PhoneInput id="partner-mobile" required value={form.phone} onChange={(phone) => setForm({ ...form, phone })} /></div>
    <label className="text-xs uppercase tracking-wide">Anything Else We Should Know? (Optional)<textarea rows={3} maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={input} /></label>
    {error && <p role="alert" className="text-sm font-semibold text-accent">{error}</p>}
    <button disabled={busy} className="mt-2 rounded-full bg-cta px-8 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-cta-foreground disabled:opacity-50">{busy ? "Submitting…" : "Submit Application"}</button>
  </form>;
}
