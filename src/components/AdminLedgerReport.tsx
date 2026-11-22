import { LEDGER_COUNTRIES, countryCurrency, deviceCountry, loadLedgerRate, localLedgerCost, formatLedgerMoney } from "@/lib/ledger-currency";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BoolIcon } from "@/components/BoolIcon";
import { completeExportColumns, fetchAllRows, toCsv, type ExportColumn } from "@/lib/admin-export";

export function AdminLedgerReport({ table }: { table: "activity_log" | "ai_token_ledger" }) {
  const token = table === "ai_token_ledger", title = token ? "Token Ledger" : "Activity Log";
  const [country, setCountry] = useState("");
  useEffect(() => { setCountry(deviceCountry(navigator.language || "en-ZA", Intl.DateTimeFormat().resolvedOptions().timeZone)); }, []);
  const selectedCurrency = countryCurrency(country);
  const rate = useQuery({ queryKey: ["ledger-exchange-rate", selectedCurrency], enabled: token && !!country, queryFn: () => loadLedgerRate(selectedCurrency), staleTime: 60 * 60 * 1000, retry: 1 });
  const currency = rate.data?.quote ?? "USD", conversion = rate.data?.rate ?? 1;
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
    {key:"created_at",label:"Time (UTC)"},{key:"feature",label:"Feature"},{key:"model",label:"Model"},
    {key:"input_tokens",label:"Input"},{key:"cached_input_tokens",label:"Cached input"},{key:"output_tokens",label:"Output"},{key:"total_tokens",label:"Total tokens"},
    {key:"actual_cost_local",label:`Actual cost (${currency})`},{key:"estimated_cost_local",label:`Estimated cost (${currency})`},{key:"succeeded",label:"Succeeded"},{key:"actor_user_id",label:"Actor ID"},{key:"request_id",label:"Request ID"},{key:"error_code",label:"Error"},
  ] : [{key:"created_at",label:"Time (UTC)"},{key:"resource_type",label:"Resource"},{key:"action",label:"Action"},{key:"record_id",label:"Record ID"},{key:"actor_user_id",label:"Actor ID"}];
  const actual = rows.map((row) => localLedgerCost(row, "provider", conversion));
  const estimated = rows.map((row) => localLedgerCost(row, "estimated", conversion));
  const total = (values: (number | null)[]) => values.some((value) => value !== null) ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0) : null;
  const unpriced = rows.filter((row) => typeof row["cost_usd"] !== "number").length;
  function cell(row: Record<string, unknown>, key: string) {
    const value = row[key];
    if (key === "created_at") return String(value ?? "").replace("T", " ").replace(/\+00:00$|Z$/, "");
    if (key === "actor_user_id" && !value) return "System / unattributed";
    if (key === "actual_cost_local") return formatLedgerMoney(localLedgerCost(row, "provider", conversion), currency);
    if (key === "estimated_cost_local") return formatLedgerMoney(localLedgerCost(row, "estimated", conversion), currency);
    if (key.endsWith("_tokens") && value === null) return "Not reported";
    if (key === "cost_source") return value === "estimated" ? "Estimated" : value === "provider" ? "Provider reported" : "Unavailable";
    if (typeof value === "boolean") return <BoolIcon value={value} />;
    return value === null || value === undefined ? "—" : String(value);
  }
  function download() {
    const exported = token ? all.map((row) => ({ ...row, actual_cost_local: localLedgerCost(row, "provider", conversion), estimated_cost_local: localLedgerCost(row, "estimated", conversion), display_country: country, display_currency: currency, exchange_rate: conversion, exchange_rate_date: rate.data?.date ?? null })) : all;
    const url = URL.createObjectURL(new Blob([toCsv(completeExportColumns(columns, exported), exported)], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = table + ".csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <section className="bg-ivory p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl">{title} ({rows.length})</h2><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Refresh" onClick={() => void report.refetch()} disabled={report.isFetching}><RefreshCw className={`h-4 w-4 ${report.isFetching ? "animate-spin" : ""}`} /></Button><Button variant="outline" disabled={report.isPending || !!report.error} onClick={download}>Export all</Button></div></div>
    {token && <div className="mt-3 space-y-2"><label className="flex flex-wrap items-center gap-2 text-sm">Country<select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded border border-input bg-background px-3 py-2"><option value="" disabled>Detecting device country…</option>{LEDGER_COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.name} ({item.currency})</option>)}</select></label><p className="text-sm">Reported actual: <strong>{formatLedgerMoney(total(actual), currency)}</strong> · Estimated: <strong>{formatLedgerMoney(total(estimated), currency)}</strong> · {unpriced} unpriced requests</p>{rate.error ? <p role="status" className="text-xs text-muted-foreground">{selectedCurrency} conversion unavailable. Amounts remain in USD.</p> : rate.isFetching ? <p className="text-xs text-muted-foreground">Loading exchange rate…</p> : currency !== 'USD' && <p className="text-xs text-muted-foreground">USD → {currency}: {conversion} · {rate.data?.date} · <a href="https://frankfurter.dev" target="_blank" rel="noreferrer" className="underline">Reference rate</a></p>}</div>}
    <p className="mt-2 text-xs text-muted-foreground">{token ? "Reported costs and estimates are separate. Cached input is included in the input total." : "Tracks database changes from the time logging was enabled. Older activity cannot be reconstructed."}</p>
    <div className="mt-4 flex flex-wrap gap-4"><label className="text-sm">Search<input className="mt-1 block rounded border border-input bg-background px-3 py-2" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label className="text-sm">From (UTC)<input type="date" className="mt-1 block rounded border border-input bg-background px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="text-sm">Until (UTC)<input type="date" className="mt-1 block rounded border border-input bg-background px-3 py-2" value={until} onChange={(e) => setUntil(e.target.value)} /></label></div>
    <div className="mt-4 overflow-x-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-track]:bg-muted"><table className="w-full min-w-[850px] text-left text-xs"><thead><tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap border-b border-border px-3 py-2 font-medium">{column.label}</th>)}</tr></thead><tbody>
      {report.isPending ? <tr><td colSpan={columns.length} className="p-4">Loading…</td></tr> : report.error ? <tr><td colSpan={columns.length} role="alert" className="p-4 text-destructive">{report.error.message}</td></tr> : !rows.length ? <tr><td colSpan={columns.length} className="p-4">{all.length ? "No records match these filters." : token ? "No AI usage has been recorded yet." : "No activity has been recorded yet."}</td></tr> : rows.map((row) => <tr key={String(row["id"])}>{columns.map((column) => <td key={column.key} className="whitespace-nowrap border-b border-border px-3 py-2">{cell(row, column.key)}</td>)}</tr>)}
    </tbody></table></div>
  </section>;
}
