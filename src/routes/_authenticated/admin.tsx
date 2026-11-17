import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Users as UsersIcon, FileText, ShoppingCart, Briefcase, GraduationCap, Pencil, Trash2, IdCard, Image as ImageIcon, Download, BadgeCheck, ChevronDown, LayoutGrid, List, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { accountInitial, alphabetInitial } from "@/lib/alphabet";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { SITE_NAV } from "@/components/SiteLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { sendQueuedEmails } from "@/lib/email.functions";
import { getAccounts, updateAccount, removeAccount } from "@/lib/users.functions";
import { mapCsvColumns } from "@/lib/csv-import.functions";
import { confirmAction, notify } from "@/lib/dialogs";
import type { AccountRow } from "@/lib/users.server";
import { renderEmailHtml } from "@/lib/email-template";
import { completeExportColumns, fetchAllRows, joinApplicationContacts, toCsv } from "@/lib/admin-export";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin: Job Shadow" },
      { name: "description", content: "JobShadow admin: applications, companies, vouchers and careers." },
      { property: "og:title", content: "Admin: Job Shadow" },
      { property: "og:description", content: "JobShadow admin area." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Field = "text" | "number" | "date" | "checkbox";
type Col = { key: string; label: string; field?: Field };
const TABLES: { id: string; label: string; icon: typeof UsersIcon; table: string; singular: string; cols: Col[]; csvUpload?: boolean; dateCompanyFilter?: boolean; indemnityEdit?: boolean; custom?: boolean }[] = [
  { id: "users", label: "Users", icon: GraduationCap, table: "legacy_users", singular: "Users", custom: true, cols: [] },
  { id: "apps", label: "Applications", icon: UsersIcon, table: "legacy_applications", singular: "Applications", dateCompanyFilter: true, indemnityEdit: true, cols: [
    { key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "id_number", label: "ID No." },
    { key: "email", label: "Email" }, { key: "contact", label: "Contact" }, { key: "school", label: "School" },
    { key: "company", label: "Company" }, { key: "career", label: "Career" }, { key: "dates", label: "Dates" },
    { key: "paid", label: "Paid", field: "checkbox" }, { key: "indemnity", label: "Indemnity", field: "checkbox" }, { key: "cancelled", label: "Cancelled", field: "checkbox" } ] },
  { id: "companies", label: "Companies", icon: FileText, table: "companies", singular: "Jobs", csvUpload: true, cols: [
    { key: "id", label: "ID" }, { key: "company", label: "Company" }, { key: "career", label: "Career" },
    { key: "sector", label: "Sector" }, { key: "location", label: "Location" }, { key: "mentor_name", label: "Mentor" },
    { key: "mentor_email", label: "Mentor email" }, { key: "mentor_phone", label: "Mentor phone" },
    { key: "mentor_position", label: "Mentor position" },
    { key: "backup_mentor_name", label: "Backup mentor" }, { key: "backup_mentor_phone", label: "Backup mentor phone" }, { key: "backup_mentor_email", label: "Backup mentor email" },
    { key: "hr_contact_name", label: "HR contact name" }, { key: "hr_contact_phone", label: "HR contact phone" }, { key: "hr_contact_email", label: "HR contact email" },
    { key: "dates", label: "Dates" }, { key: "max_applicants", label: "Places", field: "number" }, { key: "amount", label: "Price (R)", field: "number" },
    { key: "active", label: "Active", field: "checkbox" }, { key: "mode", label: "Type" }, { key: "logo_path", label: "Logo" } ] },
  { id: "sectors", label: "Sectors", icon: FileText, table: "sectors", singular: "Sectors", cols: [{ key: "name", label: "Sector Name" }, { key: "_student_count", label: "Students" }] },
  { id: "careers", label: "Careers", icon: Briefcase, table: "careers", singular: "Careers", cols: [{ key: "name", label: "Career Name" }, { key: "_student_count", label: "Students" }] },
  { id: "vouchers", label: "Vouchers", icon: ShoppingCart, table: "vouchers", singular: "Vouchers", cols: [
    { key: "id", label: "#" }, { key: "name", label: "Name" }, { key: "code", label: "Code" },
    { key: "discount", label: "Discount", field: "number" }, { key: "available_from", label: "From", field: "date" },
    { key: "available_until", label: "Until", field: "date" }, { key: "usage_limit", label: "Limit", field: "number" } ] },
  { id: "settings", label: "Booking Settings", icon: FileText, table: "booking_settings", singular: "Settings", custom: true, cols: [] },
  { id: "emails", label: "Email Archive", icon: FileText, table: "email_outbox", singular: "Emails", custom: true, cols: [] },
];

function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin");
      return (data?.length ?? 0) > 0;
    },
  });
}

function AdminPage() {
  const admin = useIsAdmin();
  const [active, setActive] = useState("apps");
  const section = TABLES.find((t) => t.id === active);
  if (!section) return null;

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="w-60 shrink-0 border-r border-primary/20 bg-primary text-primary-foreground">
        <div className="flex items-center justify-center px-5 py-6">
          <BrandLogo className="h-[11.2rem] w-[11.2rem]" />
        </div>
        <nav className="space-y-1 px-3 pb-6">
          {TABLES.map((t) => (
            <button key={t.id} onClick={() => setActive(t.id)} className={`flex w-full items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-left text-sm font-medium transition ${active === t.id ? "border-primary-foreground bg-primary-foreground/15 text-primary-foreground" : "border-transparent text-primary-foreground/85 hover:bg-primary-foreground/10 hover:text-primary-foreground"}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-primary px-6 py-4 text-primary-foreground">
          <nav aria-label="Website navigation" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {SITE_NAV.map((item) => <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === "/" }} activeProps={{ className: "border-cta" }} className="border-b-4 border-transparent py-2 text-sm font-semibold transition hover:border-accent">{item.label}</Link>)}
          </nav>
          <button onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/"))} className="text-sm font-medium hover:underline">Logout</button>
        </header>
        <main className="p-0">
          {admin.isLoading ? (
            <p className="p-8">Loading…</p>
          ) : !admin.data ? (
            <p className="p-8">Your account doesn't have admin access. Ask JobShadow to grant it.</p>
          ) : section.id === "users" ? (
            <AdminUsers key={section.id} />
          ) : section.id === "emails" ? (
            <EmailArchive key={section.id} />
          ) : section.id === "settings" ? (
            <BookingSettings key={section.id} />
          ) : (
            <DataTable key={section.id} title={section.singular} table={section.table} cols={section.cols} csvUpload={section.csvUpload} dateCompanyFilter={section.dateCompanyFilter} indemnityEdit={section.indemnityEdit} />
          )}
        </main>
      </div>
    </div>
  );
}

function fmt(v: unknown) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function exportCsv(title: string, cols: Col[], rows: Record<string, unknown>[]) {
  const blob = new Blob([toCsv(cols, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function DataTable({ title, table, cols, csvUpload, dateCompanyFilter, indemnityEdit }: { title: string; table: string; cols: Col[]; csvUpload?: boolean | undefined; dateCompanyFilter?: boolean | undefined; indemnityEdit?: boolean | undefined }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const alphabetField = table === "companies" ? "company" : ["vouchers", "careers"].includes(table) ? "name" : null;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [company, setCompany] = useState("All companies");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showSpam, setShowSpam] = useState(false);
  const [newName, setNewName] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const mapCsvColumnsFn = useServerFn(mapCsvColumns);
  const isUsers = table === "legacy_users";
  const isNameOnly = table === "sectors" || table === "careers";

  async function addNamed() {
    const name = newName.trim();
    if (!name) return;
    setAddBusy(true);
    const { data: maxRow } = await supabase.from(table as "careers").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
    const nextId = ((maxRow?.id as number | undefined) ?? 0) + 1;
    const { error } = await (supabase.from(table as "careers") as any).insert({ id: nextId, name });
    setAddBusy(false);
    if (error) return notify(error.message, "error");
    setNewName("");
    qc.invalidateQueries({ queryKey: ["admin", table] });
  }
  async function loadAll(source: string) {
    return fetchAllRows(async (from, to) => {
      let query = supabase.from(source as "careers").select("*").order("id", { ascending: false });
      if (source === "legacy_users" && !showSpam) query = (query as any).eq("is_spam", false);
      const { data, error } = await query.range(from, to);
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    });
  }
  async function exportAll() {
    setExporting(true);
    setExportError(null);
    try {
      let all = await loadAll(table);
      if (table === "legacy_applications") all = joinApplicationContacts(all, await loadAll("companies"));
      exportCsv(title, completeExportColumns(cols.filter((c) => !c.key.startsWith("_")), all), all);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Unable to export records. Please try again.");
    } finally {
      setExporting(false);
    }
  }
  const isNameSorted = table === "sectors" || table === "careers";
  const { data, isLoading } = useQuery({
    queryKey: ["admin", table, showSpam],
    queryFn: async () => {
      let query = isNameSorted
        ? supabase.from(table as "careers").select("*").order("name", { ascending: true })
        : supabase.from(table as "careers").select("*").order("id", { ascending: false });
      if (table === "legacy_users" && !showSpam) query = (query as any).eq("is_spam", false);
      const rows: Record<string, unknown>[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await query.range(from, from + 999);
        if (error) throw error;
        rows.push(...(data as Record<string, unknown>[]));
        if (!data || data.length < 1000) break;
      }
      if (isNameSorted) {
        const field = table === "sectors" ? "sector" : "career";
        const counts = new Map<string, number>();
        for (let from = 0; ; from += 1000) {
          const { data: bookingRows, error } = await supabase.from("bookings").select(field).range(from, from + 999);
          if (error) throw error;
          (bookingRows ?? []).forEach((b: Record<string, unknown>) => {
            const v = (b[field] as string | null)?.trim().toLowerCase();
            if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
          });
          if (!bookingRows || bookingRows.length < 1000) break;
        }
        rows.forEach((r) => { r["_student_count"] = counts.get(String(r["name"]).trim().toLowerCase()) ?? 0; });
      }
      return rows;
    },
  });
  const companies = useMemo(() => ["All companies", ...new Set((data ?? []).map((r) => fmt(r["company"])).filter(Boolean))], [data]);
  const letterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (alphabetField) (data ?? []).forEach((row) => {
      const initial = alphabetInitial(fmt(row[alphabetField]));
      if (initial) counts.set(initial, (counts.get(initial) ?? 0) + 1);
    });
    return counts;
  }, [data, alphabetField]);
  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (data ?? []).filter((r) => {
      if (letter && alphabetField && alphabetInitial(fmt(r[alphabetField])) !== letter) return false;
      if (s && !cols.some((c) => fmt(r[c.key]).toLowerCase().includes(s))) return false;
      if (dateCompanyFilter) {
        if (company !== "All companies" && fmt(r["company"]) !== company) return false;
        const d = fmt(r["dates"]);
        if (from && d && d < from) return false;
        if (to && d && d > to) return false;
      }
      return true;
    });
  }, [data, q, cols, dateCompanyFilter, company, from, to, letter, alphabetField]);

  async function remove(row: Record<string, unknown>) {
    if (!(await confirmAction("Delete this record?", { danger: true, confirmLabel: "Delete" }))) return;
    const { error } = await (supabase.from(table as "careers") as any).delete().eq("id", row["id"]);
    if (error) return notify(error.message, "error");
    qc.invalidateQueries({ queryKey: ["admin", table] });
  }

  function coerce(field: Col["field"] | undefined, raw: string | null) {
    if (raw === null || raw === "") return null;
    if (field === "number") { const n = Number(raw); return Number.isFinite(n) ? n : null; }
    if (field === "checkbox") return /^(1|true|yes|y)$/i.test(raw.trim());
    return raw;
  }

  async function uploadCsv(file: File) {
    setUploadBusy(true);
    setUploadStatus(null);
    try {
      const text = await file.text();
      const [headerLine, ...lines] = text.trim().split(/\r?\n/);
      const headers = (headerLine ?? "").split(",").map((h) => h.trim());
      const rawRows = lines.filter(Boolean).map((line) => line.split(",").map((v) => v.trim()));
      if (rawRows.length === 0) return;

      setUploadStatus("Matching columns…");
      const mapping = await mapCsvColumnsFn({
        data: { headers, sampleRows: rawRows.slice(0, 3), targetColumns: cols.map((c) => ({ key: c.key, label: c.label, field: c.field })) },
      });

      const records = rawRows.map((vals) => {
        const rec: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          const targetKey = mapping[h];
          if (!targetKey) return;
          const col = cols.find((c) => c.key === targetKey);
          rec[targetKey] = coerce(col?.field, vals[i] ?? null);
        });
        return rec;
      }).filter((r) => r["id"] !== undefined && r["id"] !== null);

      const unmapped = headers.filter((h) => !mapping[h]);
      if (records.length === 0) {
        setUploadStatus("Couldn't match any rows — make sure the file has an ID column.");
        return;
      }
      const { error } = await (supabase.from(table as "careers") as any).upsert(records);
      if (error) return setUploadStatus(error.message);
      setUploadStatus(`Imported ${records.length} row${records.length === 1 ? "" : "s"}.${unmapped.length ? ` Skipped unmatched columns: ${unmapped.join(", ")}.` : ""}`);
      qc.invalidateQueries({ queryKey: ["admin", table] });
    } finally {
      setUploadBusy(false);
    }
  }

  if (editing) {
    const onDone = () => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin", table] }); };
    const onCancel = () => setEditing(null);
    return indemnityEdit
      ? <ApplicationEditPanel table={table} row={editing} onDone={onDone} onCancel={onCancel} />
      : <EditRecord title={title} table={table} cols={cols} row={editing} onDone={onDone} onCancel={onCancel} />;
  }

  if (creating) {
    const onDone = () => { setCreating(false); qc.invalidateQueries({ queryKey: ["admin", table] }); };
    return <CreateRole onDone={onDone} onCancel={() => setCreating(false)} />;
  }

  return (
    <div>
      {alphabetField && (
        <div className="flex flex-wrap gap-1.5 bg-background px-6 py-4" aria-label={`Filter ${title} alphabetically`}>
          <button type="button" onClick={() => setLetter(null)} aria-pressed={letter === null} className={`rounded-md px-2.5 py-1.5 text-xs font-medium uppercase transition ${letter === null ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground hover:bg-teal/20"}`}>All</button>
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((ch) => (
            <button key={ch} type="button" onClick={() => setLetter(letter === ch ? null : ch)} disabled={!letterCounts.has(ch)} aria-pressed={letter === ch} className={`rounded-md px-2.5 py-1.5 text-xs font-medium uppercase transition ${letter === ch ? "bg-primary text-primary-foreground" : !letterCounts.has(ch) ? "bg-muted/30 text-muted-foreground/50" : "bg-muted/70 text-foreground hover:bg-teal/20"}`}>{ch}</button>
          ))}
        </div>
      )}
      {csvUpload && (
        <div className="grid border-b border-foreground/10 sm:grid-cols-2">
          <div>
            <div className="border-b border-border bg-background px-6 py-5 text-foreground"><h2 className="text-xl font-medium">Upload New Jobs</h2></div>
            <div className="bg-background px-6 py-5 text-foreground">
              <p className="mb-2 text-xs opacity-80">Column headers don't need to match exactly — AI matches them to the right fields automatically.</p>
              <input type="file" accept=".csv" disabled={uploadBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCsv(f); e.target.value = ""; }} className="block text-xs disabled:opacity-50" />
              <button disabled={uploadBusy} className="mt-3 rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-sm font-medium uppercase text-foreground disabled:opacity-50">{uploadBusy ? "Processing…" : "Upload File"}</button>
              {uploadStatus && <p className="mt-2 text-xs font-medium">{uploadStatus}</p>}
            </div>
          </div>
          <div>
            <div className="border-b border-border bg-background px-6 py-5 text-foreground"><h2 className="text-xl font-medium">Update Jobs</h2></div>
            <div className="bg-background px-6 py-5 text-foreground">
              <p className="mb-2 text-xs opacity-80">Column headers don't need to match exactly — AI matches them to the right fields automatically.</p>
              <input type="file" accept=".csv" disabled={uploadBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCsv(f); e.target.value = ""; }} className="block text-xs disabled:opacity-50" />
              <button disabled={uploadBusy} className="mt-3 rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-sm font-medium uppercase text-foreground disabled:opacity-50">{uploadBusy ? "Processing…" : "Upload File"}</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-6 py-6 text-foreground">
        <h1 className="text-2xl font-medium">{title} {!isLoading && `(${rows.length})`}</h1>
        {dateCompanyFilter && (
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-sm">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block border-b border-input bg-transparent px-1 py-1 outline-none" /></label>
            <label className="text-sm">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block border-b border-input bg-transparent px-1 py-1 outline-none" /></label>
            <label className="text-sm">Select company
              <select value={company} onChange={(e) => setCompany(e.target.value)} className="block border-b border-input bg-transparent px-1 py-1 outline-none">
                {companies.map((c) => <option key={c} value={c} className="text-foreground">{c}</option>)}
              </select>
            </label>
          </div>
        )}
        <div className="flex items-center gap-3">
          {table === "companies" && (
            <Button onClick={() => setCreating(true)} className="rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-sm font-medium uppercase text-foreground">Add New Role</Button>
          )}
          {isNameOnly && (
            <div className="flex items-center gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`New ${title.replace(/s$/, "")} name`}
                className="border-b border-input bg-transparent px-1 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <Button onClick={addNamed} disabled={addBusy || !newName.trim()} className="rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-sm font-medium uppercase text-foreground disabled:opacity-50">Add</Button>
            </div>
          )}
          <Button onClick={exportAll} disabled={isLoading || exporting} className="rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-sm font-medium uppercase text-foreground">{exporting ? "Exporting…" : "Export"}</Button>
        </div>
      </div>
      <div className="bg-background px-6 py-6 text-foreground">
        {exportError && <p role="alert" className="mb-4 text-sm font-medium">{exportError}</p>}
        <div className="flex flex-wrap items-end gap-6">
          <label className="block max-w-sm text-sm">
            Search Table
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Input Value" className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none placeholder:text-muted-foreground" />
          </label>
          {isUsers && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showSpam} onChange={(e) => setShowSpam(e.target.checked)} />
              Show spam-flagged accounts
            </label>
          )}
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className={`w-full min-w-[700px] text-left ${table === "companies" ? "text-xs" : "text-sm"}`}>
            <thead>
              <tr className="border-b border-border font-medium">
                {cols.map((c) => <th key={c.key} className={`whitespace-nowrap ${table === "companies" ? "px-2 py-1" : "px-3 py-2"}`}>{c.label}</th>)}
                <th className={table === "companies" ? "px-2 py-1" : "px-3 py-2"}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="px-3 py-4" colSpan={cols.length + 1}>Loading…</td></tr>
              ) : rows.map((r) => (
                <tr key={String(r["id"])} className="border-b border-border/60">
                  {cols.map((c) => <td key={c.key} className={`align-top ${table === "companies" ? "px-2 py-1" : "px-3 py-2"}`}>{fmt(r[c.key])}</td>)}
                  <td className={table === "companies" ? "px-2 py-1" : "px-3 py-2"}>
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditing(r)} className="rounded border border-border p-1.5 text-muted-foreground transition hover:text-primary" aria-label="Edit"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => remove(r)} className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/5 hover:text-destructive" aria-label="Delete"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const RESEND_TEMPLATES = [
  "Applicant Indemnity Request",
  "Applicant Confirmed Booking",
  "Mentor Application Complete",
  "HR Application Complete",
];

function ApplicationEditPanel({ table, row, onDone, onCancel }: { table: string; row: Record<string, unknown>; onDone: () => void; onCancel: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const filename = fmt(row["indemnity_file"] ?? row["indemnity"]);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setErr(null);
    const path = `applications/${row["id"]}-${file.name}`;
    const up = await supabase.storage.from("scholar-docs").upload(path, file, { upsert: true });
    if (up.error) { setBusy(false); return setErr(up.error.message); }
    const { error } = await (supabase.from(table as "careers") as any).update({ indemnity_file: path }).eq("id", row["id"]);
    setBusy(false);
    if (error) return setErr(error.message);
    onDone();
  }

  async function download() {
    if (!filename) return;
    const { data, error } = await supabase.storage.from("scholar-docs").download(filename);
    if (error || !data) return setErr(error?.message ?? "File not found.");
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.split("/").pop() ?? filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border bg-background px-6 py-5 text-foreground">
        <h1 className="text-xl font-medium">Edit Application #{String(row["id"])}</h1>
        <button onClick={onCancel} className="text-sm font-medium hover:underline">Back to list</button>
      </div>
      <div className="grid gap-px bg-foreground/10 sm:grid-cols-2">
        <div>
          <div className="border-b border-border bg-background px-6 py-5 text-foreground"><h2 className="text-xl font-medium">Edit Application #{String(row["id"])}</h2></div>
          <div className="bg-background px-6 py-5 text-foreground">
            {filename && <p className="text-sm">{filename}</p>}
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-2 block text-xs" />
            {err && <p className="mt-2 text-sm font-medium">{err}</p>}
            <div className="mt-3 flex gap-2">
              <button onClick={upload} disabled={busy || !file} className="rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-sm font-medium uppercase text-foreground disabled:opacity-50">Update</button>
              <button onClick={download} disabled={!filename} className="rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-sm font-medium uppercase text-foreground disabled:opacity-50">Download File</button>
            </div>
          </div>
        </div>
        <div>
          <div className="border-b border-border bg-background px-6 py-5 text-foreground"><h2 className="text-xl font-medium">Resend Mails</h2></div>
          <div className="bg-background px-6 py-5 text-foreground">
            <div className="flex flex-col gap-2">
              {RESEND_TEMPLATES.map((t, i) => (
                <button key={t} onClick={() => setNotice(`"${t}" is queued to resend (no email service connected in this build).`)} className="rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-foreground">
                  {i + 1}. {t}
                </button>
              ))}
            </div>
            {notice && <p className="mt-3 text-sm">{notice}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const ROLE_TYPES = [
  { label: "Face-to-Face", amount: 350 },
  { label: "Online Interview", amount: 200 },
];

function CanonicalSelect({ table, label, value, onChange }: { table: "careers" | "sectors"; label: string; value: string; onChange: (v: string) => void }) {
  const qc = useQueryClient();
  const options = useQuery({
    queryKey: ["canonical", table],
    queryFn: async () => ((await supabase.from(table).select("name").order("name")).data ?? []).map((r) => r.name as string),
  });
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [busy, setBusy] = useState(false);

  async function addNew() {
    const name = newVal.trim();
    if (!name) return;
    setBusy(true);
    const { data: maxRow } = await supabase.from(table).select("id").order("id", { ascending: false }).limit(1).maybeSingle();
    const nextId = ((maxRow?.id as number | undefined) ?? 0) + 1;
    const { error } = await (supabase.from(table) as any).insert({ id: nextId, name });
    setBusy(false);
    if (error) return notify(error.message, "error");
    qc.invalidateQueries({ queryKey: ["canonical", table] });
    onChange(name);
    setAdding(false);
    setNewVal("");
  }

  if (adding) {
    return (
      <label className="block text-sm">
        {label}
        <div className="mt-1 flex gap-2">
          <input autoFocus value={newVal} onChange={(e) => setNewVal(e.target.value)} className="w-full border-b border-input bg-transparent px-1 py-1 outline-none focus:border-primary" />
          <button type="button" onClick={addNew} disabled={busy || !newVal.trim()} className="shrink-0 rounded-md bg-teal/20 hover:bg-teal/30 px-3 py-1 text-xs font-medium uppercase text-foreground disabled:opacity-50">Add</button>
          <button type="button" onClick={() => { setAdding(false); setNewVal(""); }} className="shrink-0 text-xs underline">Cancel</button>
        </div>
      </label>
    );
  }

  return (
    <label className="block text-sm">
      {label}
      <select
        value={(options.data ?? []).includes(value) ? value : ""}
        onChange={(e) => (e.target.value === "__add__" ? setAdding(true) : onChange(e.target.value))}
        className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 text-foreground outline-none focus:border-primary"
      >
        <option value="" className="text-foreground">Select…</option>
        {options.data?.map((n) => <option key={n} value={n} className="text-foreground">{n}</option>)}
        <option value="__add__" className="text-foreground">+ Add new…</option>
      </select>
    </label>
  );
}

function CreateRole({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [type, setType] = useState(0);
  const [vals, setVals] = useState<Record<string, string>>({ company: "", career: "", sector: "", location: "", amount: String(ROLE_TYPES[0]!.amount) });
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setType_(i: number) {
    setType(i);
    setVals((v) => ({ ...v, amount: String(ROLE_TYPES[i]!.amount) }));
  }

  const fields: { key: string; label: string }[] = [
    { key: "company", label: "Company" }, { key: "location", label: "Location" },
    { key: "mentor_name", label: "Mentor name" }, { key: "mentor_phone", label: "Mentor phone" }, { key: "mentor_email", label: "Mentor email" },
    { key: "hr_contact_name", label: "HR contact name" }, { key: "hr_contact_phone", label: "HR contact phone" }, { key: "hr_contact_email", label: "HR contact email" },
    { key: "backup_mentor_name", label: "Backup mentor name" }, { key: "backup_mentor_phone", label: "Backup mentor phone" }, { key: "backup_mentor_email", label: "Backup mentor email" },
    { key: "dates", label: "Dates" }, { key: "max_applicants", label: "Places" },
  ];

  async function save() {
    if (!vals["company"] || !vals["career"]) { setErr("Company and Career are required."); return; }
    setBusy(true);
    setErr(null);
    const patch: Record<string, unknown> = { ...vals, amount: Number(vals["amount"]) || ROLE_TYPES[type]!.amount, active, mode: ROLE_TYPES[type]!.label };
    if (patch["max_applicants"]) patch["max_applicants"] = Number(patch["max_applicants"]);
    const { error } = await supabase.from("companies").insert(patch as never);
    setBusy(false);
    if (error) return setErr(error.message);
    onDone();
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border bg-background px-6 py-5 text-foreground">
        <h1 className="text-xl font-medium">Add New Role</h1>
        <button onClick={onCancel} className="text-sm font-medium hover:underline">Back to list</button>
      </div>
      <div className="bg-background px-6 py-6 text-foreground">
        <label className="block max-w-sm text-sm">
          Shadow type
          <select value={type} onChange={(e) => setType_(Number(e.target.value))} className="mt-1 block w-full border-b border-input bg-transparent px-1 py-1 text-foreground outline-none">
            {ROLE_TYPES.map((t, i) => <option key={t.label} value={i} className="text-foreground">{t.label} (R{t.amount})</option>)}
          </select>
        </label>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <CanonicalSelect table="sectors" label="Sector" value={vals["sector"] ?? ""} onChange={(v) => setVals({ ...vals, sector: v })} />
          <CanonicalSelect table="careers" label="Career / Role title" value={vals["career"] ?? ""} onChange={(v) => setVals({ ...vals, career: v })} />
          {fields.map((f) => (
            <label key={f.key} className="block text-sm">
              {f.label}
              <input value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none focus:border-primary" />
            </label>
          ))}
          <label className="block text-sm">
            Price (R)
            <input type="number" value={vals["amount"] ?? ""} onChange={(e) => setVals({ ...vals, amount: e.target.value })} className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none focus:border-primary" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active (visible for booking)
          </label>
        </div>
        {err && <p className="mt-4 text-sm font-medium">{err}</p>}
        <button onClick={save} disabled={busy} className="mt-6 rounded-md bg-teal/20 hover:bg-teal/30 px-5 py-2.5 text-sm font-medium uppercase text-foreground">Create</button>
      </div>
    </div>
  );
}

async function downloadDoc(path: string | null) {
  if (!path) return;
  const { data, error } = await supabase.storage.from("scholar-docs").download(path);
  if (error || !data) return notify(error?.message ?? "File not found.", "error");
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = path.split("/").pop() ?? path;
  a.click();
  URL.revokeObjectURL(url);
}

function UserDocument({ path, kind, verified = false }: { path: string | null; kind: "id" | "photo"; verified?: boolean }) {
  const file = useQuery({
    queryKey: ["admin", "document-exists", path], enabled: !!path,
    queryFn: async () => { const { data, error } = await supabase.storage.from("scholar-docs").info(path!); return !error && !!data; },
    staleTime: 60_000,
  });
  const Icon = kind === "id" ? IdCard : ImageIcon;
  return <div className="flex items-center gap-1">
    <span className="relative rounded p-1 text-muted-foreground" title={kind === "id" ? "ID document" : "Photo"}>
      <Icon aria-hidden="true" className="h-4 w-4" /><span className="sr-only">{kind === "id" ? "ID document" : "Photo"}</span>
      {verified && <BadgeCheck aria-label="ID verified" className="absolute -right-1 -top-1 h-3.5 w-3.5 fill-[#E81C45] text-white" />}
    </span>
    {file.data === true && <button onClick={() => downloadDoc(path)} aria-label={kind === "id" ? "Download ID scan" : "Download photo"} title={kind === "id" ? "Download ID scan" : "Download photo"} className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-primary"><Download className="h-4 w-4" /></button>}
  </div>;
}

const ROLE_LABELS: Record<AccountRow["role"], string> = { user: "Student", mentor: "Host", hr_admin: "HR Admin", admin: "Admin" };

function UserFilePreview({ path, label }: { path: string | null; label: string }) {
  const preview = useQuery({
    queryKey: ["admin", "file-preview", path], enabled: !!path, staleTime: 240_000,
    queryFn: async () => {
      const bucket = supabase.storage.from("scholar-docs");
      const info = await bucket.info(path!);
      if (info.error || !info.data) throw new Error("Document unavailable.");
      const signed = await bucket.createSignedUrl(path!, 300);
      if (signed.error) throw new Error(signed.error.message);
      return { url: signed.data.signedUrl, image: info.data.contentType?.startsWith("image/") === true };
    },
  });
  return <section className="space-y-2">
    <h3 className="text-xs font-medium">{label}</h3>
    {!path ? <p className="text-xs text-muted-foreground">No file uploaded.</p> : preview.isPending ? <p className="text-xs text-muted-foreground">Loading document…</p> : preview.error ? <p className="text-xs text-muted-foreground">Document unavailable.</p> : preview.data && <a href={preview.data.url} target="_blank" rel="noopener noreferrer" className="block rounded border border-border bg-muted/30 p-2 text-xs text-primary">{preview.data.image ? <img src={preview.data.url} alt={label} className="max-h-48 w-full object-contain" /> : 'Open ' + label.toLowerCase()}</a>}
  </section>;
}

function UserDetailPanel({ account: a, onClose, onEdit }: { account: AccountRow; onClose: () => void; onEdit: () => void }) {
  const label = a.display_name || a.full_name || a.email || a.id;
  return <aside aria-label="Selected user details" className="w-full shrink-0 border-t border-border bg-background p-5 xl:sticky xl:top-0 xl:max-h-screen xl:w-72 xl:overflow-y-auto xl:border-l xl:border-t-0">
    <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-sans text-sm font-medium">{label}</h2><div className="mt-1 flex flex-wrap gap-1">{a.roles.map((role) => <span key={role} className="rounded bg-teal/15 px-1.5 py-0.5 text-[10px]">{ROLE_LABELS[role]}</span>)}</div></div><button onClick={onClose} aria-label="Close user details" className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button></div>
    <dl className="space-y-2 text-xs">
      {([['Email', a.email], ['Phone', a.contact_no], ['School', a.school], ['ID / passport', a.id_number], ['Joined', new Date(a.created_at).toLocaleDateString()]] as const).map(([title, value]) => <div key={title}><dt className="text-muted-foreground">{title}</dt><dd className="break-words">{value || '—'}</dd></div>)}
    </dl>
    <div className="my-4 flex items-center justify-between"><span className="text-xs text-muted-foreground">{a.id_verified ? 'ID verified' : 'ID not verified'}</span><button onClick={onEdit} className="flex items-center gap-1 text-xs text-primary"><Pencil className="h-3 w-3" />Edit user</button></div>
    <div className="space-y-4 border-t border-border py-4"><UserFilePreview path={a.id_file_path} label="Uploaded ID" /><UserFilePreview path={a.photo_path} label="Uploaded photo" /></div>
    <section className="border-t border-border pt-4"><h3 className="mb-3 text-xs font-medium">Application history ({a.applications.length})</h3><div className="space-y-3">{a.applications.length ? a.applications.map((application) => <article key={application.source + application.id} className="border-b border-border/60 pb-3 text-xs"><p className="font-medium">{application.career || 'Career not recorded'}</p><p className="text-muted-foreground">{application.company || 'Company not recorded'} · {application.dates || 'Dates not recorded'}</p><p className="mt-1 text-[10px]">{application.source} #{application.id}</p><p className="mt-1 text-[10px] text-muted-foreground">Paid: {application.paid === null ? 'Not recorded' : application.paid ? 'Yes' : 'No'} · Indemnity: {application.indemnity === null ? 'Not recorded' : application.indemnity ? 'Yes' : 'No'} · Cancelled: {application.cancelled === null ? 'Not recorded' : application.cancelled ? 'Yes' : 'No'}</p></article>) : <p className="text-xs text-muted-foreground">No applications recorded.</p>}</div></section>
  </aside>;
}

function UserCards({ rows, selectedId, busyId, onSelect, onEdit, onDelete, onVerify }: {
  rows: AccountRow[]; selectedId: string | null; busyId: string | null;
  onSelect: (id: string) => void; onEdit: (account: AccountRow) => void;
  onDelete: (id: string, label: string) => void; onVerify: (id: string, verified: boolean) => void;
}) {
  return <div className="grid gap-3 border-t border-border bg-muted/20 p-3 sm:grid-cols-2 2xl:grid-cols-3">{rows.map((a) => {
    const label = a.display_name || a.full_name || a.email || a.id;
    return <article key={a.id} className={'min-w-0 rounded-md border bg-background p-4 ' + (selectedId === a.id ? 'border-primary/40' : 'border-border')}>
      <button className="max-w-full truncate text-left text-sm font-medium hover:text-primary" onClick={() => onSelect(a.id)}>{label}</button>
      <div className="my-2 flex flex-wrap gap-1">{a.roles.map((role) => <span key={role} className="rounded bg-teal/15 px-1.5 py-0.5 text-[10px]">{ROLE_LABELS[role]}</span>)}{a.is_spam && <span className="text-[10px] text-destructive">Spam</span>}</div>
      <div className="space-y-1 text-xs text-muted-foreground"><p className="truncate" title={a.email ?? undefined}>{a.email || 'No email'}</p><p>{a.contact_no || 'No phone'}</p><p className="truncate" title={a.school ?? undefined}>{a.school || 'No school'}</p><p>ID / passport: {a.id_number || '—'}</p><p>Joined {new Date(a.created_at).toLocaleDateString()}</p></div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <label title="ID verified"><input type="checkbox" className="accent-teal" checked={a.id_verified === true} disabled={a.id_verified === null || busyId === a.id} onChange={(e) => onVerify(a.id, e.target.checked)} aria-label={'ID verified for ' + label} /></label>
        <UserDocument path={a.id_file_path} kind="id" verified={a.id_verified === true} /><UserDocument path={a.photo_path} kind="photo" />
        <button onClick={() => onEdit(a)} disabled={busyId === a.id} className="ml-auto flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"><Pencil className="h-3 w-3" />Edit</button>
        <button onClick={() => onDelete(a.id, label)} disabled={busyId === a.id} aria-label={'Delete account for ' + label} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <button onClick={() => onSelect(a.id)} className="mt-3 text-xs text-primary">View details · {a.applications.length} applications</button>
    </article>;
  })}</div>;
}

export function AdminUsers() {
  const qc = useQueryClient();
  const getAccountsFn = useServerFn(getAccounts);
  const updateRoleFn = useServerFn(updateAccount);
  const removeAccountFn = useServerFn(removeAccount);
  const accounts = useQuery({ queryKey: ["admin", "accounts"], queryFn: () => getAccountsFn() });
  const [q, setQ] = useState("");
  const [view, setView] = useState<"table" | "cards">("table");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedAccount = accounts.data?.find((account) => account.id === selectedId);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [expandedApplicationUser, setExpandedApplicationUser] = useState<string | null>(null);
  const [showSpam, setShowSpam] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [letter, setLetter] = useState<string | null>(null);

  async function setIdVerified(userId: string, verified: boolean) {
    setBusyId(userId);
    try {
      const { error } = await supabase.from("scholar_profiles").update({
        id_verified: verified,
        id_verified_at: verified ? new Date().toISOString() : null,
      }).eq("user_id", userId);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["admin", "accounts"] });
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function saveAccount() {
    if (!editing) return;
    setBusyId(editing.id);
    try {
      await updateRoleFn({ data: { userId: editing.id, display_name: editing.display_name ?? "", full_name: editing.full_name ?? "", contact_no: editing.contact_no ?? "", school: editing.school ?? "", id_number: editing.id_number ?? "", roles: editing.roles } });
      await qc.invalidateQueries({ queryKey: ["admin", "accounts"] });
      setEditing(null);
    } catch (e) { notify((e as Error).message, "error"); }
    finally { setBusyId(null); }
  }

  async function deleteAccountRow(userId: string, label: string) {
    if (!(await confirmAction(`Permanently delete the account for ${label}? This removes their login and all linked data. This cannot be undone.`, { danger: true, confirmLabel: "Delete" }))) return;
    setBusyId(userId);
    try {
      await removeAccountFn({ data: { userId } });
      qc.invalidateQueries({ queryKey: ["admin", "accounts"] });
    } catch (e) {
      notify((e as Error).message, "error");
    }
    setBusyId(null);
  }

  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (accounts.data ?? [])
      .filter((a) => {
        if (!showSpam && a.is_spam) return false;
        if (s && ![a.email, a.display_name, a.full_name, a.contact_no, a.school, a.id_number, ...a.roles.map((role) => ROLE_LABELS[role]), ...a.applications.flatMap((application) => [application.company, application.career, application.dates])].some((v) => (v ?? "").toLowerCase().includes(s))) return false;
        if (letter && accountInitial(a) !== letter) return false;
        return true;
      })
      .sort((a, b) => (a.display_name || a.full_name || a.email || "").localeCompare(b.display_name || b.full_name || b.email || ""));
  }, [accounts.data, q, showSpam, letter]);

  const letterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (accounts.data ?? []).forEach((a) => {
      if (!showSpam && a.is_spam) return;
      const first = accountInitial(a);
      if (first) counts.set(first, (counts.get(first) ?? 0) + 1);
    });
    return counts;
  }, [accounts.data, showSpam]);

  return (
    <div>
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open && busyId !== editing?.id) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Edit user</DialogTitle></DialogHeader>
          {editing && <form onSubmit={(e) => { e.preventDefault(); saveAccount(); }} className="space-y-3">
            <p className="text-sm text-muted-foreground">{editing.email}</p>
            {([['display_name', 'Display name'], ['full_name', 'Full name'], ['contact_no', 'Phone'], ['school', 'School'], ['id_number', 'ID / passport number']] as const).map(([field, label]) => <label key={field} className="block text-sm">{label}<input disabled={busyId === editing.id || (field !== 'display_name' && !editing.has_scholar_profile)} value={editing[field] ?? ''} onChange={(e) => setEditing({ ...editing, [field]: e.target.value })} className="mt-1 w-full rounded border border-input bg-background px-3 py-2 disabled:opacity-50" /></label>)}
            {!editing.has_scholar_profile && <p className="text-xs text-muted-foreground">Scholar details can be edited once this user has a scholar profile. Imported details remain on the original application.</p>}
            <details className="rounded border border-input p-3"><summary className="cursor-pointer text-sm">User types: {editing.roles.map((role) => ROLE_LABELS[role]).join(', ') || 'Select roles'}</summary><div className="mt-2 space-y-2">{(Object.keys(ROLE_LABELS) as AccountRow['role'][]).map((role) => <label key={role} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={busyId === editing.id} checked={editing.roles.includes(role)} onChange={(e) => setEditing({ ...editing, roles: e.target.checked ? [...editing.roles, role] : editing.roles.filter((item) => item !== role) })} />{ROLE_LABELS[role]}</label>)}</div></details>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" disabled={busyId === editing.id} onClick={() => setEditing(null)}>Cancel</Button><Button disabled={busyId === editing.id || editing.roles.length === 0}>{busyId === editing.id ? 'Saving…' : 'Save changes'}</Button></div>
          </form>}
        </DialogContent>
      </Dialog>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-primary px-6 py-4 text-primary-foreground">
        <h1 className="font-sans text-lg font-medium">Users {!accounts.isLoading && `(${rows.length})`}</h1>
        <div role="group" aria-label="Users view" className="flex rounded border border-primary-foreground/30 p-0.5">
          {([['table', List, 'Table'], ['cards', LayoutGrid, 'Cards']] as const).map(([value, Icon, label]) => <button key={value} onClick={() => setView(value)} aria-pressed={view === value} className={'flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition ' + (view === value ? 'bg-background text-primary' : 'hover:bg-primary-foreground/10')}><Icon className="h-3.5 w-3.5" />{label}</button>)}
        </div>
      </div>
      <div className="flex flex-col items-start xl:flex-row">
      <div className={'min-w-0 w-full flex-1 px-4 py-4 text-foreground ' + (view === 'table' ? 'bg-[#7CCCC8]' : 'bg-muted/30')}>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button" aria-pressed={letter === null} onClick={() => { setLetter(null); setOpenGroups([]); }}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium uppercase transition ${letter === null ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground hover:bg-teal/20"}`}
          >
            All
          </button>
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((ch) => {
            const count = letterCounts.get(ch) ?? 0;
            return (
              <button
                key={ch}
                type="button" aria-pressed={letter === ch} onClick={() => { setLetter(ch); setOpenGroups([ch]); }}
                disabled={count === 0}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium uppercase transition ${letter === ch ? "bg-primary text-primary-foreground" : count === 0 ? "bg-muted/30 text-muted-foreground/50" : "bg-muted/70 text-foreground hover:bg-teal/20"}`}
              >
                {ch}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-6">
          <label className="block max-w-sm text-sm">
            Search
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, school, company or career" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showSpam} onChange={(e) => setShowSpam(e.target.checked)} />
            Show spam-flagged accounts
          </label>
        </div>
        {accounts.isLoading ? (
          <p className="mt-6">Loading…</p>
        ) : accounts.error ? (
          <p className="mt-6 text-destructive">{(accounts.error as Error).message}</p>
        ) : (
          <Accordion type="multiple" value={openGroups} onValueChange={setOpenGroups} className="mt-5 space-y-2">
            {[...new Set(rows.map((a) => accountInitial(a)))].sort((a, b) => a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)).map((group) => (
              <AccordionItem key={group} value={group} className={"group overflow-hidden rounded-md border border-foreground/15 " + (view === "table" ? "bg-[#7CCCC8]" : "bg-background")}>
                <AccordionTrigger className="justify-start gap-3 px-4 py-2.5 text-sm hover:no-underline [&>svg]:ml-auto"><span className="w-5 font-medium text-primary">{group}</span><span className="text-xs text-muted-foreground">{rows.filter((a) => (accountInitial(a)) === group).length} users</span></AccordionTrigger>
                <AccordionContent className="pb-0">{view === "cards" ? <UserCards rows={rows.filter((a) => (accountInitial(a)) === group)} selectedId={selectedId} busyId={busyId} onSelect={setSelectedId} onEdit={(a) => setEditing({ ...a, roles: [...a.roles] })} onDelete={deleteAccountRow} onVerify={setIdVerified} /> : <div className="overflow-x-auto border-t border-border">
                  <table className="w-full min-w-[1120px] text-left text-xs">
                    <thead className="bg-background/40 text-foreground"><tr>{["Name", "User type", "Email", "Phone", "School", "ID / passport", "Documents", "Applications", "Actions"].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-2 font-normal">{heading}</th>)}</tr></thead>
                    <tbody>
                    {rows.filter((a) => (accountInitial(a)) === group).map((a) => {
                      const avatarUrl = a.avatar_path ? supabase.storage.from("avatars").getPublicUrl(a.avatar_path).data.publicUrl : null;
                      const label = a.display_name || a.full_name || a.email || a.id;
                      return <Fragment key={a.id}>
                        <tr className={'border-t border-border/60 transition-colors hover:bg-teal/5 ' + (selectedId === a.id ? 'bg-teal/10' : '')}>
                          <td className="px-3 py-2.5"><div className="flex items-center gap-2" title={'Joined ' + new Date(a.created_at).toLocaleDateString()}>
                            {avatarUrl ? <img src={avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" /> : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal/15 text-[11px] uppercase">{label.slice(0, 1)}</span>}
                            <button onClick={() => setSelectedId(a.id)} className="max-w-40 truncate text-left font-medium hover:text-primary" title={label} aria-label={'View details for ' + label}>{label}</button>
                            {a.is_spam && <span className="text-[10px] text-destructive">Spam</span>}
                          </div></td>
                          <td className="px-3 py-2.5"><div className="flex gap-1">{a.roles.map((role) => <span key={role} className="whitespace-nowrap rounded bg-muted px-1.5 py-1 text-[10px] text-foreground">{ROLE_LABELS[role]}</span>)}</div></td>
                          <td className="px-3 py-2.5"><span className="block max-w-44 truncate" title={a.email ?? undefined}>{a.email || '—'}</span></td>
                          <td className="whitespace-nowrap px-3 py-2.5">{a.contact_no || '—'}</td>
                          <td className="px-3 py-2.5"><span className="block max-w-32 truncate" title={a.school ?? undefined}>{a.school || '—'}</span></td>
                          <td className="whitespace-nowrap px-3 py-2.5">{a.id_number || '—'}</td>
                          <td className="px-3 py-2.5"><div className="flex items-center gap-2">
                            <label className="flex items-center" title={a.id_verified === null ? 'No scholar profile to verify' : 'ID verified'}><input type="checkbox" className="accent-primary" checked={a.id_verified === true} disabled={a.id_verified === null || busyId === a.id} onChange={(e) => setIdVerified(a.id, e.target.checked)} aria-label={'ID verified for ' + label} /></label>
                            <UserDocument path={a.id_file_path} kind="id" verified={a.id_verified === true} />
                            <UserDocument path={a.photo_path} kind="photo" />
                          </div></td>
                          <td className="px-3 py-2.5"><button disabled={!a.applications.length} aria-expanded={expandedApplicationUser === a.id} aria-controls={'applications-' + a.id} onClick={() => setExpandedApplicationUser(expandedApplicationUser === a.id ? null : a.id)} className="flex items-center gap-2 whitespace-nowrap rounded px-1.5 py-1 text-xs hover:bg-muted disabled:text-muted-foreground" title={a.booking_count + ' bookings'}>{a.applications.length}<ChevronDown className={'h-3 w-3 transition ' + (expandedApplicationUser === a.id ? 'rotate-180' : '')} /><span className="sr-only">Applications for {label}</span></button></td>
                          <td className="px-3 py-2.5"><div className="flex items-center gap-1.5">
                            <button onClick={() => setEditing({ ...a, roles: [...a.roles] })} disabled={busyId === a.id} className="flex items-center gap-1.5 rounded border border-border px-2 py-1.5 text-xs transition hover:border-primary/30 hover:text-primary disabled:opacity-50" aria-label={'Edit ' + label}><Pencil className="h-3.5 w-3.5" />Edit</button>
                            <button onClick={() => deleteAccountRow(a.id, label)} disabled={busyId === a.id} className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/5 hover:text-destructive disabled:opacity-50" aria-label={'Delete account for ' + label}><Trash2 className="h-3.5 w-3.5" /></button>
                          </div></td>
                        </tr>
                        {expandedApplicationUser === a.id && <tr id={'applications-' + a.id}><td colSpan={9} className="border-t border-border bg-muted/30 px-5 py-3">
                          <div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Applications for {label}</span><span>{a.booking_count} bookings · Joined {new Date(a.created_at).toLocaleDateString()}</span></div>
                          <table className="w-full text-left text-xs"><thead><tr>{["ID", "Company", "Career", "Dates", "Paid", "Indemnity", "Cancelled"].map((heading) => <th key={heading} className="px-2 py-2 font-medium">{heading}</th>)}</tr></thead><tbody>{a.applications.map((application) => <tr key={application.source + '-' + application.id} className="border-t border-border/70"><td className="px-2 py-2">{application.source} #{application.id}</td><td className="px-2 py-2">{application.company || '—'}</td><td className="px-2 py-2">{application.career || '—'}</td><td className="px-2 py-2">{application.dates || '—'}</td>{[application.paid, application.indemnity, application.cancelled].map((value, index) => <td key={index} className="px-2 py-2">{value === null ? 'Not recorded' : value ? 'Yes' : 'No'}</td>)}</tr>)}</tbody></table>
                        </td></tr>}
                      </Fragment>;
                    })}
                    </tbody>
                  </table>
                </div>}</AccordionContent>
              </AccordionItem>
            ))}
            {rows.length === 0 && <p className="py-6 text-sm text-muted-foreground">No users match "{q}".</p>}
          </Accordion>
        )}
      </div>
      {selectedAccount && <UserDetailPanel account={selectedAccount} onClose={() => setSelectedId(null)} onEdit={() => setEditing({ ...selectedAccount, roles: [...selectedAccount.roles] })} />}
      </div>
    </div>
  );
}

type EmailRow = { id: string; recipient: string | null; subject: string; body: string; template: string; status: string; created_at: string };

function EmailArchive() {
  const [q, setQ] = useState("");
  const emails = useQuery({
    queryKey: ["admin", "email_outbox"],
    queryFn: async () => ((await supabase.from("email_outbox").select("*").order("created_at", { ascending: false }).limit(500)).data ?? []) as EmailRow[],
  });
  const qc = useQueryClient();
  const send = useServerFn(sendQueuedEmails);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  async function flush(retryFailed: boolean) {
    setSending(true); setSendMsg(null);
    try {
      const r = await send({ data: { retryFailed } });
      const failed = r.results.filter((x) => !x.ok);
      setSendMsg(`Sent ${r.sent} of ${r.processed}.` + (failed.length ? ` First error: ${failed[0]?.error}` : ""));
    } catch (e) { setSendMsg((e as Error).message); }
    setSending(false);
    qc.invalidateQueries({ queryKey: ["admin", "email_outbox"] });
  }
  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (emails.data ?? []).filter((e) => !s || [e.recipient, e.subject, e.template, e.status].some((v) => (v ?? "").toLowerCase().includes(s)));
  }, [emails.data, q]);

  return (
    <div>
      <div className="border-b border-border bg-background px-6 py-6 text-foreground"><h1 className="text-2xl font-medium">Email Archive {!emails.isLoading && `(${rows.length})`}</h1></div>
      <div className="bg-background px-6 py-6 text-foreground">
        <label className="block max-w-sm text-sm">
          Search
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Recipient, subject, template or status" className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none" />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => flush(false)} disabled={sending} className="rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-foreground disabled:opacity-50">Send queued emails now</button>
          <button onClick={() => flush(true)} disabled={sending} className="bg-primary px-4 py-2 text-xs font-medium uppercase tracking-wide text-primary-foreground disabled:opacity-50">Retry failed emails</button>
        </div>
        {sendMsg && <p className="mt-2 text-sm break-words">{sendMsg}</p>}
        <div className="mt-6 space-y-2">
          {emails.isLoading ? (
            <p>Loading…</p>
          ) : rows.length === 0 ? (
            <p>No emails found.</p>
          ) : (
            rows.map((e) => (
              <details key={e.id} className="rounded-lg border border-border bg-background/10 p-3 text-sm">
                <summary className="cursor-pointer">
                  <strong>{e.subject}</strong> → {e.recipient || "(no address on file)"} · {e.template} · {e.status} · {new Date(e.created_at).toLocaleString()}
                </summary>
                <iframe title={`Preview: ${e.subject}`} srcDoc={renderEmailHtml(e)} className="mt-3 h-[560px] w-full rounded bg-background" />
              </details>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function BookingSettings() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["admin", "booking_settings"],
    queryFn: async () => (await supabase.from("booking_settings").select("*").eq("id", 1).single()).data,
  });
  const [minLead, setMinLead] = useState("3");
  const [blackout, setBlackout] = useState("");
  const [noAvailMsg, setNoAvailMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    setMinLead(String(settings.data.min_lead_days));
    setBlackout((settings.data.blackout_dates ?? []).join(", "));
    setNoAvailMsg(settings.data.no_availability_message ?? "");
  }, [settings.data]);

  async function save() {
    setBusy(true);
    setErr(null);
    setSaved(false);
    const dates = blackout.split(",").map((d) => d.trim()).filter(Boolean);
    const { error } = await supabase.from("booking_settings").update({ min_lead_days: Number(minLead) || 0, blackout_dates: dates, no_availability_message: noAvailMsg }).eq("id", 1);
    setBusy(false);
    if (error) return setErr(error.message);
    setSaved(true);
    qc.invalidateQueries({ queryKey: ["admin", "booking_settings"] });
    qc.invalidateQueries({ queryKey: ["booking-settings"] });
  }

  return (
    <div>
      <div className="border-b border-border bg-background px-6 py-6 text-foreground"><h1 className="text-2xl font-medium">Booking Settings</h1></div>
      <div className="max-w-xl space-y-5 bg-background px-6 py-6 text-foreground">
        <label className="block text-sm">
          Minimum lead time (days before a shadow date a booking is allowed)
          <input type="number" value={minLead} onChange={(e) => setMinLead(e.target.value)} className="mt-1 w-full max-w-xs border-b border-input bg-transparent px-1 py-1 outline-none" />
        </label>
        <label className="block text-sm">
          Blackout dates (comma separated, MM/DD/YYYY - no bookings allowed on these dates)
          <textarea value={blackout} onChange={(e) => setBlackout(e.target.value)} placeholder="12/15/2026, 12/16/2026" className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none" />
        </label>
        <label className="block text-sm">
          "No mentors available" message (shown on /roles and the booking wizard whenever nothing is bookable)
          <textarea value={noAvailMsg} onChange={(e) => setNoAvailMsg(e.target.value)} className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none" />
        </label>
        {err && <p className="text-sm font-medium">{err}</p>}
        <button onClick={save} disabled={busy || settings.isLoading} className="rounded-md bg-teal/20 hover:bg-teal/30 px-5 py-2.5 text-sm font-medium uppercase text-foreground disabled:opacity-50">{saved ? "Saved" : "Save"}</button>
      </div>
    </div>
  );
}

function LogoUpload({ companyId, value, onChange }: { companyId: unknown; value: string; onChange: (path: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const previewUrl = value ? supabase.storage.from("partner-logos").getPublicUrl(value).data.publicUrl : null;

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    const path = `${companyId}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("partner-logos").upload(path, file, { upsert: true });
    setBusy(false);
    if (error) return setErr(error.message);
    onChange(path);
  }

  return (
    <label className="block text-sm">
      Logo
      <div className="mt-1 flex items-center gap-3">
        {previewUrl && <img src={previewUrl} alt="Logo preview" className="h-10 w-10 rounded bg-white object-contain" />}
        <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} disabled={busy} className="text-xs" />
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </label>
  );
}

function EditRecord({ title, table, cols, row, onDone, onCancel }: { title: string; table: string; cols: Col[]; row: Record<string, unknown>; onDone: () => void; onCancel: () => void }) {
  const [vals, setVals] = useState<Record<string, unknown>>(row);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const editable = cols.filter((c) => c.key !== "id" && !c.key.startsWith("_"));

  async function save() {
    setBusy(true);
    setErr(null);
    const { id: _id, ...patch } = vals;
    const { error } = await (supabase.from(table as "careers") as any).update(patch).eq("id", row["id"]);
    setBusy(false);
    if (error) return setErr(error.message);
    onDone();
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border bg-background px-6 py-5 text-foreground">
        <h1 className="text-xl font-medium">Edit {title.replace(/s$/, "")} #{String(row["id"])}</h1>
        <button onClick={onCancel} className="text-sm font-medium hover:underline">Back to list</button>
      </div>
      <div className="bg-background px-6 py-6 text-foreground">
        <div className="grid gap-5 sm:grid-cols-3">
          {editable.map((c) =>
            table === "companies" && (c.key === "career" || c.key === "sector") ? (
              <CanonicalSelect
                key={c.key}
                table={c.key === "career" ? "careers" : "sectors"}
                label={c.label}
                value={(vals[c.key] as string) ?? ""}
                onChange={(v) => setVals({ ...vals, [c.key]: v })}
              />
            ) : table === "companies" && c.key === "logo_path" ? (
              <LogoUpload key={c.key} companyId={row["id"]} value={(vals[c.key] as string) ?? ""} onChange={(v) => setVals({ ...vals, logo_path: v })} />
            ) : table === "companies" && c.key === "mode" ? (
              <label key={c.key} className="block text-sm">
                {c.label}
                <select value={(vals["mode"] as string) ?? ""} onChange={(e) => setVals({ ...vals, mode: e.target.value })} className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none focus:border-primary [&>option]:text-foreground">
                  <option value="">—</option>
                  <option value="Face-to-Face">Face-to-Face</option>
                  <option value="Online Interview">Online Interview</option>
                </select>
              </label>
            ) : (
              <label key={c.key} className="block text-sm">
                {c.label}
                {c.field === "checkbox" ? (
                  <div className="mt-2">
                    <input type="checkbox" checked={!!vals[c.key]} onChange={(e) => setVals({ ...vals, [c.key]: e.target.checked })} />
                  </div>
                ) : (
                  <input
                    type={c.field === "number" ? "number" : c.field === "date" ? "date" : "text"}
                    value={(vals[c.key] as string) ?? ""}
                    onChange={(e) => setVals({ ...vals, [c.key]: e.target.value })}
                    className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none focus:border-primary"
                  />
                )}
              </label>
            )
          )}
        </div>
        {err && <p className="mt-4 text-sm font-medium">{err}</p>}
        <button onClick={save} disabled={busy} className="mt-6 rounded-md bg-teal/20 hover:bg-teal/30 px-5 py-2.5 text-sm font-medium uppercase text-foreground">Update</button>
      </div>
    </div>
  );
}
