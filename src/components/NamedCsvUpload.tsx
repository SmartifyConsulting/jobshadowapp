import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/admin-export";
import { planNamedCsv } from "@/lib/named-csv";
import { Button } from "@/components/ui/button";

export function NamedCsvUpload({ table }: { table: "sectors" | "careers" }) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function upload() {
    if (!file) return;
    setBusy(true); setMessage(""); let created = 0, updated = 0;
    try {
      const existing = await fetchAllRows(async (from, to) => { const result = await supabase.from(table).select("id, name").order("id").range(from, to); if (result.error) throw result.error; return result.data ?? []; });
      const plan = planNamedCsv(await file.text(), existing as { id: number; name: string }[], table === "careers");
      if (plan.creates.length) {
        const result = table === "careers"
          ? await supabase.from("careers").insert(plan.creates)
          : await supabase.from("sectors").insert(plan.creates.map(({ id, name }) => ({ id, name })));
        if (result.error) throw new Error(result.error.code === '23505' ? 'An ID was added by another user. Please retry the upload.' : result.error.message);
        created = plan.creates.length;
      }
      for (const row of plan.updates) {
        const result = await supabase.from("careers").update({ description: row.description }).eq("id", row.id);
        if (result.error) throw result.error;
        updated++;
      }
      setMessage(`Created ${created}, updated ${updated}, unchanged ${plan.unchanged}.`);
    } catch (error) { setMessage(`${created} created, ${updated} updated. ${error instanceof Error ? error.message : 'Upload failed.'}`); }
    finally { setBusy(false); await qc.invalidateQueries({ queryKey: ["admin", table] }); }
  }
  return <section className="border-b border-border bg-ivory px-6 py-4"><div className="flex flex-wrap items-end gap-3"><label className="text-sm">Upload {table} CSV<input type="file" accept=".csv,text/csv" disabled={busy} className="mt-1 block text-xs" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setMessage(''); }} /></label><Button variant="outline" disabled={busy || !file} onClick={() => void upload()}>{busy ? 'Importing…' : 'Import CSV'}</Button></div><p className="mt-2 text-xs text-muted-foreground">Columns: Name (required), ID (optional){table === 'careers' ? ', Description (optional)' : ''}. Existing names are kept; no records are deleted.</p>{message && <p role="status" className="mt-2 text-sm">{message}</p>}</section>;
}
