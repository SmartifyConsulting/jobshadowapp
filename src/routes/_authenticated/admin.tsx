import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { providerGroups } from "@/lib/provider-directory";
import { CareerGuidance } from "@/components/CareerGuidance";
import { getCareerGuidance } from "@/lib/career-guidance";
import type { CareerDraft } from "@/lib/career-draft";
import { individualMentorEmails, classifyCompanies, companyKey, type CompanyContacts } from "@/lib/company-classification";
import { PersonNameFields } from "@/components/PersonNameFields";
import { PhoneInput } from "@/components/PhoneInput";
import { getCareerIdealFor } from "@/lib/career-ideal-for";
import { BOOKING_EXPORT_COLS } from "@/lib/application-columns";
import { CreateAccountDialog } from "@/components/CreateAccountDialog";
import { VoucherEditor } from "@/components/VoucherEditor";
import { NamedCsvUpload } from "@/components/NamedCsvUpload";
import { ApplicationsList } from "@/components/ApplicationsList";
import { AdminLedgerReport } from "@/components/AdminLedgerReport";
import { BoolIcon } from "@/components/BoolIcon";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Users as UsersIcon, FileText, ShoppingCart, Briefcase, GraduationCap, Pencil, Trash2, IdCard, Image as ImageIcon, Download, BadgeCheck, ChevronDown, LayoutGrid, List, X, Sparkles, Clock, Calendar as CalendarIcon, CalendarX, RotateCcw, Bell, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RichText } from "@/components/RichText";
import { CareerSkills } from "@/components/CareerSkills";
import { getCareerSkills } from "@/lib/career-skills";
import { draftCareerDescription } from "@/lib/career-ai.functions";
import { accountInitial, alphabetInitial } from "@/lib/alphabet";
import { withCareerDescriptions } from "@/lib/career-descriptions";
import { ROLE_TITLES } from "@/lib/data";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { SiteHeader, SiteFooter } from "@/components/SiteLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { sendQueuedEmails } from "@/lib/email.functions";
import { updateAccount, removeAccount } from "@/lib/users.functions";
import type { AccountApplication } from "@/lib/user-applications";
import { extractCompanyIndemnity } from "@/lib/indemnity-ai.functions";
import { lookupPublicHolidays } from "@/lib/public-holidays.functions";
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

const BAND_COLORS = ["bg-cta text-cta-foreground", "bg-accent text-accent-foreground", "bg-teal text-teal-foreground", "bg-primary text-primary-foreground"];
const TABLES: { id: string; label: string; icon: typeof UsersIcon; table: string; singular: string; cols: Col[]; csvUpload?: boolean; dateCompanyFilter?: boolean; indemnityEdit?: boolean; custom?: boolean }[] = [
  { id: "users", label: "Users", icon: GraduationCap, table: "legacy_users", singular: "Users", custom: true, cols: [] },
  { id: "bookings", label: "Bookings", icon: UsersIcon, table: "bookings", singular: "Bookings", custom: true, cols: [] },
  { id: "apps", label: "Applications", icon: UsersIcon, table: "legacy_applications", singular: "Applications", dateCompanyFilter: true, indemnityEdit: true, cols: [
    { key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "id_number", label: "ID No." },
    { key: "email", label: "Email" }, { key: "contact", label: "Contact" }, { key: "school", label: "School" },
    { key: "company", label: "Company" }, { key: "career", label: "Career" }, { key: "dates", label: "Dates" },
    { key: "paid", label: "Paid", field: "checkbox" }, { key: "indemnity", label: "Indemnity", field: "checkbox" }, { key: "cancelled", label: "Cancelled", field: "checkbox" } ] },
  { id: "companies", label: "Companies", icon: FileText, table: "companies", singular: "Companies", cols: [
    { key: "company", label: "Company" }, { key: "career", label: "Career" },
    { key: "sector", label: "Sector" }, { key: "location", label: "Location" }, { key: "mentor_name", label: "Mentor" },
    { key: "mentor_email", label: "Mentor email" }, { key: "mentor_phone", label: "Mentor phone" },
    { key: "mentor_position", label: "Mentor position" },
    { key: "arrival_instruction", label: "Arrival instructions (used when no mentor is named)" },
    { key: "backup_mentor_name", label: "Backup mentor" }, { key: "backup_mentor_phone", label: "Backup mentor phone" }, { key: "backup_mentor_email", label: "Backup mentor email" },
    { key: "hr_contact_name", label: "HR contact name" }, { key: "hr_contact_phone", label: "HR contact phone" }, { key: "hr_contact_email", label: "HR contact email" },
    { key: "dates", label: "Dates" }, { key: "max_applicants", label: "Places", field: "number" }, { key: "amount", label: "Price (R)", field: "number" },
    { key: "active", label: "Active", field: "checkbox" }, { key: "mode", label: "Type" }, { key: "logo_path", label: "Logo" },
    { key: "allow_weekends", label: "Allow weekends", field: "checkbox" }, { key: "allow_off_season", label: "Allow Nov–Jan (off-season)", field: "checkbox" },
    { key: "custom_indemnity_text", label: "Indemnity form" } ] },
  { id: "reports", label: "Reports", icon: FileText, table: "reports", singular: "Reports", custom: true, cols: [] },
  { id: "vouchers", label: "Vouchers", icon: ShoppingCart, table: "vouchers", singular: "Vouchers", cols: [
    { key: "id", label: "#" }, { key: "name", label: "Name" }, { key: "code", label: "Code" },
    { key: "discount", label: "Discount", field: "number" }, { key: "available_from", label: "From", field: "date" },
    { key: "available_until", label: "Until", field: "date" }, { key: "usage_limit", label: "Limit", field: "number" } ] },
  { id: "settings", label: "Booking Settings", icon: FileText, table: "booking_settings", singular: "Settings", custom: true, cols: [] },
  { id: "sectors", label: "Sectors", icon: FileText, table: "sectors", singular: "Sectors", csvUpload: true, cols: [{ key: "name", label: "Sector Name" }, { key: "_student_count", label: "Students" }] },
  { id: "careers", label: "Sectors and Careers", icon: Briefcase, table: "careers", singular: "Careers", csvUpload: true, cols: [{ key: "name", label: "Career Name" }, { key: "_student_count", label: "Students" }] },
  { id: "emails", label: "Email Archive", icon: FileText, table: "email_outbox", singular: "Emails", custom: true, cols: [] },
  { id: "evaluations", label: "Evaluations", icon: FileText, table: "evaluations", singular: "Evaluations", custom: true, cols: [] },
  { id: "legal", label: "Legal Content", icon: FileText, table: "legal_documents", singular: "Legal Content", custom: true, cols: [] },
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
  const [active, setActive] = useState("users");
  const section = TABLES.find((t) => t.id === active);
  if (!section) return null;

  return (
    <div className="admin-portal flex min-h-screen flex-col bg-muted/40">
      <SiteHeader fullWidth />
      <div className="flex min-w-0 flex-1">
      <aside className="w-60 shrink-0 border-r border-primary/20 bg-accent text-accent-foreground shadow-warm">
        <p className="px-5 pb-3 pt-6 text-xs font-bold uppercase tracking-widest text-foreground/70">Admin Portal</p>
        <nav className="space-y-1 px-3 pb-6">
          {TABLES.filter((t) => !["sectors", "vouchers", "bookings", "evaluations"].includes(t.id)).map((t) => (
            <button key={t.id} onClick={() => setActive(t.id)} className={`flex w-full items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-left text-sm font-medium transition ${active === t.id ? "border-primary bg-primary/10 text-foreground" : "border-transparent text-foreground/85 hover:bg-primary/5 hover:text-foreground"}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <main className="p-0">
          {admin.isLoading ? (
            <p className="p-8">Loading…</p>
          ) : !admin.data ? (
            <p className="p-8">Your account doesn't have admin access. Ask JobShadow to grant it.</p>
          ) : section.id === "users" ? (
            <AdminUsers key={section.id} />
          ) : section.id === "careers" ? (
            <CareersAndSectors />
          ) : section.id === "apps" ? (
            <ApplicationsScreen />
          ) : section.id === "reports" ? (
            <AdminReports />
          ) : section.id === "emails" ? (
            <EmailArchive key={section.id} />
          ) : section.id === "evaluations" ? (
            <Evaluations key={section.id} />
          ) : section.id === "legal" ? (
            <LegalContentEditor key={section.id} />
          ) : section.id === "bookings" ? (
            <LiveBookings key={section.id} />
          ) : section.id === "settings" ? (
            <BookingSettings key={section.id} />
          ) : section.id === "companies" ? (
            <CompanyPlacements key={section.id} />
          ) : (
            <DataTable key={section.id} title={section.singular} table={section.table} cols={section.cols} csvUpload={section.csvUpload} dateCompanyFilter={section.dateCompanyFilter} indemnityEdit={section.indemnityEdit} />
          )}
        </main>
      </div>
      </div>
      <SiteFooter />
    </div>
  );
}

/** Shared page header for every admin screen, so the tab bar (or whatever follows) always sits at
 * the same height - use this instead of hand-rolling a header block per screen. */
function AdminScreenHeader({ title, actions }: { title: React.ReactNode; actions?: React.ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-ivory px-6 py-6 text-foreground">
    <h1 className="text-2xl font-medium">{title}</h1>
    {actions}
  </div>;
}

function fmt(v: unknown) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}
function fmtCell(v: unknown) {
  if (typeof v === "boolean") return <BoolIcon value={v} />;
  return fmt(v);
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

function DataTable({ title, table, cols, csvUpload, dateCompanyFilter, indemnityEdit, companyKind }: { title: string; table: string; cols: Col[]; csvUpload?: boolean | undefined; dateCompanyFilter?: boolean | undefined; indemnityEdit?: boolean | undefined; companyKind?: "mentor" | "host" | undefined }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [openDesc, setOpenDesc] = useState<Set<string>>(new Set());
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
    qc.invalidateQueries({ queryKey: ["admin", table] }); if (table === "companies") void qc.invalidateQueries({ queryKey: ["admin", "company-contact-classification"] });
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
      if (table === "careers") all = withCareerDescriptions(all).map((row) => ({ ...row, ideal_for: getCareerGuidance(String(row["name"] ?? ""), String(row["description"] ?? ""), row).idealFor, specialisations: getCareerGuidance(String(row["name"] ?? ""), String(row["description"] ?? ""), row).specialisations, subjects: getCareerGuidance(String(row["name"] ?? ""), String(row["description"] ?? ""), row).subjects, school_skills: getCareerSkills(String(row["name"] ?? ""), row["school_skills"], row["workplace_skills"]).school, workplace_skills: getCareerSkills(String(row["name"] ?? ""), row["school_skills"], row["workplace_skills"]).workplace }));
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
      return table === "careers" ? withCareerDescriptions(rows) : rows;
    },
  });
  const companyTypes = useMemo(() => classifyCompanies((data ?? []) as CompanyContacts[]), [data]);
  const companies = useMemo(() => ["All companies", ...new Set((data ?? []).map((r) => fmt(r["company"])).filter(Boolean))], [data]);
  const letterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (alphabetField) (data ?? []).forEach((row) => {
      if (companyKind && companyTypes.get(companyKey(String(row["company"] ?? ""))) !== companyKind) return;
      const initial = alphabetInitial(fmt(row[alphabetField]));
      if (initial) counts.set(initial, (counts.get(initial) ?? 0) + 1);
    });
    return counts;
  }, [data, alphabetField, companyKind, companyTypes]);
  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (data ?? []).filter((r) => {
      if (companyKind && companyTypes.get(companyKey(String(r["company"] ?? ""))) !== companyKind) return false;
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
  }, [data, q, cols, dateCompanyFilter, company, from, to, letter, alphabetField, companyKind, companyTypes]);

  async function remove(row: Record<string, unknown>) {
    if (!(await confirmAction("Delete this record?", { danger: true, confirmLabel: "Delete" }))) return;
    const { error } = await (supabase.from(table as "careers") as any).delete().eq("id", row["id"]);
    if (error) return notify(error.message, "error");
    qc.invalidateQueries({ queryKey: ["admin", table] }); if (table === "companies") void qc.invalidateQueries({ queryKey: ["admin", "company-contact-classification"] });
  }

  if (editing) {
    const onDone = () => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin", table] }); if (table === "companies") void qc.invalidateQueries({ queryKey: ["admin", "company-contact-classification"] }); };
    const onCancel = () => setEditing(null);
    return indemnityEdit
      ? <ApplicationEditPanel table={table} row={editing} onDone={onDone} onCancel={onCancel} />
      : <EditRecord title={title} table={table} cols={cols} row={editing} onDone={onDone} onCancel={onCancel} />;
  }

  if (creating) {
    const onDone = () => { setCreating(false); qc.invalidateQueries({ queryKey: ["admin", table] }); if (table === "companies") void qc.invalidateQueries({ queryKey: ["admin", "company-contact-classification"] }); };
    return <CreateRole onDone={onDone} onCancel={() => setCreating(false)} />;
  }

  return (
    <div className="bg-ivory">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-ivory px-6 py-6 text-foreground">
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
        <div className="flex flex-wrap items-center gap-3">
          {csvUpload && (table === "careers" || table === "sectors") && <NamedCsvUpload table={table} />}
          {table === "companies" && (
            <Button onClick={() => setCreating(true)}>Add New Role</Button>
          )}
          {isNameOnly && (
            <div className="flex items-center gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`New ${title.replace(/s$/, "")} name`}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <Button onClick={addNamed} disabled={addBusy || !newName.trim()}>Add</Button>
            </div>
          )}
          <Button variant="outline" onClick={exportAll} disabled={isLoading || exporting}>{exporting ? "Exporting…" : "Export"}</Button>
        </div>
      </div>
      {alphabetField && (
        <div className="flex flex-wrap gap-1.5 border-b border-border bg-ivory px-6 py-4" aria-label={`Filter ${title} alphabetically`}>
          <button type="button" onClick={() => setLetter(null)} aria-pressed={letter === null} className={`rounded-full px-2.5 py-1.5 text-xs font-medium uppercase transition ${letter === null ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground hover:bg-teal/20"}`}>All</button>
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((ch) => (
            <button key={ch} type="button" onClick={() => setLetter(letter === ch ? null : ch)} disabled={!letterCounts.has(ch)} aria-pressed={letter === ch} className={`rounded-full px-2.5 py-1.5 text-xs font-medium uppercase transition ${letter === ch ? "bg-primary text-primary-foreground" : !letterCounts.has(ch) ? "bg-muted/30 text-muted-foreground/50" : "bg-muted/70 text-foreground hover:bg-teal/20"}`}>{ch}</button>
          ))}
        </div>
      )}
      <div className="bg-ivory px-6 py-6 text-foreground">
        {exportError && <p role="alert" className="mb-4 text-sm font-medium">{exportError}</p>}
        <div className="flex flex-wrap items-end gap-6">
          <label className="block max-w-sm text-sm">
            Search
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none" />
          </label>
          {isUsers && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showSpam} onChange={(e) => setShowSpam(e.target.checked)} />
              Show spam-flagged accounts
            </label>
          )}
        </div>
        {table === "careers" ? (
          <div className="mt-4 space-y-0">
            {[...new Set(rows.map((r) => alphabetInitial(fmt(r["name"]))))].sort((a, b) => a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)).map((group) => {
              const groupRows = rows.filter((r) => alphabetInitial(fmt(r["name"])) === group);
              return (
                <Accordion key={group} type="multiple" className="overflow-hidden border-x border-border bg-ivory first:border-t last:border-b">
                  <AccordionItem value={group}>
                    <AccordionTrigger className="px-3 py-3 text-sm hover:no-underline hover:bg-muted/30">
                      <span className="font-bold text-primary">{group}</span>&nbsp;<span className="text-muted-foreground">({groupRows.length})</span>
                    </AccordionTrigger>
                    <AccordionContent className="bg-ivory pb-0 text-foreground">
                      <div className="divide-y divide-warm-divider">
                        {groupRows.map((r) => {
                          const rid = String(r["id"]);
                          const descOpen = openDesc.has(rid);
                          return (
                            <Fragment key={rid}>
                              <div className="flex items-center justify-between gap-3 px-4 py-1.5 odd:bg-ivory even:bg-pale-lime/40">
                                <div className="flex min-w-0 items-center gap-2">
                                  {table === "careers" && (
                                    <button type="button" aria-expanded={descOpen} aria-label={descOpen ? "Hide description" : "Show description"} onClick={() => setOpenDesc((prev) => { const n = new Set(prev); n.has(rid) ? n.delete(rid) : n.add(rid); return n; })} className="grid h-5 w-5 shrink-0 place-items-center rounded border border-warm-divider text-xs font-bold text-muted-foreground hover:text-primary">{descOpen ? "−" : "+"}</button>
                                  )}
                                  <div className="min-w-0"><span className="block truncate text-sm font-medium leading-tight">{fmt(r["name"])}</span>{!descOpen && r["description"] ? <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{String(r["description"]).replace(/\*\*/g, "").split("\n")[0]}</p> : null}</div>
                                  <span className="shrink-0 text-xs text-muted-foreground">{fmt(r["_student_count"])} students</span>
                                </div>
                                <div className="flex shrink-0 gap-1.5">
                                  <button onClick={() => setEditing(r)} className="inline-flex items-center gap-1 rounded border border-warm-divider px-2 py-1 text-xs hover:text-primary"><Sparkles className="h-3 w-3" />AI wizard</button>
                                  <button onClick={() => setEditing(r)} className="rounded border border-warm-divider p-1.5 text-muted-foreground transition hover:text-primary" aria-label="Edit"><Pencil className="h-3 w-3" /></button>
                                  <button onClick={() => remove(r)} className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/5 hover:text-destructive" aria-label="Delete"><Trash2 className="h-3 w-3" /></button>
                                </div>
                              </div>
                              {table === "careers" && descOpen && (
                                <div className="bg-background/60 px-10 py-3 text-sm text-muted-foreground">
                                  <CareerGuidance name={String(r["name"] ?? "")} description={String(r["description"] ?? "")} saved={r} />
                                </div>
                              )}
                            </Fragment>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            })}
            {rows.length === 0 && <p className="py-6 text-sm text-muted-foreground">No {title.toLowerCase()} match this search.</p>}
          </div>
        ) : (
        <div className="mt-6 overflow-x-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-track]:bg-muted">
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
              ) : rows.map((r) => { const rid = String(r["id"]); const descOpen = openDesc.has(rid); return (
                <Fragment key={rid}>
                <tr className="border-b border-warm-divider">
                  {cols.map((c) => <td key={c.key} className={`align-top ${table === "companies" ? "px-2 py-1" : "px-3 py-2"}`}>{table === "careers" && c.key === "name" ? (
                    <span className="flex items-start gap-2">
                      <button type="button" aria-expanded={descOpen} aria-label={descOpen ? "Hide description" : "Show description"} onClick={() => setOpenDesc((prev) => { const n = new Set(prev); n.has(rid) ? n.delete(rid) : n.add(rid); return n; })} className="grid h-5 w-5 shrink-0 place-items-center rounded border border-border text-xs font-bold text-muted-foreground hover:text-primary">{descOpen ? "−" : "+"}</button>
                      {fmtCell(r[c.key])}
                    </span>
                  ) : c.key === "custom_indemnity_text" ? (r[c.key] ? "Uploaded" : "—") : fmtCell(r[c.key])}</td>)}
                  <td className={table === "companies" ? "px-2 py-1" : "px-3 py-2"}>
                    <div className="flex gap-1.5">
                      <button onClick={() => setEditing(r)} className="rounded border border-border p-1.5 text-muted-foreground transition hover:text-primary" aria-label="Edit"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => remove(r)} className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/5 hover:text-destructive" aria-label="Delete"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
                {table === "careers" && descOpen && (
                  <tr className="border-b border-border/60 bg-muted/30"><td colSpan={cols.length + 1} className="px-10 py-3 text-sm text-muted-foreground">
                    {r["description"] ? <RichText text={String(r["description"])} /> : <em>No description yet — edit this career to add one.</em>}
                  </td></tr>
                )}
                </Fragment>
              ); })}
            </tbody>
          </table>
        </div>
        )}
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
    { key: "arrival_instruction", label: "Arrival instructions (used when no mentor is named)" },
    { key: "hr_contact_name", label: "HR contact name" }, { key: "hr_contact_phone", label: "HR contact phone" }, { key: "hr_contact_email", label: "HR contact email" },
    { key: "backup_mentor_name", label: "Backup mentor name" }, { key: "backup_mentor_phone", label: "Backup mentor phone" }, { key: "backup_mentor_email", label: "Backup mentor email" },
    { key: "max_applicants", label: "Places" },
  ];

  async function save() {
    if (!vals["company"] || !vals["career"]) { setErr("Company and Career are required."); return; }
    setBusy(true);
    setErr(null);
    const patch: Record<string, unknown> = { ...vals, amount: Number(vals["amount"]) || ROLE_TYPES[type]!.amount, active, mode: ROLE_TYPES[type]!.label, allow_weekends: vals["allow_weekends"] === "true", allow_off_season: vals["allow_off_season"] === "true" };
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
          <div className="sm:col-span-3">
            <p className="text-sm">Dates</p>
            <div className="mt-2 flex gap-5">
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={vals["allow_weekends"] === "true"} onChange={(e) => setVals({ ...vals, allow_weekends: e.target.checked ? "true" : "" })} />Allow weekends</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={vals["allow_off_season"] === "true"} onChange={(e) => setVals({ ...vals, allow_off_season: e.target.checked ? "true" : "" })} />Allow Nov–Jan (off-season)</label>
            </div>
            <div className="mt-2">
              <DatesPicker
                value={vals["dates"] ?? ""}
                onChange={(v) => setVals({ ...vals, dates: v })}
                allowWeekends={vals["allow_weekends"] === "true"}
                allowOffSeason={vals["allow_off_season"] === "true"}
              />
            </div>
          </div>
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
      {verified && <BadgeCheck aria-label="ID verified" className="absolute -right-1 -top-1 h-3.5 w-3.5 fill-primary text-white" />}
    </span>
    {file.data === true && <button onClick={() => downloadDoc(path)} aria-label={kind === "id" ? "Download ID scan" : "Download photo"} title={kind === "id" ? "Download ID scan" : "Download photo"} className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-primary"><Download className="h-4 w-4" /></button>}
  </div>;
}

const ROLE_LABELS: Record<AccountRow["roles"][number], string> = { user: "Student", mentor: "Host", hr_admin: "HR Admin", school: "School", admin: "Admin", parent: "Parent" };

/** Per-user application/booking history, fetched lazily only when a row is expanded or selected -
 * not eagerly embedded for every account, which used to mean loading it for hundreds of users on
 * every page view regardless of whether anyone looked at it. */
function useUserApplications(userId: string | null) {
  return useQuery({
    queryKey: ["admin", "user-applications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_user_applications", { _user_id: userId! });
      if (error) throw new Error(error.message);
      return (data ?? []) as AccountApplication[];
    },
  });
}

function accountNameParts(a: AccountRow) {
  const first = a.first_name || a.scholar_first_name || "";
  const last = a.last_name || a.scholar_last_name || "";
  if (first || last) return { first, last };
  const parts = (a.display_name || a.full_name || "").trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

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

function UserTableRow({ a, selectedId, busyId, expandedApplicationUser, onSelect, onEdit, onDelete, onVerify, onToggleExpand }: {
  a: AccountRow; selectedId: string | null; busyId: string | null; expandedApplicationUser: string | null;
  onSelect: (id: string) => void; onEdit: () => void; onDelete: (id: string, label: string) => void;
  onVerify: (id: string, verified: boolean) => void; onToggleExpand: () => void;
}) {
  const avatarUrl = a.avatar_path ? supabase.storage.from("avatars").getPublicUrl(a.avatar_path).data.publicUrl : null;
  const label = a.display_name || a.full_name || a.email || a.id;
  const { first: firstName, last: lastName } = accountNameParts(a);
  const expanded = expandedApplicationUser === a.id;
  const applications = useUserApplications(expanded ? a.id : null);
  return <Fragment>
    <tr className={'border-t border-warm-divider transition-colors hover:bg-teal/5 ' + (selectedId === a.id ? 'bg-teal/10' : '')}>
      <td className="px-3 py-1.5"><div className="flex items-center gap-2" title={'Joined ' + new Date(a.created_at).toLocaleDateString()}>
        {avatarUrl ? <img src={avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" /> : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal/15 text-[11px] uppercase">{label.slice(0, 1)}</span>}
        <button onClick={() => onSelect(a.id)} className="max-w-32 truncate text-left font-medium hover:text-primary" title={label} aria-label={'View details for ' + label}>{firstName || "—"}</button>
        {a.is_spam && <span className="text-[10px] text-destructive">Spam</span>}
      </div></td>
      <td className="px-3 py-1.5">{lastName || "—"}</td>
      <td className="px-3 py-1.5"><span className="block max-w-48 truncate" title={a.email ?? ""}>{a.email || "—"}</span></td>
      <td className="px-3 py-1.5">{a.id_number || "—"}</td>
      <td className="px-3 py-1.5"><span className="block max-w-40 truncate" title={a.school ?? ""}>{a.school || "—"}</span></td>
      <td className="px-3 py-1.5"><div className="flex items-center gap-2">
        <label className="flex items-center" title={a.id_verified === null ? 'No scholar profile to verify' : 'ID verified'}><input type="checkbox" className="accent-primary" checked={a.id_verified === true} disabled={a.id_verified === null || busyId === a.id} onChange={(e) => onVerify(a.id, e.target.checked)} aria-label={'ID verified for ' + label} /></label>
        <UserDocument path={a.id_file_path} kind="id" verified={a.id_verified === true} />
        <UserDocument path={a.photo_path} kind="photo" />
      </div></td>
      <td className="px-3 py-1.5"><button aria-expanded={expanded} aria-controls={'applications-' + a.id} onClick={onToggleExpand} className="flex items-center gap-2 whitespace-nowrap rounded px-1.5 py-1 text-xs hover:bg-muted" title={a.booking_count + ' bookings'}>{a.booking_count}<ChevronDown className={'h-3 w-3 transition ' + (expanded ? 'rotate-180' : '')} /><span className="sr-only">Applications for {label}</span></button></td>
      <td className="px-3 py-1.5"><div className="flex items-center gap-1.5">
        <button onClick={onEdit} disabled={busyId === a.id} className="flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs transition hover:border-primary/30 hover:text-primary disabled:opacity-50" aria-label={'Edit ' + label}><Pencil className="h-3.5 w-3.5" />Edit</button>
        <button onClick={() => onDelete(a.id, label)} disabled={busyId === a.id} className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/5 hover:text-destructive disabled:opacity-50" aria-label={'Delete account for ' + label}><Trash2 className="h-3.5 w-3.5" /></button>
      </div></td>
    </tr>
    {expanded && <tr id={'applications-' + a.id}><td colSpan={8} className="border-t border-border bg-muted/30 px-5 py-3">
      <div className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Applications for {label}</span><span>{a.booking_count} bookings · Joined {new Date(a.created_at).toLocaleDateString()}</span></div>
      {applications.isLoading ? <p className="text-xs text-muted-foreground">Loading…</p> : !applications.data?.length ? <p className="text-xs text-muted-foreground">No applications recorded.</p> : (
        <table className="w-full text-left text-xs"><thead><tr>{["ID", "Company", "Career", "Dates", "Paid", "Indemnity", "Cancelled"].map((heading) => <th key={heading} className="px-2 py-2 font-medium">{heading}</th>)}</tr></thead><tbody>{applications.data.map((application) => <tr key={application.source + '-' + application.id} className="border-t border-border/70"><td className="px-2 py-2">{application.source} #{application.id}</td><td className="px-2 py-2">{application.company || '—'}</td><td className="px-2 py-2">{application.career || '—'}</td><td className="px-2 py-2">{application.dates || '—'}</td>{[application.paid, application.indemnity, application.cancelled].map((value, index) => <td key={index} className="px-2 py-2">{value === null ? 'Not recorded' : <BoolIcon value={index === 2 ? !value : value} />}</td>)}</tr>)}</tbody></table>
      )}
    </td></tr>}
  </Fragment>;
}

function UserDetailPanel({ account: a, onClose, onEdit }: { account: AccountRow; onClose: () => void; onEdit: () => void }) {
  const label = a.display_name || a.full_name || a.email || a.id;
  const applications = useUserApplications(a.id);
  return <aside aria-label="Selected user details" className="w-full shrink-0 border-t border-border bg-background p-5 xl:sticky xl:top-0 xl:max-h-screen xl:w-72 xl:overflow-y-auto xl:border-l xl:border-t-0">
    <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-sans text-sm font-medium">{label}</h2><div className="mt-1 flex flex-wrap gap-1">{a.roles.length === 0 && <span className="text-xs text-muted-foreground">Unclassified</span>}{a.roles.map((role) => <span key={role} className="rounded bg-teal/15 px-1.5 py-0.5 text-[10px]">{ROLE_LABELS[role]}</span>)}</div></div><button onClick={onClose} aria-label="Close user details" className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button></div>
    <dl className="space-y-2 text-xs">
      {([['Email', a.email], ['Phone', a.contact_no], ['School', a.school], ['ID / passport', a.id_number], ['Joined', new Date(a.created_at).toLocaleDateString()]] as const).map(([title, value]) => <div key={title}><dt className="text-muted-foreground">{title}</dt><dd className="break-words">{value || '—'}</dd></div>)}
    </dl>
    <div className="my-4 flex items-center justify-between"><span className="flex items-center gap-1 text-xs text-muted-foreground"><BoolIcon value={!!a.id_verified} /> {a.id_verified ? 'ID verified' : 'ID not verified'}</span><button onClick={onEdit} className="flex items-center gap-1 text-xs text-primary"><Pencil className="h-3 w-3" />Edit user</button></div>
    <div className="space-y-4 border-t border-border py-4"><UserFilePreview path={a.id_file_path} label="Uploaded ID" /><UserFilePreview path={a.photo_path} label="Uploaded photo" /></div>
    <section className="border-t border-border pt-4"><h3 className="mb-3 text-xs font-medium">Application history {applications.data ? `(${applications.data.length})` : ""}</h3><div className="space-y-3">{applications.isLoading ? <p className="text-xs text-muted-foreground">Loading…</p> : applications.data?.length ? applications.data.map((application) => <article key={application.source + application.id} className="border-b border-border/60 pb-3 text-xs"><p className="font-medium">{application.career || 'Career not recorded'}</p><p className="text-muted-foreground">{application.company || 'Company not recorded'} · {application.dates || 'Dates not recorded'}</p><p className="mt-1 text-[10px]">{application.source} #{application.id}</p><p className="mt-1 flex flex-wrap items-center gap-x-1 text-[10px] text-muted-foreground"><span className="flex items-center gap-1">Paid: {application.paid === null ? 'Not recorded' : <BoolIcon value={application.paid} />}</span> · <span className="flex items-center gap-1">Indemnity: {application.indemnity === null ? 'Not recorded' : <BoolIcon value={application.indemnity} />}</span> · <span className="flex items-center gap-1">Cancelled: {application.cancelled === null ? 'Not recorded' : <BoolIcon value={!application.cancelled} />}</span></p></article>) : <p className="text-xs text-muted-foreground">No applications recorded.</p>}</div></section>
  </aside>;
}

function UserCards({ rows, selectedId, busyId, onSelect, onEdit, onDelete, onVerify }: {
  rows: AccountRow[]; selectedId: string | null; busyId: string | null;
  onSelect: (id: string) => void; onEdit: (account: AccountRow) => void;
  onDelete: (id: string, label: string) => void; onVerify: (id: string, verified: boolean) => void;
}) {
  return <div className="grid gap-3 border-t border-border bg-ivory p-3 sm:grid-cols-2 2xl:grid-cols-3">{rows.map((a) => {
    const label = a.display_name || a.full_name || a.email || a.id;
    return <article key={a.id} className={'min-w-0 rounded-md border bg-ivory p-4 ' + (selectedId === a.id ? 'border-primary/40' : 'border-border')}>
      <button className="max-w-full truncate text-left text-sm font-medium hover:text-primary" onClick={() => onSelect(a.id)}>{label}</button>
      <div className="my-2 flex flex-wrap gap-1">{a.roles.length === 0 && <span className="text-xs text-muted-foreground">Unclassified</span>}{a.roles.map((role) => <span key={role} className="rounded bg-teal/15 px-1.5 py-0.5 text-[10px]">{ROLE_LABELS[role]}</span>)}{a.is_spam && <span className="text-[10px] text-destructive">Spam</span>}</div>
      <div className="space-y-1 text-xs text-muted-foreground"><p className="truncate" title={a.email ?? undefined}>{a.email || 'No email'}</p><p>{a.contact_no || 'No phone'}</p><p className="truncate" title={a.school ?? undefined}>{a.school || 'No school'}</p><p>ID / passport: {a.id_number || '—'}</p><p>Joined {new Date(a.created_at).toLocaleDateString()}</p></div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <label title="ID verified"><input type="checkbox" className="accent-teal" checked={a.id_verified === true} disabled={a.id_verified === null || busyId === a.id} onChange={(e) => onVerify(a.id, e.target.checked)} aria-label={'ID verified for ' + label} /></label>
        <UserDocument path={a.id_file_path} kind="id" verified={a.id_verified === true} /><UserDocument path={a.photo_path} kind="photo" />
        <button onClick={() => onEdit(a)} disabled={busyId === a.id} className="ml-auto flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"><Pencil className="h-3 w-3" />Edit</button>
        <button onClick={() => onDelete(a.id, label)} disabled={busyId === a.id} aria-label={'Delete account for ' + label} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      <button onClick={() => onSelect(a.id)} className="mt-3 text-xs text-primary">View details · {a.booking_count} bookings</button>
    </article>;
  })}</div>;
}

export function AdminUsers() {
  const qc = useQueryClient();
  const updateRoleFn = useServerFn(updateAccount);
  const removeAccountFn = useServerFn(removeAccount);
  const accounts = useQuery({
    queryKey: ["admin", "accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_accounts");
      if (error) throw new Error(error.message);
      const rolePriority = ["admin", "hr_admin", "mentor", "school", "user"] as const;
      return (data ?? []).map((row): AccountRow => {
        const roles = row.roles as AccountRow["roles"];
        return { ...row, roles, role: rolePriority.find((r) => roles.includes(r)) ?? null, applications: [] };
      });
    },
  });
  const [q, setQ] = useState("");
  const [view, setView] = useState<"table" | "cards">("table");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedAccount = accounts.data?.find((account) => account.id === selectedId);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [expandedApplicationUser, setExpandedApplicationUser] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [roleTab, setRoleTab] = useState<AccountRow["roles"][number] | "unclassified" | "individual_mentor">("user");
  const isUnclassified = roleTab === "unclassified";
  const accountRole = isUnclassified ? "user" : roleTab === "individual_mentor" ? "mentor" : roleTab;
  const mentorCompanies = useQuery({ queryKey: ["admin", "company-contact-classification"], queryFn: () => fetchAllRows(async (from, to) => { const result = await supabase.from("companies").select("company,mentor_name,mentor_email,backup_mentor_name,backup_mentor_email").order("id").range(from, to); if (result.error) throw result.error; return result.data ?? []; }) });
  const soleMentors = useMemo(() => individualMentorEmails((mentorCompanies.data ?? []) as { company: string | null; mentor_email: string | null; backup_mentor_email: string | null }[]), [mentorCompanies.data]);
  const matchesRole = (a: AccountRow, tab = roleTab) => {
    const email = (a.email ?? "").trim().toLowerCase();
    const isSoleMentorEmail = soleMentors.has(email);
    if (tab === "unclassified") return a.roles.length === 0 && !isSoleMentorEmail;
    if (tab === "individual_mentor") return isSoleMentorEmail && (a.roles.length === 0 || a.roles.includes("mentor"));
    if (tab === "mentor") return a.roles.includes("mentor") && !isSoleMentorEmail;
    if (tab === "admin") return a.roles.includes("admin") || a.roles.includes("hr_admin");
    return a.roles.includes(tab);
  };
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
      await updateRoleFn({ data: { userId: editing.id, display_name: editing.display_name ?? "", first_name: editing.first_name, last_name: editing.last_name, scholar_first_name: editing.scholar_first_name, scholar_last_name: editing.scholar_last_name, full_name: editing.full_name ?? "", contact_no: editing.contact_no ?? "", school: editing.school ?? "", id_number: editing.id_number ?? "", roles: editing.roles } });
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
        if (!matchesRole(a)) return false;
        if (!showSpam && a.is_spam) return false;
        if (s && ![a.email, a.display_name, a.full_name, a.contact_no, a.school, a.id_number, ...a.roles.map((role) => ROLE_LABELS[role])].some((v) => (v ?? "").toLowerCase().includes(s))) return false;
        if (letter && accountInitial(a) !== letter) return false;
        return true;
      })
      .sort((a, b) => (a.display_name || a.full_name || a.email || "").localeCompare(b.display_name || b.full_name || b.email || ""));
  }, [accounts.data, q, showSpam, letter, accountRole, isUnclassified, soleMentors, roleTab]);


  const letterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (accounts.data ?? []).forEach((a) => {
      if (!matchesRole(a)) return;
      if (!showSpam && a.is_spam) return;
      const first = accountInitial(a);
      if (first) counts.set(first, (counts.get(first) ?? 0) + 1);
    });
    return counts;
  }, [accounts.data, showSpam, accountRole, isUnclassified, soleMentors, roleTab]);

  return (
    <div>
      {createOpen && <CreateAccountDialog role={accountRole} label={roleTab === "individual_mentor" ? "Mentor" : ROLE_LABELS[accountRole]} onClose={() => setCreateOpen(false)} />}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open && busyId !== editing?.id) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Edit user</DialogTitle></DialogHeader>
          {editing && <form onSubmit={(e) => { e.preventDefault(); saveAccount(); }} className="space-y-3">
            <p className="text-sm text-muted-foreground">{editing.email}</p>
            <PersonNameFields id="admin-account-name" label="Account Name" firstName={editing.first_name} lastName={editing.last_name} originalName={editing.display_name} disabled={busyId === editing.id} onChange={(first, last, full) => setEditing({ ...editing, first_name: first, last_name: last, display_name: full })} />
            {editing.has_scholar_profile && <PersonNameFields id="admin-scholar-name" label="Learner Name" firstName={editing.scholar_first_name} lastName={editing.scholar_last_name} originalName={editing.full_name} disabled={busyId === editing.id} onChange={(first, last, full) => setEditing({ ...editing, scholar_first_name: first, scholar_last_name: last, full_name: full })} />}
            {([['contact_no', 'Mobile Number'], ['school', 'School'], ['id_number', 'ID / passport number']] as const).map(([field, label]) => <label key={field} className="block text-sm">{label}{field === "contact_no" ? <PhoneInput label={label} disabled={busyId === editing.id || !editing.has_scholar_profile} value={editing.contact_no ?? ""} onChange={(value) => setEditing({ ...editing, contact_no: value })} /> : <input disabled={busyId === editing.id || !editing.has_scholar_profile} value={editing[field] ?? ''} onChange={(e) => setEditing({ ...editing, [field]: e.target.value })} className="mt-1 w-full rounded border border-input bg-background px-3 py-2 disabled:opacity-50" />}</label>)}
            {!editing.has_scholar_profile && <p className="text-xs text-muted-foreground">Scholar details can be edited once this user has a scholar profile. Imported details remain on the original application.</p>}
            <details className="rounded border border-input p-3"><summary className="cursor-pointer text-sm">User types: {editing.roles.map((role) => ROLE_LABELS[role]).join(', ') || 'Select roles'}</summary><div className="mt-2 space-y-2">{(Object.keys(ROLE_LABELS) as AccountRow['roles'][number][]).map((role) => <label key={role} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={busyId === editing.id} checked={editing.roles.includes(role)} onChange={(e) => setEditing({ ...editing, roles: e.target.checked ? [...editing.roles, role] : editing.roles.filter((item) => item !== role) })} />{ROLE_LABELS[role]}</label>)}</div></details>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" disabled={busyId === editing.id} onClick={() => setEditing(null)}>Cancel</Button><Button disabled={busyId === editing.id || editing.roles.length === 0}>{busyId === editing.id ? 'Saving…' : 'Save changes'}</Button></div>
          </form>}
        </DialogContent>
      </Dialog>
      <AdminScreenHeader title={`Users ${!accounts.isLoading ? `(${rows.length})` : ""}`} actions={
        <div role="group" aria-label="Users view" className="flex rounded border border-border p-0.5">
          {([['table', List, 'Table'], ['cards', LayoutGrid, 'Cards']] as const).map(([value, Icon, label]) => <button key={value} onClick={() => setView(value)} aria-pressed={view === value} className={'flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition ' + (view === value ? 'bg-background text-primary' : 'hover:bg-primary/5')}><Icon className="h-3.5 w-3.5" />{label}</button>)}
        </div>
      } />
      <Tabs value={roleTab} onValueChange={(value) => { setRoleTab(value as AccountRow["roles"][number] | "unclassified" | "individual_mentor"); setLetter(null); setOpenGroups([]); setSelectedId(null); }}>
        <div className="overflow-x-auto border-b border-border bg-ivory px-6 py-4"><TabsList aria-label="User types">{([["user", "Students"], ["mentor", "Hosts"], ["individual_mentor", "Mentors"], ["school", "Schools"], ["admin", "Admin"], ["unclassified", "Unclassified"]] as const).map(([role, name]) => <TabsTrigger key={role} value={role}>{name} ({(accounts.data ?? []).filter((user) => matchesRole(user, role) && (showSpam || !user.is_spam)).length})</TabsTrigger>)}</TabsList></div>
      <TabsContent value={roleTab} className="mt-0">
      <div className="flex flex-col items-start xl:flex-row">
      <div className={'min-w-0 w-full flex-1 px-4 py-2 text-foreground ' + 'bg-ivory'}>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button" aria-pressed={letter === null} onClick={() => { setLetter(null); setOpenGroups([]); }}
            className={`rounded-full px-2.5 py-1.5 text-xs font-medium uppercase transition ${letter === null ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground hover:bg-teal/20"}`}
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
                className={`rounded-full px-2.5 py-1.5 text-xs font-medium uppercase transition ${letter === ch ? "bg-primary text-primary-foreground" : count === 0 ? "bg-muted/30 text-muted-foreground/50" : "bg-muted/70 text-foreground hover:bg-teal/20"}`}
              >
                {ch}
              </button>
            );
          })}
          {!isUnclassified && <Button className="ml-auto" onClick={() => setCreateOpen(true)}>Add {roleTab === "individual_mentor" ? "Mentor" : ROLE_LABELS[accountRole]}</Button>}
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-4">
          <label className="block max-w-sm text-sm">
            Search
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, school, company or career" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none" />
          </label>
        </div>
        {accounts.isLoading ? (
          <p className="mt-6">Loading…</p>
        ) : accounts.error ? (
          <p className="mt-6 text-destructive">{(accounts.error as Error).message}</p>
        ) : (
          <Accordion type="multiple" value={openGroups} onValueChange={setOpenGroups} className="mt-3 border-t border-border">
            {[...new Set(rows.map((a) => accountInitial(a)))].sort((a, b) => a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)).map((group) => (
              <AccordionItem key={group} value={group}>
                <AccordionTrigger className="px-3 py-3 text-sm hover:no-underline hover:bg-muted/30"><span className="font-bold text-primary">{group}</span>&nbsp;<span className="text-muted-foreground">({rows.filter((a) => (accountInitial(a)) === group).length})</span></AccordionTrigger>
                <AccordionContent className="pb-0">{view === "cards" ? <UserCards rows={rows.filter((a) => (accountInitial(a)) === group)} selectedId={selectedId} busyId={busyId} onSelect={setSelectedId} onEdit={(a) => setEditing({ ...a, roles: [...a.roles] })} onDelete={deleteAccountRow} onVerify={setIdVerified} /> : <div className="overflow-x-auto border-t border-border [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-track]:bg-muted">
                  <table className="w-full min-w-[820px] text-left text-xs">
                    <thead className="bg-background/40 text-foreground"><tr>{["First Name", "Last Name", "Email", "ID / passport", "School", "Documents", "Applications", "Actions"].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-2 font-normal">{heading}</th>)}</tr></thead>
                    <tbody>
                    {rows.filter((a) => (accountInitial(a)) === group).map((a) => (
                      <UserTableRow
                        key={a.id} a={a} selectedId={selectedId} busyId={busyId} expandedApplicationUser={expandedApplicationUser}
                        onSelect={setSelectedId} onEdit={() => setEditing({ ...a, roles: [...a.roles] })} onDelete={deleteAccountRow}
                        onVerify={setIdVerified} onToggleExpand={() => setExpandedApplicationUser(expandedApplicationUser === a.id ? null : a.id)}
                      />
                    ))}
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
      </TabsContent>
      </Tabs>
    </div>
  );
}

type EmailRow = { id: string; recipient: string | null; subject: string; body: string; template: string; status: string; created_at: string };

const STATUS_BADGE: Record<string, string> = {
  queued: "bg-accent/20 text-accent-foreground",
  sent: "bg-teal/20 text-teal-foreground",
  failed: "bg-destructive/15 text-destructive",
};

function EmailArchive() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    return (emails.data ?? []).filter((e) => (statusFilter === "all" || e.status === statusFilter) && (!s || [e.recipient, e.subject, e.template, e.status].some((v) => (v ?? "").toLowerCase().includes(s))));
  }, [emails.data, q, statusFilter]);
  const selected = rows.find((e) => e.id === selectedId) ?? rows[0] ?? null;
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: (emails.data ?? []).length };
    for (const e of emails.data ?? []) counts[e.status] = (counts[e.status] ?? 0) + 1;
    return counts;
  }, [emails.data]);

  return (
    <div>
      <div className="border-b border-border bg-background px-6 py-6 text-foreground"><h1 className="text-2xl font-medium">Email Archive {!emails.isLoading && `(${rows.length})`}</h1></div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-6 py-3">
        <button onClick={() => flush(false)} disabled={sending} className="rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-foreground disabled:opacity-50">Send queued emails now</button>
        <button onClick={() => flush(true)} disabled={sending} className="bg-primary px-4 py-2 text-xs font-medium uppercase tracking-wide text-primary-foreground disabled:opacity-50">Retry failed emails</button>
        {sendMsg && <p className="text-sm break-words">{sendMsg}</p>}
      </div>
      <div className="flex min-h-[70vh] flex-col bg-background text-foreground md:flex-row">
        {/* Mailbox sidebar: status "folders" */}
        <div className="shrink-0 border-b border-border bg-muted/30 md:w-48 md:border-b-0 md:border-r">
          <nav className="flex gap-1 overflow-x-auto p-2 md:block md:space-y-1 md:overflow-visible">
            {(["all", "queued", "sent", "failed"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium capitalize ${statusFilter === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                {s === "all" ? "Inbox" : s}
                <span className="text-xs opacity-70">{statusCounts[s] ?? 0}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Message list */}
        <div className="flex w-full flex-col border-b border-border md:w-80 md:shrink-0 md:border-b-0 md:border-r">
          <div className="border-b border-border p-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search mail…" className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {emails.isLoading ? (
              <p className="p-4 text-sm">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No emails found.</p>
            ) : (
              rows.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`block w-full border-b border-border/60 px-3 py-2.5 text-left text-xs ${selected?.id === e.id ? "bg-primary/10" : "hover:bg-muted/60"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{e.recipient || "(no address on file)"}</span>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_BADGE[e.status] ?? "bg-muted"}`}>{e.status}</span>
                  </div>
                  <p className="mt-0.5 truncate">{e.subject}</p>
                  <p className="mt-0.5 truncate text-muted-foreground">{e.template} · {new Date(e.created_at).toLocaleString()}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Reading pane */}
        <div className="flex-1 overflow-y-auto">
          {!selected ? (
            <p className="p-6 text-sm text-muted-foreground">Select an email to preview it.</p>
          ) : (
            <div className="p-4">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-semibold">{selected.subject}</h2>
                <p className="mt-1 text-xs text-muted-foreground">To: {selected.recipient || "(no address on file)"} · {selected.template} · <span className={`rounded-full px-1.5 py-0.5 font-semibold uppercase ${STATUS_BADGE[selected.status] ?? "bg-muted"}`}>{selected.status}</span> · {new Date(selected.created_at).toLocaleString()}</p>
              </div>
              <iframe title={`Preview: ${selected.subject}`} srcDoc={renderEmailHtml(selected)} className="mt-3 h-[560px] w-full rounded border border-border bg-background" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type EvaluationRow = { id: string; booking_id: string; role: "scholar" | "mentor"; ratings: number[]; continue_text: string | null; stop_text: string | null; start_text: string | null; extra_text: string | null; comments_text: string | null; created_at: string };

function LegalContentEditor() {
  const qc = useQueryClient();
  const docs = useQuery({
    queryKey: ["admin", "legal_documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("legal_documents").select("*").order("key");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [editing, setEditing] = useState<{ key: string; title: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!editing) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("legal_documents").update({ title: editing.title, body: editing.body }).eq("key", editing.key);
    setBusy(false);
    if (error) return setErr(error.message);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin", "legal_documents"] });
    notify("Saved.", "success");
  }

  return (
    <div>
      <div className="border-b border-border bg-background px-6 py-6 text-foreground">
        <h1 className="text-2xl font-medium">Legal Content</h1>
        <p className="mt-1 text-sm text-muted-foreground">Edit the text shown on /legal and in the indemnity signing flow directly — no code change needed. Use "## Heading" on its own line for a section heading; leave a blank line between paragraphs.</p>
      </div>
      <div className="bg-background px-6 py-6 text-foreground">
        {editing ? (
          <div className="space-y-3">
            <label className="block text-sm">Title
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none" />
            </label>
            <label className="block text-sm">Body
              <textarea rows={20} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} className="mt-1 w-full rounded border border-input bg-transparent p-2 font-mono text-xs outline-none" />
            </label>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <div className="flex gap-2">
              <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        ) : docs.isLoading ? <p>Loading…</p> : (
          <div className="space-y-2">
            {docs.data?.map((d) => (
              <div key={d.key} className="flex items-center justify-between rounded border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">Updated {new Date(d.updated_at).toLocaleDateString()}</p>
                </div>
                <Button variant="outline" onClick={() => setEditing({ key: d.key, title: d.title, body: d.body })}>Edit</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Evaluations() {
  const evals = useQuery({
    queryKey: ["admin", "evaluations"],
    queryFn: async () => ((await supabase.from("evaluations").select("*").order("created_at", { ascending: false })).data ?? []) as EvaluationRow[],
  });
  const bookingIds = useMemo(() => [...new Set((evals.data ?? []).map((e) => e.booking_id))], [evals.data]);
  const bookings = useQuery({
    queryKey: ["admin", "evaluations-bookings", bookingIds],
    enabled: bookingIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("id, career, company, shadow_date").in("id", bookingIds);
      return new Map((data ?? []).map((b) => [b.id, b]));
    },
  });

  return (
    <div>
      <div className="border-b border-border bg-background px-6 py-6 text-foreground"><h1 className="text-2xl font-medium">Evaluations {!evals.isLoading && `(${evals.data?.length ?? 0})`}</h1></div>
      <div className="bg-background px-6 py-6 text-foreground">
        {evals.isLoading ? <p>Loading…</p> : (evals.data?.length ?? 0) === 0 ? <p>No evaluations submitted yet.</p> : (
          <div className="space-y-2">
            {evals.data!.map((e) => {
              const b = bookings.data?.get(e.booking_id);
              const avg = e.ratings.length ? (e.ratings.reduce((a, c) => a + c, 0) / e.ratings.length).toFixed(1) : "—";
              return (
                <details key={e.id} className="rounded-lg border border-border bg-background/10 p-3 text-sm">
                  <summary className="cursor-pointer">
                    <strong>{e.role === "mentor" ? "Host" : "Scholar"} evaluation</strong> — {b ? `${b.career} at ${b.company}, ${b.shadow_date}` : `booking #${e.booking_id}`} · avg rating {avg}/6 · {new Date(e.created_at).toLocaleDateString()}
                  </summary>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">Ratings: {e.ratings.join(", ")}</p>
                    {e.continue_text && <p><strong>Continue:</strong> {e.continue_text}</p>}
                    {e.stop_text && <p><strong>Stop:</strong> {e.stop_text}</p>}
                    {e.start_text && <p><strong>Start:</strong> {e.start_text}</p>}
                    {e.extra_text && <p><strong>Additional:</strong> {e.extra_text}</p>}
                    {e.comments_text && <p><strong>Comments:</strong> {e.comments_text}</p>}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const BOOKING_STATUS_LABELS: Record<string, string> = { awaiting_payment: "Awaiting payment", indemnity_required: "Paid – indemnity needed", confirmed: "Confirmed", completed: "Completed", cancelled: "Cancelled" };



function ProviderDirectory({ kind }: { kind: "mentor" | "host" }) {
  const qc = useQueryClient();
  const config = TABLES.find((entry) => entry.id === "companies")!;
  const data = useQuery({ queryKey: ["admin", "companies", false], queryFn: () => fetchAllRows(async (from, to) => { const result = await supabase.from("companies").select("*").order("id", { ascending: false }).range(from, to); if (result.error) throw result.error; return result.data ?? []; }) });
  const [search, setSearch] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const [open, setOpen] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const all = data.data ?? [];
  const groups = providerGroups(all).filter((group) => group.kind === kind).sort((a, b) => (kind === 'mentor' ? a.names[0] || a.company : a.company).localeCompare(kind === 'mentor' ? b.names[0] || b.company : b.company));
  const initial = (group: typeof groups[number]) => alphabetInitial(kind === 'mentor' ? group.names[0] || group.company : group.company);
  const matches = groups.filter((group) => (!letter || initial(group) === letter) && (!search.trim() || [group.company, ...group.names, ...group.emails, ...group.careers].join(' ').toLowerCase().includes(search.trim().toLowerCase())));
  const detail = groups.find((group) => group.key === selected);
  const refresh = () => { setEditing(null); setCreating(false); void qc.invalidateQueries({ queryKey: ['admin', 'companies'] }); void qc.invalidateQueries({ queryKey: ['admin', 'company-contact-classification'] }); };
  async function remove(record: Record<string, unknown>) {
    if (!(await confirmAction('Delete this placement record? Other placements and contact records are kept.', { danger: true, confirmLabel: 'Delete placement' }))) return;
    const result = await supabase.from('companies').delete().eq('id', Number(record['id']));
    if (result.error) return setErr(result.error.message); refresh();
  }
  if (editing) return <EditRecord title="Companies" table="companies" cols={config.cols} row={editing} onDone={refresh} onCancel={() => setEditing(null)} />;
  if (creating) return <CreateRole onDone={refresh} onCancel={() => setCreating(false)} />;
  return <section className="bg-ivory">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5"><h1 className="text-2xl font-medium">{kind === 'mentor' ? 'Mentors' : 'Hosts'} ({groups.length})</h1><div className="flex gap-2"><Button onClick={() => setCreating(true)}>Add placement</Button><Button variant="outline" disabled={data.isPending || !!data.error} onClick={() => exportCsv('Company contacts full', completeExportColumns(config.cols, all), all)}>Export all</Button></div></div>
    <div className="space-y-3 px-4 py-3"><div className="flex flex-wrap gap-1.5" aria-label="Filter providers alphabetically">{['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map((ch) => <button key={ch} disabled={ch !== 'All' && !groups.some((group) => initial(group) === ch)} aria-pressed={ch === 'All' ? !letter : letter === ch} onClick={() => { setLetter(ch === 'All' ? null : ch); setOpen(ch === 'All' ? [] : [ch]); }} className={'rounded-full px-2.5 py-1.5 text-xs font-medium uppercase transition disabled:opacity-30 ' + ((ch === 'All' ? !letter : letter === ch) ? 'bg-primary text-primary-foreground' : 'bg-muted/70 text-foreground hover:bg-teal/20')}>{ch}</button>)}</div>
    <label className="block max-w-sm text-sm">Search<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, company, email or career" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></label>
    {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
    {data.isPending ? <p className="py-4 text-sm">Loading…</p> : data.error ? <p role="alert" className="py-4 text-sm text-destructive">Unable to load contact records.</p> : <Accordion type="multiple" value={open} onValueChange={setOpen} className="border-t border-border">{[...new Set(matches.map(initial))].sort().map((ch) => <AccordionItem key={ch} value={ch}><AccordionTrigger className="px-3 py-3 text-sm hover:no-underline hover:bg-muted/30"><span className="font-bold text-primary">{ch}</span>&nbsp;<span className="text-muted-foreground">({matches.filter((group) => initial(group) === ch).length})</span></AccordionTrigger><AccordionContent className="pb-0"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead><tr>{[kind === 'mentor' ? 'Mentor' : 'Company', kind === 'mentor' ? 'Company' : 'Mentors', 'Email', 'Careers', 'Actions'].map((heading) => <th key={heading} className="px-3 py-2 font-normal">{heading}</th>)}</tr></thead><tbody>{matches.filter((group) => initial(group) === ch).map((group) => <tr key={group.key} className="border-t border-warm-divider hover:bg-teal/5"><td className="px-3 py-2 font-medium">{kind === 'mentor' ? group.names.join(' · ') || 'Name not recorded' : group.company}</td><td className="max-w-64 truncate px-3 py-2" title={kind === 'mentor' ? group.company : group.names.join(', ')}>{kind === 'mentor' ? group.company : group.names.join(', ') || 'Name not recorded'}</td><td className="max-w-64 truncate px-3 py-2" title={group.emails.join(', ')}>{group.emails.join(', ') || 'Not recorded'}</td><td className="px-3 py-2">{group.careers.length}</td><td className="px-3 py-2"><button onClick={() => setSelected(group.key)} className="whitespace-nowrap rounded border border-border px-2 py-1">View / edit</button></td></tr>)}</tbody></table></div></AccordionContent></AccordionItem>)}{!matches.length && <p className="py-4 text-sm text-muted-foreground">No matching contact records.</p>}</Accordion>}
    </div>
    <Sheet open={!!detail} onOpenChange={(value) => { if (!value) setSelected(null); }}><SheetContent className="w-full overflow-y-auto bg-ivory sm:max-w-xl"><SheetHeader><SheetTitle>{detail?.company}</SheetTitle><SheetDescription>{kind === 'mentor' ? 'Individual mentor and linked placements' : 'Host company and contributing mentors'}</SheetDescription></SheetHeader>{detail && <div className="mt-4 space-y-4"><p className="text-sm">{detail.names.join(' · ')}</p><p className="break-words text-xs text-muted-foreground">{detail.emails.join(', ')}</p>{detail.records.map((record) => <details key={String(record['id'])} className="rounded border border-border p-3"><summary className="cursor-pointer text-sm font-medium">{String(record['career'] || 'Placement')} · {String(record['location'] || 'Location not recorded')}</summary><div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => { setSelected(null); setEditing(record); }}>Edit placement</Button><Button variant="outline" onClick={() => void remove(record)}>Delete placement</Button></div><dl className="mt-3 space-y-3 text-xs">{Object.entries(record).map(([key, value]) => <div key={key}><dt className="text-muted-foreground">{key.replaceAll('_', ' ')}</dt><dd className="mt-1 whitespace-pre-wrap break-words">{value == null ? 'Not recorded' : typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl></details>)}</div>}</SheetContent></Sheet>
  </section>;
}

function CompaniesList({ kind }: { kind?: "mentor" | "host" } = {}) {
  const config = TABLES.find((entry) => entry.id === "companies")!;
  return <DataTable title={kind === "mentor" ? "Mentor records" : kind === "host" ? "Host company records" : config.singular} table={config.table} cols={config.cols} companyKind={kind} />;
}

function CompanyPlacements() {
  return <Tabs defaultValue="host" className="bg-ivory">
    <div className="overflow-x-auto border-b border-border bg-ivory px-6 py-4"><TabsList aria-label="Company placements"><TabsTrigger value="host">Hosts</TabsTrigger><TabsTrigger value="mentor">Mentors</TabsTrigger></TabsList></div>
    <TabsContent value="host" className="mt-0"><ProviderDirectory kind="host" /></TabsContent>
    <TabsContent value="mentor" className="mt-0"><ProviderDirectory kind="mentor" /></TabsContent>
  </Tabs>;
}

function CareersAndSectors() {
  return <Tabs defaultValue="sectors" className="bg-ivory">
    <AdminScreenHeader title="Career Management" />
    <div className="overflow-x-auto border-b border-border bg-ivory px-6 py-4"><TabsList aria-label="Career management"><TabsTrigger value="sectors">Sectors</TabsTrigger><TabsTrigger value="careers">Careers</TabsTrigger></TabsList></div>
    {(["sectors", "careers"] as const).map((id) => { const config = TABLES.find((entry) => entry.id === id)!; return <TabsContent key={id} value={id} className="mt-0"><DataTable title={config.singular} table={config.table} cols={config.cols} csvUpload /></TabsContent>; })}
  </Tabs>;
}

function ApplicationsScreen() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const refresh = () => { setEditing(null); void qc.invalidateQueries({ queryKey: ["admin", "combined-applications"] }); void qc.invalidateQueries({ queryKey: ["admin", "accounts"] }); };
  async function remove(row: Record<string, unknown>) {
    if (!(await confirmAction("Delete this imported application? The user account and any live bookings are kept.", { danger: true, confirmLabel: "Delete application" }))) return;
    const result = await supabase.from("legacy_applications").delete().eq("id", Number(row["id"]));
    if (result.error) return notify(result.error.message, "error");
    refresh();
  }
  return editing ? <ApplicationEditPanel table="legacy_applications" row={editing} onDone={refresh} onCancel={() => setEditing(null)} /> : <ApplicationsList onEditImported={setEditing} onDeleteImported={remove} />;
}

function AdminReports() {
  return <div className="bg-background">
    <AdminScreenHeader title="Reports" />
    <Tabs defaultValue="bookings">
      <div className="overflow-x-auto border-b border-border bg-ivory px-6 py-4"><TabsList aria-label="Admin reports" className="justify-start">{["Bookings", "Evaluations", "Vouchers", "BEE / CPD", "Mentor Coverage", "Activity Log", "Token Ledger"].map((label) => <TabsTrigger key={label} value={label.toLowerCase().replaceAll(' / ', '-').replaceAll(' ', '-')}>{label}</TabsTrigger>)}</TabsList></div>
      <TabsContent value="bookings" className="mt-0"><LiveBookings /></TabsContent>
      <TabsContent value="evaluations" className="mt-0"><Evaluations /></TabsContent>
      <TabsContent value="vouchers" className="mt-0"><VoucherReport /></TabsContent>
      <TabsContent value="bee-cpd" className="mt-0"><BeeCpdReports /></TabsContent>
      <TabsContent value="mentor-coverage" className="mt-0"><MentorCoverageReport /></TabsContent>
      <TabsContent value="activity-log" className="mt-0"><AdminLedgerReport table="activity_log" /></TabsContent>
      <TabsContent value="token-ledger" className="mt-0"><AdminLedgerReport table="ai_token_ledger" /></TabsContent>
    </Tabs>
  </div>;
}

function MentorCoverageReport() {
  const companies = useQuery({
    queryKey: ["admin", "mentor-coverage"],
    queryFn: async () => {
      const result = await supabase.from("companies").select("career, active, dates");
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });
  const [filter, setFilter] = useState<"all" | "zero" | "inactive">("zero");
  const rows = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const hasOpenDates = (dates: string | null) => (dates ?? "").split(",").some((d) => { const [m, day, y] = d.trim().split("/").map(Number); return m && day && y && new Date(y, m - 1, day) >= today; });
    return ROLE_TITLES.map((career) => {
      const forCareer = (companies.data ?? []).filter((c) => (c.career ?? "").trim().toLowerCase() === career.trim().toLowerCase());
      const availableNow = forCareer.filter((c) => c.active && hasOpenDates(c.dates)).length;
      return { career, total: forCareer.length, availableNow };
    }).sort((a, b) => a.availableNow - b.availableNow || a.total - b.total || a.career.localeCompare(b.career));
  }, [companies.data]);
  const shown = rows.filter((r) => filter === "all" ? true : filter === "zero" ? r.total === 0 : r.availableNow === 0);
  return (
    <div className="bg-background p-6">
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">Careers the public Careers page shows as "0 of 5 mentors available" so the site never looks empty — this view shows the real picture so you know exactly where mentor recruitment is needed. "No mentors at all" means zero companies have ever been registered for that career; "Registered, not currently available" means a company exists but is inactive or has no open dates right now.</p>
      <div role="group" aria-label="Filter by coverage" className="mb-4 flex flex-wrap gap-1.5">
        {([["zero", "No mentors at all"], ["inactive", "Not currently available"], ["all", "All careers"]] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${filter === key ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}>{label}</button>)}
      </div>
      {companies.isPending ? <p>Loading…</p> : companies.error ? <p role="alert" className="text-destructive">{companies.error.message}</p> : (
        <table className="w-full max-w-2xl text-left text-sm">
          <thead><tr><th className="border-b border-border py-2 font-medium">Career</th><th className="border-b border-border py-2 font-medium">Registered mentors</th><th className="border-b border-border py-2 font-medium">Available now</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.career} className="border-b border-border">
                <td className="py-2">{r.career}</td>
                <td className="py-2">{r.total === 0 ? <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">No mentors at all</span> : r.total}</td>
                <td className="py-2">{r.total > 0 && r.availableNow === 0 ? <span className="rounded-full bg-accent/60 px-2 py-0.5 text-xs font-semibold">Not currently available</span> : r.availableNow}</td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={3} className="py-4 text-muted-foreground">No careers match this filter.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}

function BeeCpdReports() {
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const companies = useQuery({
    queryKey: ["admin", "bee-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("company, hr_email").order("company");
      if (error) throw new Error(error.message);
      // Group by hr_email: the companies table has one row per career/placement listing, so the
      // same real company (same HR contact) can have several rows — one entry per HR contact here.
      const byEmail = new Map<string, { company: string; hr_email: string }>();
      for (const c of data ?? []) {
        if (!c.hr_email) continue;
        const key = c.hr_email.toLowerCase();
        const existing = byEmail.get(key);
        if (!existing) byEmail.set(key, { company: c.company ?? "", hr_email: c.hr_email });
        else if (c.company && !existing.company.split(", ").includes(c.company)) existing.company = [...existing.company.split(", "), c.company].filter(Boolean).sort().join(", ");
      }
      return [...byEmail.values()].sort((a, b) => a.company.localeCompare(b.company));
    },
  });
  async function emailReport(hrEmail: string) {
    setSendingEmail(hrEmail);
    setSentEmail(null);
    const { error } = await supabase.rpc("email_company_bee_report", { _hr_email: hrEmail });
    setSendingEmail(null);
    if (error) return notify(error.message);
    setSentEmail(hrEmail);
  }
  return <div className="p-6">
    <p className="text-sm text-muted-foreground">Sends each company's HR contact a B-BBEE Skills Development / CSI report of the job shadows they've hosted, with the demographic breakdown needed to claim CPD points and CSI spend credit. Companies can also view and export this themselves at <code>/company-report</code> once signed in with their HR email.</p>
    <div className="mt-4 overflow-x-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-track]:bg-muted">
      <table className="w-full min-w-[600px] text-left text-xs">
        <thead><tr><th className="border-b border-border px-3 py-2 font-medium">Company</th><th className="border-b border-border px-3 py-2 font-medium">HR email</th><th className="border-b border-border px-3 py-2 font-medium">Action</th></tr></thead>
        <tbody>
          {companies.isPending ? <tr><td colSpan={3} className="p-4">Loading…</td></tr> : (companies.data ?? []).map((c) => (
            <tr key={c.hr_email} className="border-b border-border/60">
              <td className="px-3 py-2">{c.company}</td>
              <td className="px-3 py-2">{c.hr_email || "—"}</td>
              <td className="px-3 py-2">
                <Button variant="outline" size="sm" disabled={!c.hr_email || sendingEmail === c.hr_email} onClick={() => emailReport(c.hr_email)}>
                  {sendingEmail === c.hr_email ? "Sending…" : sentEmail === c.hr_email ? "Sent" : "Email report"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>;
}

function VoucherReport() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const qc = useQueryClient();
  const refresh = () => { setEditing(null); void qc.invalidateQueries({ queryKey: ["admin", "voucher-report"] }); void qc.invalidateQueries({ queryKey: ["admin", "vouchers"] }); };
  async function removeVoucher(row: Record<string, unknown>) {
    if (!(await confirmAction("Delete this voucher? Existing bookings keep their recorded discount.", { danger: true, confirmLabel: "Delete voucher" }))) return;
    const result = await supabase.from("vouchers").delete().eq("id", Number(row["id"]));
    if (result.error) return notify(result.error.message, "error");
    refresh();
  }
  const report = useQuery({
    queryKey: ["admin", "voucher-report"],
    queryFn: async () => {
      const [vouchers, bookings] = await Promise.all([
        fetchAllRows(async (from, to) => { const result = await supabase.from("vouchers").select("*").order("id").range(from, to); if (result.error) throw result.error; return result.data ?? []; }),
        fetchAllRows(async (from, to) => { const result = await supabase.from("bookings").select("id, voucher_code, paid_at, status").order("id").range(from, to); if (result.error) throw result.error; return result.data ?? []; }),
      ]);
      return vouchers.map((voucher) => {
        const code = String(voucher["code"] ?? "").trim().toLowerCase();
        const uses = code ? bookings.filter((booking) => String(booking["voucher_code"] ?? "").trim().toLowerCase() === code) : [];
        return { ...voucher, bookings: uses.length, paid_bookings: uses.filter((booking) => !!booking["paid_at"]).length, cancelled_bookings: uses.filter((booking) => ["cancelled", "canceled"].includes(String(booking["status"]))).length };
      });
    },
  });
  const columns: Col[] = [{ key: "name", label: "Name" }, { key: "code", label: "Code" }, { key: "discount", label: "Discount" }, { key: "available_from", label: "From" }, { key: "available_until", label: "Until" }, { key: "usage_limit", label: "Usage limit" }, { key: "bookings", label: "All bookings" }, { key: "paid_bookings", label: "Paid bookings" }, { key: "cancelled_bookings", label: "Cancelled bookings" }];
  const all = (report.data ?? []) as Record<string, unknown>[];
  const rows = all.filter((row) => [row["name"], row["code"]].some((value) => String(value ?? "").toLowerCase().includes(search.toLowerCase().trim())));
  return <section className="bg-ivory p-6">
    {editing && <VoucherEditor voucher={editing} known={all} onDone={refresh} onCancel={() => setEditing(null)} />}
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-2xl">Vouchers ({rows.length})</h2><Button disabled={report.isPending || !!report.error} onClick={() => setEditing({})}>Add voucher</Button><Button disabled={report.isPending || !!report.error} onClick={() => exportCsv("Voucher report", completeExportColumns(columns, all), all)} variant="outline">Export all</Button></div>
    <label className="mt-4 block max-w-sm text-sm">Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Voucher name or code" className="mt-1 w-full rounded border border-input bg-background px-3 py-2" /></label>
    <p className="mt-2 text-xs text-muted-foreground">Counts include all matching bookings; paid and cancelled counts are shown separately.</p>
    <div className="mt-4 overflow-x-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-track]:bg-muted"><table className="w-full min-w-[850px] text-left text-xs"><thead><tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap border-b border-border px-3 py-2 font-medium">{column.label}</th>)}<th className="px-3 py-2 font-medium">Actions</th></tr></thead><tbody>
      {report.isPending ? <tr><td colSpan={columns.length + 1} className="p-4">Loading…</td></tr> : report.error ? <tr><td colSpan={columns.length + 1} role="alert" className="p-4 text-destructive">{report.error.message}</td></tr> : !rows.length ? <tr><td colSpan={columns.length + 1} className="p-4">No vouchers match this search.</td></tr> : rows.map((row) => <tr key={String(row["id"])}>{columns.map((column) => <td key={column.key} className="border-b border-border px-3 py-2">{fmtCell(row[column.key]) || '—'}</td>)}<td className="px-3 py-2"><div className="flex gap-2"><button onClick={() => setEditing(row)} aria-label={'Edit voucher ' + String(row['code'] ?? row['id'])} className="rounded border border-border px-2 py-1">Edit</button><button onClick={() => void removeVoucher(row)} aria-label={'Delete voucher ' + String(row['code'] ?? row['id'])} className="rounded px-2 py-1 text-destructive">Delete</button></div></td></tr>)}
    </tbody></table></div>
  </section>;
}

function LiveBookings() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const bookings = useQuery({
    queryKey: ["admin", "live-bookings"],
    queryFn: async () => {
      const b = await fetchAllRows(async (from, to) => {
        const { data, error } = await supabase.from("bookings").select("*").order("created_at", { ascending: false }).range(from, to);
        if (error) throw error;
        return data ?? [];
      });
      const [{ data: profiles }, { data: companies }] = await Promise.all([
        supabase.from("scholar_profiles").select("user_id, full_name, contact_no, id_number, school, career_interests, dietary, guardian_name, guardian_contact, guardian_email"),
        supabase.from("companies").select("id, mentor_name, mentor_position, mentor_phone, mentor_email, hr_contact_name, hr_contact_phone, hr_contact_email"),
      ]);
      const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      const byCompany = new Map((companies ?? []).map((c) => [c.id, c]));
      return b.map((row) => {
        const p = byUser.get(row["user_id"] as string);
        const c = byCompany.get(row["company_id"] as number);
        return {
          ...row,
          student_name: p?.full_name ?? "", student_contact: p?.contact_no ?? "", student_id_number: p?.id_number ?? "",
          student_school: p?.school ?? "", student_career_interests: p?.career_interests ?? "", student_dietary: p?.dietary ?? "",
          guardian_name: p?.guardian_name ?? "", guardian_contact: p?.guardian_contact ?? "", guardian_email: p?.guardian_email ?? "",
          mentor_name: c?.mentor_name ?? "", mentor_position: c?.mentor_position ?? "", mentor_phone: c?.mentor_phone ?? "", mentor_email: c?.mentor_email ?? "",
          hr_contact_name: c?.hr_contact_name ?? "", hr_contact_phone: c?.hr_contact_phone ?? "", hr_contact_email: c?.hr_contact_email ?? "",
          indemnity_received: row["indemnity_received"] ? "Received" : "Outstanding",
          paid_at: row["paid_at"] ? "Paid" : "Not paid",
        } as Record<string, unknown>;
      });
    },
  });

  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (bookings.data ?? []).filter((r) => {
      if (status && r["status"] !== status) return false;
      if (!s) return true;
      return ["student_name", "career", "company", "mentor_name", "hr_contact_name", "shadow_date"].some((k) => String(r[k] ?? "").toLowerCase().includes(s));
    });
  }, [bookings.data, q, status]);

  function exportCsvNow() {
    setExporting(true);
    try {
      const csv = toCsv(BOOKING_EXPORT_COLS, bookings.data ?? []);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "bookings.csv"; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-6 py-6 text-foreground">
        <h1 className="text-2xl font-medium">Bookings {!bookings.isLoading && `(${rows.length})`}</h1>
        <Button onClick={exportCsvNow} disabled={bookings.isLoading || exporting} className="rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-sm font-medium uppercase text-foreground">{exporting ? "Exporting…" : "Export CSV"}</Button>
      </div>
      <div className="bg-background px-6 py-6 text-foreground">
        <div className="flex flex-wrap items-end gap-6">
          <label className="block max-w-sm text-sm">
            Search
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Student, career, company, mentor, HR, date" className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none" />
          </label>
          <div role="group" aria-label="Filter bookings by status" className="flex flex-wrap gap-1.5">
            {[["", "All"], ...Object.entries(BOOKING_STATUS_LABELS)].map(([key, label]) => <button key={key} type="button" aria-pressed={status === key} onClick={() => setStatus(key!)} className={"rounded-full border px-3 py-1.5 text-xs font-medium transition " + (status === key ? "border-primary bg-primary text-primary-foreground" : "border-border bg-ivory text-foreground hover:bg-teal/15")}>
              {label} <span className="ml-1 opacity-70">{(bookings.data ?? []).filter((booking) => !key || booking["status"] === key).length}</span>
            </button>)}
          </div>
        </div>
        <div className="mt-6 overflow-x-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-track]:bg-muted">
          <table className="w-full min-w-[1100px] text-left text-xs">
            <thead>
              <tr className="border-b border-border font-medium">
                {["Date", "Status", "Career", "Company", "Student", "School", "Mentor", "HR contact"].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {bookings.isLoading ? (
                <tr><td className="px-3 py-4" colSpan={8}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-4" colSpan={8}>No bookings found.</td></tr>
              ) : rows.map((r) => (
                <tr key={String(r["id"])} className="border-b border-warm-divider">
                  <td className="whitespace-nowrap px-3 py-2">{String(r["shadow_date"])}</td>
                  <td className="whitespace-nowrap px-3 py-2">{BOOKING_STATUS_LABELS[String(r["status"])] ?? String(r["status"])}</td>
                  <td className="px-3 py-2">{String(r["career"] ?? "")}</td>
                  <td className="px-3 py-2">{String(r["company"] ?? "")}</td>
                  <td className="px-3 py-2">{String(r["student_name"] ?? "")}</td>
                  <td className="px-3 py-2">{String(r["student_school"] ?? "")}</td>
                  <td className="px-3 py-2">{String(r["mentor_name"] ?? "")}</td>
                  <td className="px-3 py-2">{String(r["hr_contact_name"] ?? "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type BookingSettingsRow = {
  min_lead_days: number; blackout_dates: string[] | null; public_holidays: string[] | null; no_availability_message: string;
  max_advance_days: number; documentation_deadline_days: number; cancellation_cutoff_days: number;
  reschedule_allowed: boolean; reschedule_min_notice_days: number; max_pending_requests: number;
  waitlist_expiry_hours: number; request_expiry_hours: number;
  scholar_reminder_days: number[]; mentor_reminder_days: number[];
  season_start_month: number; season_end_month: number;
};

function parseUsDate(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  return Number.isNaN(d.getTime()) ? null : d;
}
function toUsDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/** Replaces the old comma-separated "MM/DD/YYYY, MM/DD/YYYY" dates field with a calendar
 * multi-select, so admins/hosts can pick available dates instead of typing them. Stores and
 * reads the same comma-separated string format other code (booking flow, triggers) expects. */
function DatesPicker({ value, onChange, allowWeekends = true, allowOffSeason = true }: { value: string; onChange: (v: string) => void; allowWeekends?: boolean; allowOffSeason?: boolean }) {
  const dates = value.split(",").map((s) => s.trim()).filter(Boolean).map(parseUsDate).filter((d): d is Date => d !== null);
  const holidays = useQuery({ queryKey: ["public-holidays"], queryFn: async () => ((await supabase.rpc("get_public_holidays")).data ?? []) as string[], staleTime: 60 * 60_000 });
  const holidaySet = new Set((holidays.data ?? []).map((h) => parseUsDate(h)?.toDateString()).filter(Boolean));
  const season = useQuery({ queryKey: ["season-window"], queryFn: async () => ((await supabase.rpc("get_season_window")).data ?? [])[0] ?? { season_start_month: 1, season_end_month: 12 }, staleTime: 60 * 60_000 });
  function set(next: Date[]) {
    onChange(next.map(toUsDate).join(", "));
  }
  const disabledMatchers = [
    { before: new Date() },
    (d: Date) => holidaySet.has(d.toDateString()),
    ...(allowWeekends ? [] : [(d: Date) => d.getDay() === 0 || d.getDay() === 6]),
    ...(allowOffSeason ? [] : [(d: Date) => { const m = d.getMonth() + 1; return m < (season.data?.season_start_month ?? 1) || m > (season.data?.season_end_month ?? 12); }]),
  ];
  return (
    <div className="flex flex-wrap items-start gap-4">
      <Calendar mode="multiple" selected={dates} onSelect={(d) => set(d ?? [])} disabled={disabledMatchers} className="rounded-md border border-warm-divider bg-background" />
      <div className="flex flex-wrap gap-1.5">
        {dates.length === 0 && <span className="text-xs text-muted-foreground">No dates set.</span>}
        {dates.map((d, i) => (
          <span key={i} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
            {toUsDate(d)}
            <button type="button" onClick={() => set(dates.filter((_, idx) => idx !== i))} aria-label={`Remove ${toUsDate(d)}`} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
    </div>
  );
}

function SettingsFrame({ title, description, icon: Icon, tint = "bg-rose-100 text-rose-600", children }: { title: string; description: string; icon?: LucideIcon; tint?: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-lg border border-warm-divider bg-ivory"><header className="flex items-start gap-3 border-b border-warm-divider px-5 py-4">{Icon && <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tint}`}><Icon className="h-4 w-4" /></span>}<span><h2 className="text-base font-medium">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{description}</p></span></header><div className="divide-y divide-warm-divider">{children}</div></section>;
}

function NumberField({ label, hint, value, onChange, suffix }: { label: string; hint?: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return <label className="grid items-start gap-4 px-5 py-5 text-sm md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.6fr)]">
    <span><span>{label}</span>{hint && <span className="mt-1 block max-w-xl text-xs text-muted-foreground">{hint}</span>}</span>
    <span className="flex items-center gap-2"><input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} className="min-w-0 w-20 border-b border-input bg-transparent px-1 py-1 outline-none" />{suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}</span>
  </label>;
}

function parseIntList(s: string): number[] {
  return [...new Set(s.split(",").map((v) => Number(v.trim())).filter((n) => Number.isFinite(n) && n >= 0))].sort((a, b) => b - a);
}

function PublicHolidayFetcher({ onFetched }: { onFetched: (dates: Date[]) => void }) {
  const lookup = useServerFn(lookupPublicHolidays);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [country, setCountry] = useState("ZA");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function fetchNow() {
    setBusy(true);
    setErr(null);
    try {
      const results = await lookup({ data: { year: Number(year), countryCode: country.trim() } });
      onFetched(results.map((h) => parseUsDate(h.date)).filter((d): d is Date => d !== null));
      notify(`Added ${results.length} public holiday${results.length === 1 ? "" : "s"} for ${country.toUpperCase()} ${year}.`, "success");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-3 rounded border border-warm-divider bg-background/50 p-3">
      <label className="text-xs">Year
        <input value={year} onChange={(e) => setYear(e.target.value)} className="mt-1 block w-20 border-b border-input bg-transparent px-1 py-1 text-sm outline-none" />
      </label>
      <label className="text-xs">Country code
        <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="ZA" className="mt-1 block w-20 border-b border-input bg-transparent px-1 py-1 text-sm uppercase outline-none" />
      </label>
      <button type="button" onClick={fetchNow} disabled={busy} className="rounded-md bg-teal/20 hover:bg-teal/30 px-3 py-1.5 text-xs font-medium uppercase text-foreground disabled:opacity-50">{busy ? "Fetching…" : "Fetch holidays"}</button>
      {err && <p className="w-full text-xs text-destructive">{err}</p>}
      <p className="w-full text-xs text-muted-foreground">Looks up the official public holiday list live (date.nager.at) — nothing is hardcoded. Remember to click Save below.</p>
    </div>
  );
}

const NOT_ENFORCED_HINT = "Stored, but not yet enforced anywhere in the app — that needs a workflow (host response tracking, waitlist, or self-service cancel/reschedule) this project doesn't have yet.";

export function BookingSettings() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["admin", "booking_settings"],
    queryFn: async () => (await supabase.from("booking_settings").select("*").eq("id", 1).single()).data as BookingSettingsRow | null,
  });
  const [v, setV] = useState<Record<string, string>>({});
  const [blackoutDates, setBlackoutDates] = useState<Date[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<Date[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    const s = settings.data;
    setV({
      min_lead_days: String(s.min_lead_days), max_advance_days: String(s.max_advance_days),
      documentation_deadline_days: String(s.documentation_deadline_days), request_expiry_hours: String(s.request_expiry_hours),
      cancellation_cutoff_days: String(s.cancellation_cutoff_days), reschedule_min_notice_days: String(s.reschedule_min_notice_days),
      waitlist_expiry_hours: String(s.waitlist_expiry_hours), max_pending_requests: String(s.max_pending_requests),
      no_availability_message: s.no_availability_message ?? "",
      scholar_reminder_days: (s.scholar_reminder_days ?? []).join(", "),
      mentor_reminder_days: (s.mentor_reminder_days ?? []).join(", "),
      season_start_month: String(s.season_start_month), season_end_month: String(s.season_end_month),
    });
    setBlackoutDates((s.blackout_dates ?? []).map(parseUsDate).filter((d): d is Date => d !== null));
    setPublicHolidays((s.public_holidays ?? []).map(parseUsDate).filter((d): d is Date => d !== null));
  }, [settings.data]);

  const f = (key: string) => v[key] ?? "";
  const set = (key: string) => (val: string) => setV((cur) => ({ ...cur, [key]: val }));

  async function save() {
    setBusy(true);
    setErr(null);
    setSaved(false);
    const { error } = await supabase.from("booking_settings").update({
      min_lead_days: Number(f("min_lead_days")) || 0,
      max_advance_days: Number(f("max_advance_days")) || 0,
      documentation_deadline_days: Number(f("documentation_deadline_days")) || 0,
      request_expiry_hours: Number(f("request_expiry_hours")) || 0,
      cancellation_cutoff_days: Number(f("cancellation_cutoff_days")) || 0,
      reschedule_min_notice_days: Number(f("reschedule_min_notice_days")) || 0,
      waitlist_expiry_hours: Number(f("waitlist_expiry_hours")) || 0,
      max_pending_requests: Number(f("max_pending_requests")) || 0,
      scholar_reminder_days: parseIntList(f("scholar_reminder_days")),
      mentor_reminder_days: parseIntList(f("mentor_reminder_days")),
      season_start_month: Number(f("season_start_month")) || 1,
      season_end_month: Number(f("season_end_month")) || 12,
      blackout_dates: blackoutDates.map(toUsDate),
      public_holidays: publicHolidays.map(toUsDate),
      no_availability_message: f("no_availability_message"),
    }).eq("id", 1);
    setBusy(false);
    if (error) return setErr(error.message);
    setSaved(true);
    qc.invalidateQueries({ queryKey: ["admin", "booking_settings"] });
    qc.invalidateQueries({ queryKey: ["booking-settings"] });
  }

  const sectionClass = "space-y-5 text-foreground";
  const tabTriggerClass = (color: string) => `rounded-md px-5 py-2.5 font-display text-sm uppercase data-[state=inactive]:opacity-60 ${color}`;

  return (
    <div>
      <AdminScreenHeader title="Booking Settings" />
      <div className="w-full space-y-3 bg-background px-6 py-6 text-foreground">
        <Tabs defaultValue="rules" className="w-full">
          <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger value="rules" className={tabTriggerClass(BAND_COLORS[0]!)}>Booking Rules</TabsTrigger>
            <TabsTrigger value="docs" className={tabTriggerClass(BAND_COLORS[1]!)}>Documentation &amp; Approval</TabsTrigger>
            <TabsTrigger value="cancel" className={tabTriggerClass(BAND_COLORS[2]!)}>Cancellations &amp; Waitlists</TabsTrigger>
            <TabsTrigger value="notify" className={tabTriggerClass(BAND_COLORS[3]!)}>Notifications &amp; Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className={sectionClass + " mt-6"}>
              <SettingsFrame title="Scheduling Windows &amp; Lead Times" description="Control how early or far in advance students can request shadow dates." icon={Clock} tint="bg-rose-100 text-rose-600">
              <NumberField label="Minimum request lead time" suffix="days before the shadow date" value={f("min_lead_days")} onChange={set("min_lead_days")} hint="The earliest a student may submit a booking request relative to the shadow date." />
              <NumberField label="Maximum advance booking window" suffix="days ahead" value={f("max_advance_days")} onChange={set("max_advance_days")} hint="How far into the future a student can request a shadow." />
              </SettingsFrame>
              <SettingsFrame title="Operating Season &amp; Request Caps" description="Define active placement months and concurrent student booking limits." icon={CalendarIcon} tint="bg-orange-100 text-orange-600">
              <div className="grid items-start gap-4 px-5 py-5 md:grid-cols-2">
                <div><p className="text-sm">Operating season range</p><p className="mt-1 text-xs text-muted-foreground">Placements run only within this month range unless a listing explicitly allows off-season dates.</p></div>
                <div className="space-y-4"><div className="grid grid-cols-2 gap-4">{([['season_start_month', 'Season starts'], ['season_end_month', 'Season ends']] as const).map(([key, label]) => <label key={key} className="text-xs">{label}<select value={f(key)} onChange={(e) => set(key)(e.target.value)} className="mt-1 block w-full border-b border-input bg-transparent px-1 py-1 text-sm outline-none">{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2020, i, 1).toLocaleString('en-ZA', { month: 'long' })}</option>)}</select></label>)}</div>
                <div><p className="mb-1 text-xs text-muted-foreground">Annual Season Preview</p><ol className="grid grid-cols-12 gap-1" aria-label="Annual season preview">{Array.from({ length: 12 }, (_, i) => { const m = i + 1, start = Number(f('season_start_month')), end = Number(f('season_end_month')); const active = m >= start && m <= end; const name = new Date(2020, i, 1).toLocaleString('en-ZA', { month: 'long' }); return <li key={m} title={name + (active ? ': Active' : ': Inactive')} aria-label={name + (active ? ': Active' : ': Inactive')} className={'rounded px-1 py-1 text-center text-xs ' + (active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{name[0]}</li>; })}</ol></div></div>
              </div>
              <NumberField label="Maximum pending requests per student" suffix="active requests" value={f("max_pending_requests")} onChange={set("max_pending_requests")} hint={NOT_ENFORCED_HINT} />
              </SettingsFrame>
              <SettingsFrame title="Blackout Dates &amp; Public Holidays" description="Block institutional dates and manage public holidays across all placements." icon={CalendarX} tint="bg-slate-100 text-slate-600">
              <div className="px-5 py-5">
                <p className="text-sm">Blackout dates <span className="text-xs text-muted-foreground">(no bookings allowed)</span></p>
                <div className="mt-2 flex items-center justify-between text-xs"><span>Blocked dates ({blackoutDates.length})</span><button type="button" disabled={!blackoutDates.length} onClick={() => setBlackoutDates([])} className="text-primary hover:underline disabled:opacity-50">Clear all</button></div>
                <div className="mt-2 flex flex-wrap items-start gap-4">
                  <Calendar mode="multiple" selected={blackoutDates} onSelect={(d) => setBlackoutDates(d ?? [])} classNames={{ root: "w-full", months: "relative flex w-full flex-col", day: "group/day relative h-10 w-full select-none p-0 text-center" }} className="rounded-md border border-warm-divider bg-background [&_button[data-day]]:aspect-auto [&_button[data-day]]:h-10 [&_[data-selected-single=true]]:bg-black [&_[data-selected-single=true]]:text-white [&_[data-selected-single=true]:hover]:bg-black [&_[data-selected-single=true]:hover]:text-white" />
                  <div className="flex flex-wrap gap-1.5">
                    {blackoutDates.length === 0 && <span className="text-xs text-muted-foreground">No blackout dates set.</span>}
                    {blackoutDates.map((d, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-full bg-black px-2.5 py-1 text-xs text-white">
                        {toUsDate(d)}
                        <button type="button" onClick={() => setBlackoutDates((cur) => cur.filter((_, idx) => idx !== i))} aria-label={`Remove ${toUsDate(d)}`} className="text-white/70 hover:text-destructive"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-5 py-5">
                <p className="text-sm">Public holidays <span className="text-xs text-muted-foreground">(always blocked, every placement, no override)</span></p>
                <PublicHolidayFetcher onFetched={(dates) => setPublicHolidays((cur) => {
                  const seen = new Set(cur.map((d) => d.toDateString()));
                  return [...cur, ...dates.filter((d) => !seen.has(d.toDateString()))];
                })} />
                <div className="mt-2 flex flex-wrap items-start gap-4">
                  <Calendar mode="multiple" selected={publicHolidays} onSelect={(d) => setPublicHolidays(d ?? [])} className="rounded-md border border-warm-divider bg-background" />
                  <div className="flex flex-wrap gap-1.5">
                    {publicHolidays.length === 0 && <span className="text-xs text-muted-foreground">No public holidays set.</span>}
                    {publicHolidays.map((d, i) => (
                      <span key={i} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                        {toUsDate(d)}
                        <button type="button" onClick={() => setPublicHolidays((cur) => cur.filter((_, idx) => idx !== i))} aria-label={`Remove ${toUsDate(d)}`} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              </SettingsFrame>
          </TabsContent>

          <TabsContent value="docs" className={sectionClass + " mt-6"}>
            <SettingsFrame title="Documentation & Approval" description="Manage paperwork deadlines and booking request expiry." icon={FileText} tint="bg-blue-100 text-blue-600">
              <NumberField label="Documentation deadline" suffix="days before the shadow date" value={f("documentation_deadline_days")} onChange={set("documentation_deadline_days")} hint="The latest all required paperwork (indemnities, consent) must be approved. Enforced as a floor under the minimum lead time above, so a request can't be made with too little time left to complete it." />
              <NumberField label="Booking request expiry" suffix="hours for a host to respond" value={f("request_expiry_hours")} onChange={set("request_expiry_hours")} hint={NOT_ENFORCED_HINT} />
            </SettingsFrame>
          </TabsContent>

          <TabsContent value="cancel" className={sectionClass + " mt-6"}>
            <SettingsFrame title="Cancellations & Waitlists" description="Configure cancellation, rescheduling and waitlist preferences." icon={RotateCcw} tint="bg-amber-100 text-amber-600">
              <NumberField label="Cancellation cut-off" suffix="days before the shadow date" value={f("cancellation_cutoff_days")} onChange={set("cancellation_cutoff_days")} hint={NOT_ENFORCED_HINT} />
              <NumberField label="Reschedule minimum notice" suffix="days ahead" value={f("reschedule_min_notice_days")} onChange={set("reschedule_min_notice_days")} hint={NOT_ENFORCED_HINT} />
              <NumberField label="Waitlist expiry" suffix="hours to respond to an offered place" value={f("waitlist_expiry_hours")} onChange={set("waitlist_expiry_hours")} hint={NOT_ENFORCED_HINT} />
            </SettingsFrame>
          </TabsContent>

          <TabsContent value="notify" className={sectionClass + " mt-6"}>
            <SettingsFrame title="Notifications & Messages" description="Manage availability messages and reminder timing." icon={Bell} tint="bg-violet-100 text-violet-600">
              <label className="block px-5 py-5 text-sm">
                "No mentors available" message <span className="text-xs text-muted-foreground">(shown on /roles and the booking wizard whenever nothing is bookable)</span>
                <textarea value={f("no_availability_message")} onChange={(e) => set("no_availability_message")(e.target.value)} className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none" />
              </label>
              <label className="block px-5 py-5 text-sm">
                Scholar reminders <span className="text-xs text-muted-foreground">(days before the shadow date, comma separated — e.g. "2, 1")</span>
                <input value={f("scholar_reminder_days")} onChange={(e) => set("scholar_reminder_days")(e.target.value)} placeholder="2, 1" className="mt-1 w-full max-w-xs border-b border-input bg-transparent px-1 py-1 outline-none" />
                <p className="mt-1 max-w-md text-xs text-muted-foreground">The lowest day (e.g. 1 = the day before) gets the packing-list wording (ID, signed indemnity form(s), questionnaire); any other day gets a general reminder.</p>
              </label>
              <label className="block px-5 py-5 text-sm">
                Host reminders <span className="text-xs text-muted-foreground">(days before the shadow date, comma separated)</span>
                <input value={f("mentor_reminder_days")} onChange={(e) => set("mentor_reminder_days")(e.target.value)} placeholder="1" className="mt-1 w-full max-w-xs border-b border-input bg-transparent px-1 py-1 outline-none" />
                <p className="mt-1 max-w-md text-xs text-muted-foreground">Every host reminder includes the stand-in / contact-manager notice.</p>
              </label>
            </SettingsFrame>
          </TabsContent>
        </Tabs>

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

function CompanyIndemnityUpload({ companyId, value, onChange }: { companyId: unknown; value: string; onChange: (text: string) => void }) {
  const extract = useServerFn(extractCompanyIndemnity);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    const path = `${companyId}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("company-indemnity").upload(path, file, { upsert: true });
    if (error) { setBusy(false); return setErr(error.message); }
    try {
      const { text } = await extract({ data: { companyId: Number(companyId), storagePath: path } });
      onChange(text);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sm:col-span-3">
      <label className="block text-sm">
        Company's own indemnity form
        <div className="mt-1 flex items-center gap-3">
          <input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} disabled={busy} className="text-xs" />
          {busy && <span className="text-xs text-muted-foreground">Reading document…</span>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">AI extracts the clauses below; they'll be signed alongside the standard JobShadow indemnity.</p>
      </label>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
      <textarea rows={6} value={value} onChange={(e) => onChange(e.target.value)} placeholder="No company indemnity uploaded yet." className="mt-2 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary" />
    </div>
  );
}

function EditRecord({ title, table, cols, row, onDone, onCancel }: { title: string; table: string; cols: Col[]; row: Record<string, unknown>; onDone: () => void; onCancel: () => void }) {
  const qc = useQueryClient();
  const [vals, setVals] = useState<Record<string, unknown>>(row);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const editable = cols.filter((c) => c.key !== "id" && !c.key.startsWith("_"));

  async function save() {
    setBusy(true);
    setErr(null);
    const patch = Object.fromEntries(Object.entries(vals).filter(([k]) => k !== "id" && !k.startsWith("_")));
    const { error } = await (supabase.from(table as "careers") as any).update(patch).eq("id", row["id"]);
    setBusy(false);
    if (error) return setErr(error.message);
    if (table === "careers") qc.invalidateQueries({ queryKey: ["public-career-content"] });
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
            ) : table === "companies" && c.key === "custom_indemnity_text" ? (
              <CompanyIndemnityUpload key={c.key} companyId={row["id"]} value={(vals[c.key] as string) ?? ""} onChange={(v) => setVals({ ...vals, custom_indemnity_text: v })} />
            ) : table === "companies" && c.key === "dates" ? (
              <div key={c.key} className="sm:col-span-3">
                <p className="text-sm">{c.label}</p>
                <div className="mt-2 flex gap-5">
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!vals["allow_weekends"]} onChange={(e) => setVals({ ...vals, allow_weekends: e.target.checked })} />Allow weekends</label>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!vals["allow_off_season"]} onChange={(e) => setVals({ ...vals, allow_off_season: e.target.checked })} />Allow Nov–Jan (off-season)</label>
                </div>
                <div className="mt-2">
                  <DatesPicker
                    value={(vals[c.key] as string) ?? ""}
                    onChange={(v) => setVals({ ...vals, dates: v })}
                    allowWeekends={!!vals["allow_weekends"]}
                    allowOffSeason={!!vals["allow_off_season"]}
                  />
                </div>
              </div>
            ) : table === "companies" && (c.key === "allow_weekends" || c.key === "allow_off_season") ? null
            : table === "companies" && c.key === "mode" ? (
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
        {table === "careers" && <CareerDescriptionField career={String(vals["name"] ?? "")} value={(vals["description"] as string) ?? ""} onChange={(v) => setVals({ ...vals, description: v })} skills={getCareerSkills(String(vals["name"] ?? ""), vals["school_skills"], vals["workplace_skills"])} onSkillsChange={(skills) => setVals((current) => ({ ...current, school_skills: skills.school, workplace_skills: skills.workplace }))} guidance={getCareerGuidance(String(vals["name"] ?? ""), String(vals["description"] ?? ""), vals)} onGuidanceChange={(patch) => setVals((current) => ({ ...current, ...patch }))} onDraft={(draft) => setVals((current) => ({ ...current, ...draft }))} />}
        {err && <p className="mt-4 text-sm font-medium">{err}</p>}
        <button onClick={save} disabled={busy} className="mt-6 rounded-md bg-teal/20 hover:bg-teal/30 px-5 py-2.5 text-sm font-medium uppercase text-foreground">Update</button>
      </div>
    </div>
  );
}

export function CareerDescriptionField({ career, value, onChange, skills, onSkillsChange, guidance, onGuidanceChange, onDraft }: { career: string; value: string; onChange: (v: string) => void; skills: { school: string[]; workplace: string[] }; onSkillsChange: (skills: { school: string[]; workplace: string[] }) => void; guidance: ReturnType<typeof getCareerGuidance>; onGuidanceChange: (patch: { ideal_for?: string; specialisations?: string[]; subjects?: string[] }) => void; onDraft: (draft: CareerDraft) => void }) {
  const draft = useServerFn(draftCareerDescription);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function suggest() {
    if (!career.trim()) return setErr("Enter the career name first.");
    setBusy(true); setErr(null);
    try { onDraft(await draft({ data: { career } })); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <div className="mt-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">Career Content</span>
        <button type="button" onClick={suggest} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium hover:border-primary hover:text-primary disabled:opacity-50">
          <Sparkles className="h-3.5 w-3.5" /> {busy ? "Writing…" : "AI wizard"}
        </button>
      </div>
      <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} placeholder="A brief description of this career" className="mt-1 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary" />
      {value && <div className="mt-2 rounded bg-muted/40 p-2 text-sm"><RichText text={value} /></div>}
      <fieldset className="mt-4 space-y-3"><legend className="text-sm font-semibold">Skills Required</legend>
        <p className="text-xs text-muted-foreground">Separate skills with commas. AI suggestions remain a draft until you click Update.</p>
        {([['school', 'School foundations'], ['workplace', 'Workplace skills']] as const).map(([key, label]) => <label key={key} className="block text-sm">{label}<input value={skills[key].join(', ')} onChange={(e) => onSkillsChange({ ...skills, [key]: e.target.value.split(',').map((skill) => skill.trimStart()) })} onBlur={() => onSkillsChange({ ...skills, [key]: skills[key].map((skill) => skill.trim()).filter(Boolean) })} className="mt-1 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary" /></label>)}
        <CareerSkills {...skills} />
      </fieldset>
      <div className="mt-4 space-y-4"><label className="block text-sm">Ideal for<textarea rows={3} value={guidance.idealFor} onChange={(e) => onGuidanceChange({ ideal_for: e.target.value })} className="mt-1 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary" /></label>
        {([['specialisations', 'Specialisations & Roles'], ['subjects', 'Suggested Subjects']] as const).map(([key, label]) => <label key={key} className="block text-sm">{label}<input value={guidance[key].join(', ')} onChange={(e) => onGuidanceChange({ [key]: e.target.value.split(',').map((value) => value.trimStart()) })} onBlur={() => onGuidanceChange({ [key]: guidance[key].map((value) => value.trim()).filter(Boolean) })} className="mt-1 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary" /></label>)}
      </div>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}
