import { applicationTableRow, applicationColumns, applicationStage, APPLICATION_STATUS_CHIPS, DEFAULT_APPLICATION_COLUMNS } from "@/lib/application-columns";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Pencil, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getAccounts } from "@/lib/users.functions";
import { fetchAllRows, toCsv } from "@/lib/admin-export";
import { combineApplicationRecords, type ApplicationData, type ApplicationRecord } from "@/lib/application-records";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { GripVertical } from "lucide-react";

const label = (key: string) => key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
function valueText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Not recorded";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((item) => typeof item === "object" && item ? Object.entries(item).map(([key, val]) => `${label(key)}: ${valueText(val)}`).join(" · ") : String(item)).join("\n");
  return typeof value === "object" ? Object.entries(value).map(([key, val]) => `${label(key)}: ${valueText(val)}`).join("\n") : String(value);
}
function RecordFields({ title, data }: { title: string; data: ApplicationData | null }) {
  if (!data) return null;
  return <details open className="border-t border-border py-3"><summary className="cursor-pointer text-sm font-semibold">{title}</summary><dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">{Object.entries(data).map(([key, value]) => <div key={key} className={Array.isArray(value) || key.endsWith("notes") ? "sm:col-span-2" : ""}><dt className="text-muted-foreground">{label(key)}</dt><dd className="mt-0.5 whitespace-pre-wrap break-words">{valueText(value)}</dd></div>)}</dl></details>;
}

function ApplicationDocuments({ record }: { record: ApplicationRecord }) {
  const docs = [
    ["ID document", record.user?.id_file_path ?? record.scholar?.["id_file_path"]],
    ["Photo", record.user?.photo_path ?? record.scholar?.["photo_path"]],
    ["Learner indemnity", record.booking?.["indemnity_path"] ?? record.imported?.["indemnity_file"]],
    ["Host indemnity", record.booking?.["company_indemnity_path"]],
  ].filter((doc): doc is [string, string] => typeof doc[1] === "string" && !!doc[1]);
  const files = useQuery({ queryKey: ["admin", "application-documents", record.key, docs], enabled: docs.length > 0, staleTime: 240_000, queryFn: () => Promise.all(docs.map(async ([name, path]) => {
    const bucket = supabase.storage.from("scholar-docs");
    const info = await bucket.info(path);
    if (info.error || !info.data) return { name, path, url: null, image: false };
    const signed = await bucket.createSignedUrl(path, 300);
    return { name, path, url: signed.data?.signedUrl ?? null, image: info.data.contentType?.startsWith("image/") === true };
  })) });
  if (!docs.length) return <p className="my-3 text-xs text-muted-foreground">No uploaded documents recorded.</p>;
  return <section className="my-4 space-y-3"><h3 className="text-sm font-semibold">Documents</h3>{files.isPending ? <p className="text-xs">Checking files…</p> : files.error ? <p className="text-xs text-destructive">Unable to check documents.</p> : files.data?.map((file) => <div key={file.name} className="rounded border border-border p-3 text-xs"><p className="font-medium">{file.name}</p>{file.url ? <><a href={file.url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-primary"><Download className="h-3.5 w-3.5" />Open / download</a>{file.image && <img src={file.url} alt={file.name} className="mt-2 max-h-44 w-full object-contain" />}</> : <p className="mt-1 text-muted-foreground">File unavailable.</p>}</div>)}</section>;
}

export function ApplicationsList({ onEditImported, onDeleteImported }: { onEditImported: (row: ApplicationData) => void; onDeleteImported: (row: ApplicationData) => void }) {
  const getAccountsFn = useServerFn(getAccounts);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("all");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_APPLICATION_COLUMNS);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const records = useQuery({ queryKey: ["admin", "combined-applications"], queryFn: async () => {
    const [accounts, bookings, imported, scholars, companies] = await Promise.all([
      getAccountsFn(),
      fetchAllRows(async (from, to) => { const r = await supabase.from("bookings").select("*").order("created_at", { ascending: false }).order("id").range(from, to); if (r.error) throw r.error; return r.data ?? []; }),
      fetchAllRows(async (from, to) => { const r = await supabase.from("legacy_applications").select("*").order("id", { ascending: false }).range(from, to); if (r.error) throw r.error; return r.data ?? []; }),
      fetchAllRows(async (from, to) => { const r = await supabase.from("scholar_profiles").select("*").order("user_id").range(from, to); if (r.error) throw r.error; return r.data ?? []; }),
      fetchAllRows(async (from, to) => { const r = await supabase.from("companies").select("*").order("id").range(from, to); if (r.error) throw r.error; return r.data ?? []; }),
    ]);
    return combineApplicationRecords(accounts, bookings, imported, scholars, companies);
  } });
  const all = records.data ?? [];
  const tableRows = all.map((record) => ({ record, data: applicationTableRow(record) }));
  const columns = applicationColumns(tableRows.map((row) => row.data));
  const shownColumns = visibleColumns.flatMap((key) => { const column = columns.find((item) => item.key === key); return column ? [column] : []; });
  function reorderColumn(key: string, toIndex: number) {
    setVisibleColumns((current) => {
      const fromIndex = current.indexOf(key);
      if (fromIndex < 0 || fromIndex === toIndex) return current;
      const next = [...current];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, key);
      return next;
    });
  }
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const matches = tableRows.filter(({ record, data }) => (!source || record.source === source) && (!search.trim() || Object.values(data).some((value) => String(value ?? "").toLowerCase().includes(search.trim().toLowerCase()))));
  const rows = matches.filter(({ record }) => status === "all" || applicationStage(record) === status);
  const selected = all.find((record) => record.key === selectedKey);
  function download() {
    const data = tableRows.map((row) => row.data);
    const url = URL.createObjectURL(new Blob([toCsv(columns, data)], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "applications-full.csv"; anchor.click(); URL.revokeObjectURL(url);
  }
  return <section className="bg-ivory" data-slot="admin-list">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-6"><h1 className="text-2xl font-medium">Applications ({rows.length})</h1><Button variant="outline" disabled={records.isPending || !!records.error} onClick={download}>Export all</Button></div>
    <div className="flex flex-wrap items-end gap-4 px-6 py-4"><label className="text-sm">Search<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, career, company or reference" className="mt-1 block w-72 max-w-full rounded border border-input bg-background px-3 py-2" /></label><label className="text-sm">Source<select value={source} onChange={(e) => setSource(e.target.value)} className="mt-1 block rounded border border-input bg-background px-3 py-2"><option value="">All</option><option>Booking</option><option>Imported</option></select></label><Button variant="outline" size="icon" aria-label="Refresh" onClick={() => void records.refetch()} disabled={records.isFetching}><RefreshCw className={`h-4 w-4 ${records.isFetching ? "animate-spin" : ""}`} /></Button><Popover><PopoverTrigger asChild><Button variant="outline" className="ml-auto text-sm font-normal">Customise View ({shownColumns.length})</Button></PopoverTrigger><PopoverContent align="end" className="max-h-96 w-80 overflow-y-auto p-3 text-sm"><div className="mb-3 flex gap-3"><button type="button" onClick={() => setVisibleColumns(columns.map((column) => column.key))} className="text-primary underline">Show all</button><button type="button" onClick={() => setVisibleColumns(DEFAULT_APPLICATION_COLUMNS)} className="text-primary underline">Compact view</button></div>
      <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Visible columns (drag to reorder)</p>
      {shownColumns.map((column, index) => (
        <div
          key={column.key}
          draggable
          onDragStart={() => setDraggedKey(column.key)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); if (draggedKey) reorderColumn(draggedKey, index); setDraggedKey(null); }}
          onDragEnd={() => setDraggedKey(null)}
          className={`flex cursor-move items-center gap-2 rounded py-1 ${draggedKey === column.key ? "opacity-40" : ""}`}
        >
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input type="checkbox" checked disabled={shownColumns.length === 1} onChange={() => setVisibleColumns(visibleColumns.filter((key) => key !== column.key))} />
          <span className="flex-1">{column.label}</span>
        </div>
      ))}
      <p className="mb-1 mt-3 text-xs font-semibold uppercase text-muted-foreground">Other columns</p>
      {columns.filter((column) => !visibleColumns.includes(column.key)).map((column) => <label key={column.key} className="flex items-center gap-2 py-1"><input type="checkbox" checked={false} onChange={() => setVisibleColumns([...visibleColumns, column.key])} />{column.label}</label>)}
    </PopoverContent></Popover></div>
    <div role="group" aria-label="Filter applications by status" className="flex flex-wrap gap-1.5 px-6 pb-4">{APPLICATION_STATUS_CHIPS.map(([key, title]) => <button key={key} type="button" aria-pressed={status === key} onClick={() => setStatus(key)} className={"rounded-full border px-3 py-1.5 text-xs font-medium " + (status === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-ivory hover:bg-teal/15")}>{title} <span className="ml-1 opacity-70">{matches.filter(({ record }) => key === "all" || applicationStage(record) === key).length}</span></button>)}</div>
    <div className="overflow-x-auto px-6 pb-6"><table className="w-full min-w-[1200px] text-left text-xs"><thead><tr>{shownColumns.map((column) => <th key={column.key} className="whitespace-nowrap border-b border-border px-3 py-2 font-medium">{column.label}</th>)}<th className="border-b border-border px-3 py-2 font-medium">Actions</th></tr></thead><tbody>
      {records.isPending ? <tr><td colSpan={shownColumns.length + 1} className="p-4">Loading…</td></tr> : records.error ? <tr><td colSpan={shownColumns.length + 1} role="alert" className="p-4 text-destructive">{records.error.message}</td></tr> : !rows.length ? <tr><td colSpan={shownColumns.length + 1} className="p-4">No applications match these filters.</td></tr> : rows.map(({ record, data }) => <tr key={record.key} className="border-b border-border hover:bg-background/40">{shownColumns.map((column) => <td key={column.key} className="px-3 py-2">{column.key === "reference" ? <button onClick={() => setSelectedKey(record.key)} className="max-w-40 truncate text-left text-primary hover:underline" title={record.reference}>{record.source} #{record.reference}</button> : ["student_name", "learner", "name"].includes(column.key) ? <button onClick={() => setSelectedKey(record.key)} className="max-w-40 truncate text-left" title={record.email}>{record.name}</button> : column.key === "amount_due" && typeof data[column.key] === "number" ? "R " + Number(data[column.key]).toFixed(2) : <span className="block max-w-64 whitespace-pre-wrap break-words">{valueText(data[column.key])}</span>}</td>)}<td className="px-3 py-2"><button type="button" onClick={() => setSelectedKey(record.key)} className="whitespace-nowrap rounded border border-border px-2 py-1">View details</button></td></tr>)}
    </tbody></table></div>
    <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelectedKey(null); }}><SheetContent className="w-full overflow-y-auto bg-ivory sm:max-w-xl"><SheetHeader><SheetTitle>{selected?.name ?? "Application details"}</SheetTitle><SheetDescription>{selected ? `${selected.source} #${selected.reference}` : ""}</SheetDescription></SheetHeader>{selected && <>
      {!selected.user && <p className="my-3 text-xs text-muted-foreground">No unique user account is linked to this record. The original application details are preserved.</p>}
      {selected.imported && <div className="my-4 flex gap-2"><Button variant="outline" onClick={() => onEditImported(selected.imported!)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit application</Button><Button variant="outline" onClick={() => onDeleteImported(selected.imported!)}>Delete application</Button></div>}
      <ApplicationDocuments record={selected} />
      <RecordFields title="User" data={selected.user as unknown as ApplicationData | null} />
      <RecordFields title="Scholar profile and guardian details" data={selected.scholar} />
      <RecordFields title="Host company and HR contacts" data={selected.host} />
      <RecordFields title="Booking, payment and reminder details" data={selected.booking} />
      <RecordFields title="Original imported application" data={selected.imported} />
    </>}</SheetContent></Sheet>
  </section>;
}
