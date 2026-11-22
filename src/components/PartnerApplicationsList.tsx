import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PARTNER_STATUS, type PartnerApplication } from "@/lib/partner-applications";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";

export function PartnerApplicationsList({ kind, records, loading, error, onRefresh }: { kind: "mentor" | "host"; records: PartnerApplication[]; loading: boolean; error: string | undefined; onRefresh: () => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [review, setReview] = useState<PartnerApplication["status"]>("pending");
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const scoped = records.filter((record) => record.applicant_type === kind);
  const query = search.trim().toLowerCase();
  const matches = scoped.filter((record) => !query || [record.company, record.first_name, record.last_name, record.email, record.phone, record.message, record.id].some((value) => value.toLowerCase().includes(query)));
  const rows = matches.filter((record) => status === "all" || record.status === status);
  const selected = scoped.find((record) => record.id === selectedId);

  async function saveReview() {
    if (!selected || busy) return;
    setBusy(true); setSaveError(null);
    try {
      const result = await supabase.from("partner_applications").update({ status: review, reviewed_at: new Date().toISOString() }).eq("id", selected.id).select("id").single();
      if (result.error) throw result.error;
      if (!result.data) throw new Error("The application was not updated. Please refresh and try again.");
      await qc.invalidateQueries({ queryKey: ["admin", "partner-applications"] });
      setSelectedId(null);
    } catch (error) { setSaveError((error as { message?: string })?.message ?? "Unable to save the review."); }
    finally { setBusy(false); }
  }

  return <div>
    <div className="flex flex-wrap items-end gap-4 px-6 py-4"><label className="text-sm">Search<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, company or reference" className="mt-1 block w-72 max-w-full rounded border border-input bg-background px-3 py-2" /></label><button onClick={onRefresh} className="rounded border border-border px-3 py-2 text-sm">Refresh</button><p className="text-xs text-muted-foreground">{rows.length} matching {kind === "mentor" ? "mentor" : "company host"} applications</p></div>
    <div role="group" aria-label="Filter partner applications by status" className="flex flex-wrap gap-1.5 px-6 pb-4">{[["all", "All"], ...Object.entries(PARTNER_STATUS)].map(([key, title]) => <button key={key} aria-pressed={status === key} onClick={() => setStatus(key!)} className={"rounded-full border px-3 py-1.5 text-xs font-medium " + (status === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-ivory hover:bg-teal/15")}>{title} ({matches.filter((record) => key === "all" || record.status === key).length})</button>)}</div>
    <div className="overflow-x-auto px-6 pb-6"><table className="w-full min-w-[850px] text-left text-xs"><thead><tr>{["Reference", "First Name", "Last Name", "Company", "Email", "Mobile Number", "Applied", "Status", "Actions"].map((title) => <th key={title} className="whitespace-nowrap border-b border-border px-3 py-2 font-medium">{title}</th>)}</tr></thead><tbody>
      {loading ? <tr><td colSpan={9} className="p-4">Loading…</td></tr> : error ? <tr><td colSpan={9} role="alert" className="p-4 text-destructive">{error}</td></tr> : !rows.length ? <tr><td colSpan={9} className="p-4">No {kind === "mentor" ? "mentor" : "company host"} applications match these filters.</td></tr> : rows.map((record) => <tr key={record.id} className="border-b border-border hover:bg-background/40"><td className="px-3 py-2" title={record.id}>{record.id.slice(0, 8)}</td><td className="px-3 py-2">{record.first_name}</td><td className="px-3 py-2">{record.last_name}</td><td className="px-3 py-2">{record.company}</td><td className="px-3 py-2">{record.email}</td><td className="px-3 py-2">{record.phone}</td><td className="px-3 py-2">{new Date(record.created_at).toLocaleDateString("en-ZA")}</td><td className="px-3 py-2">{PARTNER_STATUS[record.status]}</td><td className="px-3 py-2"><button onClick={() => { setSelectedId(record.id); setReview(record.status); setSaveError(null); }} className="whitespace-nowrap rounded border border-border px-2 py-1">View / review</button></td></tr>)}
    </tbody></table></div>
    <Sheet open={!!selected} onOpenChange={(open) => { if (!open && !busy) setSelectedId(null); }}><SheetContent className="w-full overflow-y-auto bg-ivory sm:max-w-xl"><SheetHeader><SheetTitle>{selected?.first_name} {selected?.last_name}</SheetTitle><SheetDescription>{kind === "mentor" ? "Mentor" : "Company host"} application</SheetDescription></SheetHeader>{selected && <div className="mt-5 space-y-5 text-sm"><dl className="grid gap-3">{Object.entries(selected).map(([key, value]) => <div key={key}><dt className="text-xs text-muted-foreground">{key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value ?? "Not recorded"}</dd></div>)}</dl><label className="block">Review Status<select value={review} disabled={busy} onChange={(e) => setReview(e.target.value as PartnerApplication["status"])} className="mt-1 block w-full rounded border border-input bg-background px-3 py-2">{Object.entries(PARTNER_STATUS).map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label><p className="text-xs text-muted-foreground">Review status records the decision. Portal access is managed separately in Users.</p>{saveError && <p role="alert" className="text-destructive">{saveError}</p>}<button onClick={saveReview} disabled={busy} className="rounded-md bg-teal/20 px-5 py-2.5 text-sm font-medium uppercase hover:bg-teal/30 disabled:opacity-50">{busy ? "Saving…" : "Save Review"}</button></div>}</SheetContent></Sheet>
  </div>;
}
