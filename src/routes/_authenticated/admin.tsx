import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Users as UsersIcon, FileText, ShoppingCart, Briefcase, GraduationCap, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png.asset.json";
import { Button } from "@/components/ui/button";
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
  { id: "scholars", label: "Scholars", icon: GraduationCap, table: "scholar_profiles", singular: "Scholars", custom: true, cols: [] },
  { id: "emails", label: "Email Archive", icon: FileText, table: "email_outbox", singular: "Emails", custom: true, cols: [] },
  { id: "settings", label: "Booking Settings", icon: FileText, table: "booking_settings", singular: "Settings", custom: true, cols: [] },
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
    { key: "active", label: "Active", field: "checkbox" } ] },
  { id: "vouchers", label: "Vouchers", icon: ShoppingCart, table: "vouchers", singular: "Vouchers", cols: [
    { key: "id", label: "#" }, { key: "name", label: "Name" }, { key: "code", label: "Code" },
    { key: "discount", label: "Discount", field: "number" }, { key: "available_from", label: "From", field: "date" },
    { key: "available_until", label: "Until", field: "date" }, { key: "usage_limit", label: "Limit", field: "number" } ] },
  { id: "sectors", label: "Sectors", icon: FileText, table: "sectors", singular: "Sectors", cols: [{ key: "id", label: "#" }, { key: "name", label: "Sector Name" }] },
  { id: "careers", label: "Careers", icon: Briefcase, table: "careers", singular: "Careers", cols: [{ key: "id", label: "#" }, { key: "name", label: "Career Name" }] },
  { id: "users", label: "Users", icon: GraduationCap, table: "legacy_users", singular: "Users", cols: [
    { key: "id", label: "Id" }, { key: "name", label: "Name" }, { key: "email", label: "Email" }, { key: "has_profile", label: "Profile" } ] },
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
    <div className="flex min-h-screen bg-background">
      <aside className="w-60 shrink-0 bg-foreground text-background">
        <div className="px-5 py-6">
          <img src={logo.url} alt="Job Shadow" width={358} height={195} className="h-10 w-auto" />
        </div>
        <nav className="space-y-1 px-3">
          {TABLES.map((t) => (
            <button key={t.id} onClick={() => setActive(t.id)} className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm font-medium transition ${active === t.id ? "bg-background/10" : "hover:bg-background/5"}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-end bg-foreground px-6 py-4 text-background">
          <button onClick={() => supabase.auth.signOut().then(() => (window.location.href = "/"))} className="text-sm font-semibold hover:underline">Logout</button>
        </header>
        <main className="p-0">
          {admin.isLoading ? (
            <p className="p-8">Loading…</p>
          ) : !admin.data ? (
            <p className="p-8">Your account doesn't have admin access. Ask JobShadow to grant it.</p>
          ) : section.id === "scholars" ? (
            <ScholarVerification key={section.id} />
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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [company, setCompany] = useState("All companies");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showSpam, setShowSpam] = useState(false);
  const isUsers = table === "legacy_users";
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
      exportCsv(title, completeExportColumns(cols, all), all);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Unable to export records. Please try again.");
    } finally {
      setExporting(false);
    }
  }
  const { data, isLoading } = useQuery({
    queryKey: ["admin", table, showSpam],
    queryFn: async () => {
      let query = supabase.from(table as "careers").select("*").order("id", { ascending: false });
      if (table === "legacy_users" && !showSpam) query = (query as any).eq("is_spam", false);
      const rows: Record<string, unknown>[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await query.range(from, from + 999);
        if (error) throw error;
        rows.push(...(data as Record<string, unknown>[]));
        if (!data || data.length < 1000) break;
      }
      return rows;
    },
  });
  const companies = useMemo(() => ["All companies", ...new Set((data ?? []).map((r) => fmt(r["company"])).filter(Boolean))], [data]);
  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (data ?? []).filter((r) => {
      if (s && !cols.some((c) => fmt(r[c.key]).toLowerCase().includes(s))) return false;
      if (dateCompanyFilter) {
        if (company !== "All companies" && fmt(r["company"]) !== company) return false;
        const d = fmt(r["dates"]);
        if (from && d && d < from) return false;
        if (to && d && d > to) return false;
      }
      return true;
    });
  }, [data, q, cols, dateCompanyFilter, company, from, to]);

  async function remove(row: Record<string, unknown>) {
    if (!window.confirm("Delete this record?")) return;
    const { error } = await (supabase.from(table as "careers") as any).delete().eq("id", row["id"]);
    if (error) return window.alert(error.message);
    qc.invalidateQueries({ queryKey: ["admin", table] });
  }

  async function uploadCsv(file: File) {
    const text = await file.text();
    const [headerLine, ...lines] = text.trim().split(/\r?\n/);
    const headers = (headerLine ?? "").split(",").map((h) => h.trim());
    const records = lines.filter(Boolean).map((line) => {
      const vals = line.split(",").map((v) => v.trim());
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? null]));
    });
    if (records.length === 0) return;
    const { error } = await (supabase.from(table as "careers") as any).upsert(records);
    if (error) return window.alert(error.message);
    qc.invalidateQueries({ queryKey: ["admin", table] });
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
      {csvUpload && (
        <div className="grid border-b border-foreground/10 sm:grid-cols-2">
          <div>
            <div className="bg-foreground px-6 py-5 text-background"><h2 className="text-xl font-semibold">Upload New Jobs</h2></div>
            <div className="bg-teal/90 px-6 py-5 text-primary-foreground">
              <input type="file" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCsv(f); }} className="block text-xs" />
              <button className="mt-3 bg-cta px-4 py-2 text-sm font-bold uppercase text-cta-foreground">Upload File</button>
            </div>
          </div>
          <div>
            <div className="bg-foreground px-6 py-5 text-background"><h2 className="text-xl font-semibold">Update Jobs</h2></div>
            <div className="bg-teal/90 px-6 py-5 text-primary-foreground">
              <input type="file" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadCsv(f); }} className="block text-xs" />
              <button className="mt-3 bg-cta px-4 py-2 text-sm font-bold uppercase text-cta-foreground">Upload File</button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-foreground px-6 py-6 text-background">
        <h1 className="text-2xl font-semibold">{title} {!isLoading && `(${rows.length})`}</h1>
        {dateCompanyFilter && (
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-sm">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block border-b border-background/50 bg-transparent px-1 py-1 outline-none" /></label>
            <label className="text-sm">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block border-b border-background/50 bg-transparent px-1 py-1 outline-none" /></label>
            <label className="text-sm">Select company
              <select value={company} onChange={(e) => setCompany(e.target.value)} className="block border-b border-background/50 bg-transparent px-1 py-1 outline-none">
                {companies.map((c) => <option key={c} value={c} className="text-foreground">{c}</option>)}
              </select>
            </label>
          </div>
        )}
        <div className="flex items-center gap-3">
          {table === "companies" && (
            <Button onClick={() => setCreating(true)} className="bg-cta px-4 py-2 text-sm font-bold uppercase text-cta-foreground">Add New Role</Button>
          )}
          <Button onClick={exportAll} disabled={isLoading || exporting} className="bg-cta px-4 py-2 text-sm font-bold uppercase text-cta-foreground">{exporting ? "Exporting…" : "Export"}</Button>
        </div>
      </div>
      <div className="bg-teal/90 px-6 py-6 text-primary-foreground">
        {exportError && <p role="alert" className="mb-4 text-sm font-semibold">{exportError}</p>}
        <div className="flex flex-wrap items-end gap-6">
          <label className="block max-w-sm text-sm">
            Search Table
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Input Value" className="mt-1 w-full border-b border-primary-foreground/50 bg-transparent px-1 py-1 outline-none placeholder:text-primary-foreground/60" />
          </label>
          {isUsers && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showSpam} onChange={(e) => setShowSpam(e.target.checked)} />
              Show spam-flagged accounts
            </label>
          )}
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-primary-foreground/30 font-semibold">
                {cols.map((c) => <th key={c.key} className="whitespace-nowrap px-3 py-2">{c.label}</th>)}
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td className="px-3 py-4" colSpan={cols.length + 1}>Loading…</td></tr>
              ) : rows.map((r) => (
                <tr key={String(r["id"])} className="border-b border-primary-foreground/10">
                  {cols.map((c) => <td key={c.key} className="px-3 py-2 align-top">{fmt(r[c.key])}</td>)}
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(r)} className="rounded bg-sky-500 p-1.5 text-white" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => remove(r)} className="rounded bg-destructive p-1.5 text-white" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
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
      <div className="flex items-center justify-between bg-foreground px-6 py-5 text-background">
        <h1 className="text-xl font-semibold">Edit Application #{String(row["id"])}</h1>
        <button onClick={onCancel} className="text-sm font-semibold hover:underline">Back to list</button>
      </div>
      <div className="grid gap-px bg-foreground/10 sm:grid-cols-2">
        <div>
          <div className="bg-foreground px-6 py-5 text-background"><h2 className="text-xl font-semibold">Edit Application #{String(row["id"])}</h2></div>
          <div className="bg-teal/90 px-6 py-5 text-primary-foreground">
            {filename && <p className="text-sm">{filename}</p>}
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-2 block text-xs" />
            {err && <p className="mt-2 text-sm font-semibold">{err}</p>}
            <div className="mt-3 flex gap-2">
              <button onClick={upload} disabled={busy || !file} className="bg-cta px-4 py-2 text-sm font-bold uppercase text-cta-foreground disabled:opacity-50">Update</button>
              <button onClick={download} disabled={!filename} className="bg-cta px-4 py-2 text-sm font-bold uppercase text-cta-foreground disabled:opacity-50">Download File</button>
            </div>
          </div>
        </div>
        <div>
          <div className="bg-foreground px-6 py-5 text-background"><h2 className="text-xl font-semibold">Resend Mails</h2></div>
          <div className="bg-teal/90 px-6 py-5 text-primary-foreground">
            <div className="flex flex-col gap-2">
              {RESEND_TEMPLATES.map((t, i) => (
                <button key={t} onClick={() => setNotice(`"${t}" is queued to resend (no email service connected in this build).`)} className="bg-cta px-4 py-2 text-left text-xs font-bold uppercase tracking-wide text-cta-foreground">
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
    if (error) return window.alert(error.message);
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
          <input autoFocus value={newVal} onChange={(e) => setNewVal(e.target.value)} className="w-full border-b border-primary-foreground/50 bg-transparent px-1 py-1 outline-none focus:border-primary-foreground" />
          <button type="button" onClick={addNew} disabled={busy || !newVal.trim()} className="shrink-0 bg-cta px-3 py-1 text-xs font-bold uppercase text-cta-foreground disabled:opacity-50">Add</button>
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
        className="mt-1 w-full border-b border-primary-foreground/50 bg-transparent px-1 py-1 text-primary-foreground outline-none focus:border-primary-foreground"
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
    const patch: Record<string, unknown> = { ...vals, amount: Number(vals["amount"]) || ROLE_TYPES[type]!.amount, active };
    if (patch["max_applicants"]) patch["max_applicants"] = Number(patch["max_applicants"]);
    const { error } = await supabase.from("companies").insert(patch as never);
    setBusy(false);
    if (error) return setErr(error.message);
    onDone();
  }

  return (
    <div>
      <div className="flex items-center justify-between bg-foreground px-6 py-5 text-background">
        <h1 className="text-xl font-semibold">Add New Role</h1>
        <button onClick={onCancel} className="text-sm font-semibold hover:underline">Back to list</button>
      </div>
      <div className="bg-teal/90 px-6 py-6 text-primary-foreground">
        <label className="block max-w-sm text-sm">
          Shadow type
          <select value={type} onChange={(e) => setType_(Number(e.target.value))} className="mt-1 block w-full border-b border-primary-foreground/50 bg-transparent px-1 py-1 text-primary-foreground outline-none">
            {ROLE_TYPES.map((t, i) => <option key={t.label} value={i} className="text-foreground">{t.label} (R{t.amount})</option>)}
          </select>
        </label>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <CanonicalSelect table="sectors" label="Sector" value={vals["sector"] ?? ""} onChange={(v) => setVals({ ...vals, sector: v })} />
          <CanonicalSelect table="careers" label="Career / Role title" value={vals["career"] ?? ""} onChange={(v) => setVals({ ...vals, career: v })} />
          {fields.map((f) => (
            <label key={f.key} className="block text-sm">
              {f.label}
              <input value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} className="mt-1 w-full border-b border-primary-foreground/50 bg-transparent px-1 py-1 outline-none focus:border-primary-foreground" />
            </label>
          ))}
          <label className="block text-sm">
            Price (R)
            <input type="number" value={vals["amount"] ?? ""} onChange={(e) => setVals({ ...vals, amount: e.target.value })} className="mt-1 w-full border-b border-primary-foreground/50 bg-transparent px-1 py-1 outline-none focus:border-primary-foreground" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active (visible for booking)
          </label>
        </div>
        {err && <p className="mt-4 text-sm font-semibold">{err}</p>}
        <button onClick={save} disabled={busy} className="mt-6 bg-cta px-5 py-2.5 text-sm font-bold uppercase text-cta-foreground">Create</button>
      </div>
    </div>
  );
}

type ScholarProfile = {
  user_id: string; full_name: string; school: string; id_number: string;
  id_file_path: string | null; photo_path: string | null; id_verified: boolean;
};
type ScholarBooking = { id: string; user_id: string; career: string | null; company: string | null; shadow_date: string; status: string; indemnity_path: string | null; indemnity_received: boolean; internship_preapproved: boolean; internship_notes: string | null; ad_hoc_requested: boolean; ad_hoc_note: string | null };

async function downloadDoc(path: string | null) {
  if (!path) return;
  const { data, error } = await supabase.storage.from("scholar-docs").download(path);
  if (error || !data) return window.alert(error?.message ?? "File not found.");
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = path.split("/").pop() ?? path;
  a.click();
  URL.revokeObjectURL(url);
}

function ScholarVerification() {
  const qc = useQueryClient();
  const profiles = useQuery({
    queryKey: ["admin", "scholar_profiles"],
    queryFn: async () => ((await supabase.from("scholar_profiles").select("*").order("created_at", { ascending: false })).data ?? []) as ScholarProfile[],
  });
  const bookings = useQuery({
    queryKey: ["admin", "scholar_bookings"],
    queryFn: async () => ((await supabase.from("bookings").select("*").order("shadow_date", { ascending: false })).data ?? []) as ScholarBooking[],
  });

  async function setIdVerified(userId: string, verified: boolean) {
    const { error } = await supabase.from("scholar_profiles").update({ id_verified: verified, id_verified_at: verified ? new Date().toISOString() : null }).eq("user_id", userId);
    if (error) return window.alert(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "scholar_profiles"] });
  }

  async function setIndemnityReceived(id: string, received: boolean) {
    const { error } = await supabase.from("bookings").update({ indemnity_received: received }).eq("id", id);
    if (error) return window.alert(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "scholar_bookings"] });
  }

  if (profiles.isLoading || bookings.isLoading) {
    return <p className="p-8">Loading…</p>;
  }

  return (
    <div>
      <div className="bg-foreground px-6 py-6 text-background"><h1 className="text-2xl font-semibold">Scholars ({profiles.data?.length ?? 0})</h1></div>
      <div className="space-y-4 bg-teal/90 px-6 py-6 text-primary-foreground">
        {profiles.data?.length === 0 && <p>No scholar profiles yet.</p>}
        {profiles.data?.map((p) => {
          const own = (bookings.data ?? []).filter((b) => b.user_id === p.user_id);
          return (
            <div key={p.user_id} className="rounded-lg border border-primary-foreground/20 bg-background/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{p.full_name} · {p.school} · ID: {p.id_number}</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={p.id_verified} onChange={(e) => setIdVerified(p.user_id, e.target.checked)} />
                  ID verified
                </label>
              </div>
              <div className="mt-2 flex gap-3 text-sm">
                <button onClick={() => downloadDoc(p.id_file_path)} disabled={!p.id_file_path} className="bg-cta px-3 py-1.5 text-xs font-bold uppercase text-cta-foreground disabled:opacity-50">Download ID scan</button>
                <button onClick={() => downloadDoc(p.photo_path)} disabled={!p.photo_path} className="bg-cta px-3 py-1.5 text-xs font-bold uppercase text-cta-foreground disabled:opacity-50">Download photo</button>
              </div>
              {own.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-primary-foreground/20 pt-3">
                  {own.map((b) => (
                    <div key={b.id} className="text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>{b.career} · {b.company} · {b.shadow_date} · {b.status}</span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => downloadDoc(b.indemnity_path)} disabled={!b.indemnity_path} className="bg-cta px-3 py-1 text-xs font-bold uppercase text-cta-foreground disabled:opacity-50">Download indemnity</button>
                          <label className="flex items-center gap-1">
                            <input type="checkbox" checked={b.indemnity_received} onChange={(e) => setIndemnityReceived(b.id, e.target.checked)} />
                            Received
                          </label>
                        </div>
                      </div>
                      {b.ad_hoc_requested && (
                        <p className="mt-1 rounded bg-cta/30 px-2 py-1 text-xs">
                          Ad-hoc date requested - not pre-confirmed by the host{b.ad_hoc_note ? `: ${b.ad_hoc_note}` : ""}
                        </p>
                      )}
                      {b.internship_preapproved && (
                        <p className="mt-1 rounded bg-accent/30 px-2 py-1 text-xs">
                          Internship pre-approved by mentor{b.internship_notes ? `: ${b.internship_notes}` : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (emails.data ?? []).filter((e) => !s || [e.recipient, e.subject, e.template, e.status].some((v) => (v ?? "").toLowerCase().includes(s)));
  }, [emails.data, q]);

  return (
    <div>
      <div className="bg-foreground px-6 py-6 text-background"><h1 className="text-2xl font-semibold">Email Archive {!emails.isLoading && `(${rows.length})`}</h1></div>
      <div className="bg-teal/90 px-6 py-6 text-primary-foreground">
        <label className="block max-w-sm text-sm">
          Search
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Recipient, subject, template or status" className="mt-1 w-full border-b border-primary-foreground/50 bg-transparent px-1 py-1 outline-none" />
        </label>
        <div className="mt-6 space-y-2">
          {emails.isLoading ? (
            <p>Loading…</p>
          ) : rows.length === 0 ? (
            <p>No emails found.</p>
          ) : (
            rows.map((e) => (
              <details key={e.id} className="rounded-lg border border-primary-foreground/20 bg-background/10 p-3 text-sm">
                <summary className="cursor-pointer">
                  <strong>{e.subject}</strong> → {e.recipient || "(no address on file)"} · {e.template} · {e.status} · {new Date(e.created_at).toLocaleString()}
                </summary>
                <p className="mt-2 whitespace-pre-wrap">{e.body}</p>
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
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    setMinLead(String(settings.data.min_lead_days));
    setBlackout((settings.data.blackout_dates ?? []).join(", "));
  }, [settings.data]);

  async function save() {
    setBusy(true);
    setErr(null);
    setSaved(false);
    const dates = blackout.split(",").map((d) => d.trim()).filter(Boolean);
    const { error } = await (supabase.from("booking_settings") as any).update({ min_lead_days: Number(minLead) || 0, blackout_dates: dates }).eq("id", 1);
    setBusy(false);
    if (error) return setErr(error.message);
    setSaved(true);
    qc.invalidateQueries({ queryKey: ["admin", "booking_settings"] });
  }

  return (
    <div>
      <div className="bg-foreground px-6 py-6 text-background"><h1 className="text-2xl font-semibold">Booking Settings</h1></div>
      <div className="max-w-xl space-y-5 bg-teal/90 px-6 py-6 text-primary-foreground">
        <label className="block text-sm">
          Minimum lead time (days before a shadow date a booking is allowed)
          <input type="number" value={minLead} onChange={(e) => setMinLead(e.target.value)} className="mt-1 w-full max-w-xs border-b border-primary-foreground/50 bg-transparent px-1 py-1 outline-none" />
        </label>
        <label className="block text-sm">
          Blackout dates (comma separated, MM/DD/YYYY - no bookings allowed on these dates)
          <textarea value={blackout} onChange={(e) => setBlackout(e.target.value)} placeholder="12/15/2026, 12/16/2026" className="mt-1 w-full border-b border-primary-foreground/50 bg-transparent px-1 py-1 outline-none" />
        </label>
        {err && <p className="text-sm font-semibold">{err}</p>}
        <button onClick={save} disabled={busy || settings.isLoading} className="bg-cta px-5 py-2.5 text-sm font-bold uppercase text-cta-foreground disabled:opacity-50">{saved ? "Saved" : "Save"}</button>
      </div>
    </div>
  );
}

function EditRecord({ title, table, cols, row, onDone, onCancel }: { title: string; table: string; cols: Col[]; row: Record<string, unknown>; onDone: () => void; onCancel: () => void }) {
  const [vals, setVals] = useState<Record<string, unknown>>(row);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const editable = cols.filter((c) => c.key !== "id");

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
      <div className="flex items-center justify-between bg-foreground px-6 py-5 text-background">
        <h1 className="text-xl font-semibold">Edit {title.replace(/s$/, "")} #{String(row["id"])}</h1>
        <button onClick={onCancel} className="text-sm font-semibold hover:underline">Back to list</button>
      </div>
      <div className="bg-teal/90 px-6 py-6 text-primary-foreground">
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
                    className="mt-1 w-full border-b border-primary-foreground/50 bg-transparent px-1 py-1 outline-none focus:border-primary-foreground"
                  />
                )}
              </label>
            )
          )}
        </div>
        {err && <p className="mt-4 text-sm font-semibold">{err}</p>}
        <button onClick={save} disabled={busy} className="mt-6 bg-cta px-5 py-2.5 text-sm font-bold uppercase text-cta-foreground">Update</button>
      </div>
    </div>
  );
}
