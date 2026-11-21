import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BoolIcon } from "@/components/BoolIcon";
import { completeExportColumns, fetchAllRows, toCsv, type ExportColumn } from "@/lib/admin-export";

export function AdminLedgerReport({ table }: { table: "activity_log" | "ai_token_ledger" }) {
  const token = table === "ai_token_ledger", title = token ? "Token Ledger" : "Activity Log";
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const report = useQuery({ queryKey: ["admin", "report-ledger", table], queryFn: () => fetchAllRows(async (start, end) => {
    const result = await supabase.from(table).select("*").order("created_at", { ascending: false }).order("id").range(start, end);
    if (result.error) throw result.error;
    return result.data ?? [];
  }) });
  const all = report.data ?? [];
  const rows = all.filter((row) => {
    const date = String(row["created_at"] ?? "").slice(0, 10);
    if ((from && date < from) || (until && date > until)) return false;
    return !search.trim() || Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(search.trim().toLowerCase()));
  });
  const columns: ExportColumn[] = token ? [
    {key:"created_at",label:"Time (UTC)"},{key:"feature",label:"Feature"},{key:"provider",label:"Provider"},{key:"model",label:"Model"},
    {key:"input_tokens",label:"Input"},{key:"cached_input_tokens",label:"Cached input"},{key:"output_tokens",label:"Output"},{key:"total_tokens",label:"Total tokens"},
    {key:"cost_usd",label:"Cost (USD)"},{key:"cost_source",label:"Cost basis"},{key:"succeeded",label:"Succeeded"},{key:"actor_user_id",label:"Actor ID"},{key:"request_id",label:"Request ID"},{key:"error_code",label:"Error"},
  ] : [{key:"created_at",label:"Time (UTC)"},{key:"resource_type",label:"Resource"},{key:"action",label:"Action"},{key:"record_id",label:"Record ID"},{key:"actor_user_id",label:"Actor ID"}];
  const cost = rows.reduce((total, row) => total + (typeof row["cost_usd"] === "number" ? row["cost_usd"] : 0), 0);
  const unpriced = rows.filter((row) => row["cost_usd"] === null).length;
  function cell(row: Record<string, unknown>, key: string) {
    const value = row[key];
    if (key === "created_at") return String(value ?? "").replace("T", " ").replace(/\+00:00$|Z$/, "");
    if (key === "actor_user_id" && !value) return "System / unattributed";
    if (key === "cost_usd") return typeof value === "number" ? "$" + value.toFixed(8) : "Not priced";
    if (key.endsWith("_tokens") && value === null) return "Not reported";
    if (key === "cost_source") return value === "estimated" ? "Estimated" : value === "provider" ? "Provider reported" : "Unavailable";
    if (typeof value === "boolean") return <BoolIcon value={value} />;
    return value === null || value === undefined ? "—" : String(value);
  }
  function download() {
    const url = URL.createObjectURL(new Blob([toCsv(completeExportColumns(columns, all), all)], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = table + ".csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <section className="bg-ivory p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl">{title} ({rows.length})</h2><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Refresh" onClick={() => void report.refetch()} disabled={report.isFetching}><RefreshCw className={`h-4 w-4 ${report.isFetching ? "animate-spin" : ""}`} /></Button><Button variant="outline" disabled={report.isPending || !!report.error} onClick={download}>Export all</Button></div></div>
    {token && <p className="mt-3 text-sm">Known cost for this view: <strong>{"$" + cost.toFixed(6)}</strong> USD · {unpriced} unpriced requests. Estimated amounts use recorded model rates and may differ from the provider bill.</p>}
    <p className="mt-2 text-xs text-muted-foreground">{token ? "Future AI requests are recorded without prompts, responses or document contents. Cached input is included in the input total." : "Tracks database changes from the time logging was enabled. Older activity cannot be reconstructed."}</p>
    <div className="mt-4 flex flex-wrap gap-4"><label className="text-sm">Search<input className="mt-1 block rounded border border-input bg-background px-3 py-2" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label className="text-sm">From (UTC)<input type="date" className="mt-1 block rounded border border-input bg-background px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="text-sm">Until (UTC)<input type="date" className="mt-1 block rounded border border-input bg-background px-3 py-2" value={until} onChange={(e) => setUntil(e.target.value)} /></label></div>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead><tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap border-b border-border px-3 py-2 font-medium">{column.label}</th>)}</tr></thead><tbody>
      {report.isPending ? <tr><td colSpan={columns.length} className="p-4">Loading…</td></tr> : report.error ? <tr><td colSpan={columns.length} role="alert" className="p-4 text-destructive">{report.error.message}</td></tr> : !rows.length ? <tr><td colSpan={columns.length} className="p-4">{all.length ? "No records match these filters." : token ? "No AI usage has been recorded yet." : "No activity has been recorded yet."}</td></tr> : rows.map((row) => <tr key={String(row["id"])}>{columns.map((column) => <td key={column.key} className="whitespace-nowrap border-b border-border px-3 py-2">{cell(row, column.key)}</td>)}</tr>)}
    </tbody></table></div>
  </section>;
}
