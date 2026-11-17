import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function VoucherEditor({ voucher, known, onDone, onCancel }: { voucher: Record<string, unknown>; known: Record<string, unknown>[]; onDone: () => void; onCancel: () => void }) {
  const editing = typeof voucher["id"] === "number";
  const [f, setF] = useState({ name: String(voucher["name"] ?? ""), code: String(voucher["code"] ?? ""), discount: String(voucher["discount"] ?? ""), from: String(voucher["available_from"] ?? ""), until: String(voucher["available_until"] ?? ""), limit: String(voucher["usage_limit"] ?? ""), careers: Array.isArray(voucher["careers"]) ? voucher["careers"].join("\n") : "" });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function save() {
    const discount = f.discount === "" ? null : Number(f.discount), limit = f.limit === "" ? null : Number(f.limit);
    if (!f.name.trim() || !f.code.trim()) return setError("Enter a voucher name and code.");
    if (discount !== null && (!Number.isFinite(discount) || discount < 0)) return setError("Discount must be a non-negative number.");
    if (limit !== null && (!Number.isSafeInteger(limit) || limit < 0)) return setError("Usage limit must be a non-negative whole number.");
    if (f.from && f.until && f.from > f.until) return setError("The end date must not be earlier than the start date.");
    const changedCode = !editing || f.code.trim().toLowerCase() !== String(voucher["code"] ?? "").trim().toLowerCase();
    if (changedCode && known.some((row) => row["id"] !== voucher["id"] && String(row["code"] ?? "").trim().toLowerCase() === f.code.trim().toLowerCase())) return setError("That voucher code is already in use.");
    const careers = [...new Set(f.careers.split(/\r?\n/).map((value) => value.trim()).filter(Boolean))];
    const patch = { name: f.name.trim(), code: f.code.trim(), discount, available_from: f.from || null, available_until: f.until || null, usage_limit: limit, careers: careers.length ? careers : null };
    setBusy(true); setError("");
    try {
      if (editing) {
        const result = await supabase.from("vouchers").update(patch).eq("id", Number(voucher["id"]));
        if (result.error) throw result.error;
      } else {
        for (let attempt = 0; attempt < 4; attempt++) {
          const latest = await supabase.from("vouchers").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
          if (latest.error) throw latest.error;
          const result = await supabase.from("vouchers").insert({ id: (latest.data?.id ?? 0) + 1, ...patch });
          if (!result.error) break;
          if (result.error.code !== "23505" || attempt === 3) throw result.error;
        }
      }
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String(e.message) : "Unable to save voucher."); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onCancel(); }}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "Edit voucher" : "Add voucher"}</DialogTitle><DialogDescription>Manage the voucher code, discount, dates, usage limit and career restrictions.</DialogDescription></DialogHeader><form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
    {([['name','Name','text'],['code','Code','text'],['discount','Discount','number'],['limit','Usage limit','number'],['from','Available from','date'],['until','Available until','date']] as const).map(([key, title, type]) => <label key={key} className="text-sm">{title}<input type={type} required={key === 'name' || key === 'code'} min={type === 'number' ? 0 : undefined} step={key === 'discount' ? 'any' : undefined} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} className="mt-1 w-full rounded border border-input bg-background px-3 py-2" /></label>)}
    <label className="text-sm sm:col-span-2">Careers (one per line; optional)<textarea rows={3} value={f.careers} onChange={(e) => setF({ ...f, careers: e.target.value })} className="mt-1 w-full rounded border border-input bg-background px-3 py-2" /></label>
    {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
    <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button><Button disabled={busy}>{busy ? 'Saving…' : 'Save voucher'}</Button></div>
  </form></DialogContent></Dialog>;
}
