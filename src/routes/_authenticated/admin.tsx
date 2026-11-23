import { ADMIN_NAV } from "@/components/RoleNavigation";
import { BulkCareerDrafts, type CareerBatchDrafts } from "@/components/BulkCareerDrafts";
import { careerContentForAI } from "@/lib/career-batch";
import { schoolDirectory } from "@/lib/school-directory";
import { SchoolsDirectory } from "@/components/SchoolsDirectory";
import { mentorAvailability } from "@/lib/mentor-availability";
import { fetchAllAccounts } from "@/lib/admin-accounts";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { providerGroups, mentorGroups } from "@/lib/provider-directory";
import { CareerGuidance } from "@/components/CareerGuidance";
import { getCareerGuidance } from "@/lib/career-guidance";
import {
  CAREER_DRAFT_FIELDS,
  missingCareerFields,
  careerDraftPatch,
  type CareerDraft,
} from "@/lib/career-draft";
import {
  individualMentorEmails,
  classifyCompanies,
  companyKey,
  type CompanyContacts,
} from "@/lib/company-classification";
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
import { Fragment, useEffect, useMemo, useState, useRef } from "react";
import {
  Users as UsersIcon,
  FileText,
  ShoppingCart,
  Briefcase,
  GraduationCap,
  Pencil,
  Trash2,
  IdCard,
  Image as ImageIcon,
  Download,
  BadgeCheck,
  ChevronDown,
  LayoutGrid,
  List,
  X,
  Sparkles,
  Clock,
  Calendar as CalendarIcon,
  CalendarX,
  RotateCcw,
  Bell,
  Archive,
  ArchiveRestore,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RichText } from "@/components/RichText";
import { getCareerSkills } from "@/lib/career-skills";
import { draftCareerDescription } from "@/lib/career-ai.functions";
import { accountInitial, alphabetInitial } from "@/lib/alphabet";
import { withCareerDescriptions } from "@/lib/career-descriptions";
import { ROLE_TITLES } from "@/lib/data";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
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
import { syncAutomaticHolidays } from "@/lib/public-holidays.functions";
import { CountrySelect } from "@/components/CountrySelect";
import { confirmAction, notify } from "@/lib/dialogs";
import type { AccountRow } from "@/lib/users.server";
import { renderEmailHtml } from "@/lib/email-template";
import {
  completeExportColumns,
  fetchAllRows,
  joinApplicationContacts,
  toCsv,
} from "@/lib/admin-export";

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: (s: Record<string, unknown>): { section?: string | undefined } => ({
    section: ["users", "careers", "reports", "settings", "emails", "legal"].includes(
      String(s["section"]),
    )
      ? String(s["section"])
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Admin: Job Shadow" },
      {
        name: "description",
        content: "JobShadow admin: applications, companies, vouchers and careers.",
      },
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

const TABLES: {
  id: string;
  label: string;
  icon: typeof UsersIcon;
  table: string;
  singular: string;
  cols: Col[];
  csvUpload?: boolean;
  dateCompanyFilter?: boolean;
  indemnityEdit?: boolean;
  custom?: boolean;
}[] = [
  {
    id: "users",
    label: "Users",
    icon: GraduationCap,
    table: "legacy_users",
    singular: "Users",
    custom: true,
    cols: [],
  },
  {
    id: "bookings",
    label: "Bookings",
    icon: UsersIcon,
    table: "bookings",
    singular: "Bookings",
    custom: true,
    cols: [],
  },
  {
    id: "apps",
    label: "Applications",
    icon: UsersIcon,
    table: "legacy_applications",
    singular: "Applications",
    dateCompanyFilter: true,
    indemnityEdit: true,
    cols: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "id_number", label: "ID No." },
      { key: "email", label: "Email" },
      { key: "contact", label: "Contact" },
      { key: "school", label: "School" },
      { key: "company", label: "Company" },
      { key: "career", label: "Career" },
      { key: "dates", label: "Dates" },
      { key: "paid", label: "Paid", field: "checkbox" },
      { key: "indemnity", label: "Indemnity", field: "checkbox" },
      { key: "cancelled", label: "Cancelled", field: "checkbox" },
    ],
  },
  {
    id: "companies",
    label: "Companies",
    icon: FileText,
    table: "companies",
    singular: "Companies",
    cols: [
      { key: "company", label: "Company" },
      { key: "career", label: "Career" },
      { key: "sector", label: "Sector" },
      { key: "location", label: "Location" },
      { key: "mentor_name", label: "Mentor" },
      { key: "mentor_email", label: "Mentor email" },
      { key: "mentor_phone", label: "Mentor phone" },
      { key: "mentor_position", label: "Mentor position" },
      { key: "arrival_instruction", label: "Arrival instructions (used when no mentor is named)" },
      { key: "backup_mentor_name", label: "Backup mentor" },
      { key: "backup_mentor_phone", label: "Backup mentor phone" },
      { key: "backup_mentor_email", label: "Backup mentor email" },
      { key: "hr_contact_name", label: "HR contact name" },
      { key: "hr_contact_phone", label: "HR contact phone" },
      { key: "hr_contact_email", label: "HR contact email" },
      { key: "dates", label: "Dates" },
      { key: "max_applicants", label: "Places", field: "number" },
      { key: "amount", label: "Price (R)", field: "number" },
      { key: "active", label: "Active", field: "checkbox" },
      { key: "mode", label: "Type" },
      { key: "logo_path", label: "Logo" },
      { key: "allow_weekends", label: "Allow weekends", field: "checkbox" },
      { key: "allow_off_season", label: "Allow Nov–Jan (off-season)", field: "checkbox" },
      { key: "custom_indemnity_text", label: "Indemnity form" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    table: "reports",
    singular: "Reports",
    custom: true,
    cols: [],
  },
  {
    id: "vouchers",
    label: "Vouchers",
    icon: ShoppingCart,
    table: "vouchers",
    singular: "Vouchers",
    cols: [
      { key: "id", label: "#" },
      { key: "name", label: "Name" },
      { key: "code", label: "Code" },
      { key: "discount", label: "Discount", field: "number" },
      { key: "available_from", label: "From", field: "date" },
      { key: "available_until", label: "Until", field: "date" },
      { key: "usage_limit", label: "Limit", field: "number" },
    ],
  },
  {
    id: "settings",
    label: "Booking Settings",
    icon: FileText,
    table: "booking_settings",
    singular: "Settings",
    custom: true,
    cols: [],
  },
  {
    id: "sectors",
    label: "Sectors",
    icon: FileText,
    table: "sectors",
    singular: "Sectors",
    csvUpload: true,
    cols: [
      { key: "name", label: "Sector Name" },
      { key: "_student_count", label: "Scholars" },
    ],
  },
  {
    id: "careers",
    label: "Sectors and Careers",
    icon: Briefcase,
    table: "careers",
    singular: "Careers",
    csvUpload: true,
    cols: [
      { key: "name", label: "Career Name" },
      { key: "_student_count", label: "Scholars" },
    ],
  },
  {
    id: "emails",
    label: "Email Archive",
    icon: FileText,
    table: "email_outbox",
    singular: "Emails",
    custom: true,
    cols: [],
  },
  {
    id: "evaluations",
    label: "Evaluations",
    icon: FileText,
    table: "evaluations",
    singular: "Evaluations",
    custom: true,
    cols: [],
  },
  {
    id: "legal",
    label: "Legal Content",
    icon: FileText,
    table: "legal_documents",
    singular: "Legal Content",
    custom: true,
    cols: [],
  },
];

function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin");
      return (data?.length ?? 0) > 0;
    },
  });
}

function AdminPage() {
  const admin = useIsAdmin();
  const syncHolidays = useServerFn(syncAutomaticHolidays);
  const holidaySync = useQuery({
    queryKey: ["admin-holiday-sync", new Date().getFullYear()],
    enabled: admin.data === true,
    queryFn: () => syncHolidays({ data: {} }),
    staleTime: 24 * 60 * 60_000,
    retry: 1,
    refetchInterval: (query) =>
      query.state.error || query.state.data?.failures.length ? 60_000 : false,
  });
  const requestedSection = Route.useSearch().section;
  const [active, setActive] = useState(requestedSection ?? "users");
  useEffect(() => {
    if (requestedSection) setActive(requestedSection);
  }, [requestedSection]);
  const section = TABLES.find((t) => t.id === active);
  if (!section) return null;

  return (
    <div className="admin-portal flex min-h-screen flex-col bg-muted/40">
      <SiteHeader fullWidth />
      <div className="flex min-w-0 flex-1">
        <aside className="w-60 shrink-0 border-r border-primary/20 bg-accent text-accent-foreground shadow-warm">
          <p className="px-5 pb-3 pt-6 text-xs font-bold uppercase tracking-widest text-foreground/70">
            Admin Portal
          </p>
          <nav
            aria-label="Admin navigation"
            className="sticky top-0 max-h-screen space-y-1 overflow-y-auto px-3 pb-6"
          >
            {ADMIN_NAV.map((item) => TABLES.find((table) => table.id === item.key)!).map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`flex w-full items-center gap-3 rounded-md border-l-2 px-3 py-2.5 text-left text-sm font-medium transition ${active === t.id ? "border-primary bg-primary/10 text-foreground" : "border-transparent text-foreground/85 hover:bg-primary/5 hover:text-foreground"}`}
              >
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          <main className="p-0">
            {admin.data && (holidaySync.error || !!holidaySync.data?.failures.length) && (
              <p role="status" className="border-b border-border bg-ivory px-4 py-2 text-sm">
                Some holiday calendars could not be updated. We’ll retry automatically; bookings
                remain protected.
              </p>
            )}
            {admin.isLoading ? (
              <p className="p-8">Loading…</p>
            ) : !admin.data ? (
              <p className="p-8">
                Your account doesn't have admin access. Ask JobShadow to grant it.
              </p>
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
              <DataTable
                key={section.id}
                title={section.singular}
                table={section.table}
                cols={section.cols}
                csvUpload={section.csvUpload}
                dateCompanyFilter={section.dateCompanyFilter}
                indemnityEdit={section.indemnityEdit}
              />
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
function AdminScreenHeader({
  title,
  actions,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-ivory px-6 py-6 text-foreground">
      <h1 className="font-display text-2xl uppercase">{title}</h1>
      {actions}
    </div>
  );
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

function DataTable({
  title,
  table,
  cols,
  csvUpload,
  dateCompanyFilter,
  indemnityEdit,
  companyKind,
}: {
  title: string;
  table: string;
  cols: Col[];
  csvUpload?: boolean | undefined;
  dateCompanyFilter?: boolean | undefined;
  indemnityEdit?: boolean | undefined;
  companyKind?: "mentor" | "host" | undefined;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [openDesc, setOpenDesc] = useState<Set<string>>(new Set());
  const [letter, setLetter] = useState<string | null>(null);
  const alphabetField =
    table === "companies" ? "company" : ["vouchers", "careers"].includes(table) ? "name" : null;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [company, setCompany] = useState("All companies");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [careerDrafts, setCareerDrafts] = useState<CareerBatchDrafts>({});
  const [initialAiAction, setInitialAiAction] = useState<"fill" | "regenerate" | undefined>(
    undefined,
  );
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
    const { data: maxRow } = await supabase
      .from(table as "careers")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextId = ((maxRow?.id as number | undefined) ?? 0) + 1;
    const { error } = await (supabase.from(table as "careers") as any).insert({ id: nextId, name });
    setAddBusy(false);
    if (error) return notify(error.message, "error");
    setNewName("");
    qc.invalidateQueries({ queryKey: ["admin", table] });
    if (table === "companies")
      void qc.invalidateQueries({ queryKey: ["admin", "company-contact-classification"] });
  }
  async function loadAll(source: string) {
    return fetchAllRows(async (from, to) => {
      let query = supabase
        .from(source as "careers")
        .select("*")
        .order("id", { ascending: false });
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
      if (table === "careers")
        all = withCareerDescriptions(all).map((row) => ({
          ...row,
          ideal_for: getCareerGuidance(
            String(row["name"] ?? ""),
            String(row["description"] ?? ""),
            row,
          ).idealFor,
          specialisations: getCareerGuidance(
            String(row["name"] ?? ""),
            String(row["description"] ?? ""),
            row,
          ).specialisations,
          subjects: getCareerGuidance(
            String(row["name"] ?? ""),
            String(row["description"] ?? ""),
            row,
          ).subjects,
          school_skills: getCareerSkills(
            String(row["name"] ?? ""),
            row["school_skills"],
            row["workplace_skills"],
          ).school,
          workplace_skills: getCareerSkills(
            String(row["name"] ?? ""),
            row["school_skills"],
            row["workplace_skills"],
          ).workplace,
        }));
      if (table === "legacy_applications")
        all = joinApplicationContacts(all, await loadAll("companies"));
      exportCsv(
        title,
        completeExportColumns(
          cols.filter((c) => !c.key.startsWith("_")),
          all,
        ),
        all,
      );
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Unable to export records. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  }
  const isNameSorted = table === "sectors" || table === "careers";
  const { data, isLoading } = useQuery({
    queryKey: ["admin", table, showSpam],
    queryFn: async () => {
      let query = isNameSorted
        ? supabase
            .from(table as "careers")
            .select("*")
            .order("name", { ascending: true })
        : supabase
            .from(table as "careers")
            .select("*")
            .order("id", { ascending: false });
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
          const { data: bookingRows, error } = await supabase
            .from("bookings")
            .select(field)
            .order("id")
            .range(from, from + 999);
          if (error) throw error;
          (bookingRows ?? []).forEach((b: Record<string, unknown>) => {
            const v = (b[field] as string | null)?.trim().toLowerCase();
            if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
          });
          if (!bookingRows || bookingRows.length < 1000) break;
        }
        rows.forEach((r) => {
          r["_student_count"] = counts.get(String(r["name"]).trim().toLowerCase()) ?? 0;
        });
      }
      if (table === "careers") {
        const companyRows = await fetchAllRows(async (from, to) => {
          const result = await supabase
            .from("companies")
            .select(
              "company, career, mentor_name, mentor_email, active, dates, arrival_time, collection_time",
            )
            .order("id")
            .range(from, to);
          if (result.error) throw result.error;
          return result.data ?? [];
        });
        const availability = mentorAvailability(companyRows);
        rows.forEach((row) => {
          const count = availability.get(
            String(row["name"])
              .toLowerCase()
              .replace(/[^a-z0-9]/g, ""),
          );
          row["_real_availability"] = count?.available ?? 0;
          row["_total_mentors"] = count?.total ?? 0;
        });
      }
      return table === "careers" ? withCareerDescriptions(rows) : rows;
    },
  });
  const companyTypes = useMemo(() => classifyCompanies((data ?? []) as CompanyContacts[]), [data]);
  const companies = useMemo(
    () => ["All companies", ...new Set((data ?? []).map((r) => fmt(r["company"])).filter(Boolean))],
    [data],
  );
  const letterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (alphabetField)
      (data ?? []).forEach((row) => {
        if (
          companyKind &&
          companyTypes.get(companyKey(String(row["company"] ?? ""))) !== companyKind
        )
          return;
        const initial = alphabetInitial(fmt(row[alphabetField]));
        if (initial) counts.set(initial, (counts.get(initial) ?? 0) + 1);
      });
    return counts;
  }, [data, alphabetField, companyKind, companyTypes]);
  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (data ?? []).filter((r) => {
      if (companyKind && companyTypes.get(companyKey(String(r["company"] ?? ""))) !== companyKind)
        return false;
      if (letter && alphabetField && alphabetInitial(fmt(r[alphabetField])) !== letter)
        return false;
      if (s && !cols.some((c) => fmt(r[c.key]).toLowerCase().includes(s))) return false;
      if (dateCompanyFilter) {
        if (company !== "All companies" && fmt(r["company"]) !== company) return false;
        const d = fmt(r["dates"]);
        if (from && d && d < from) return false;
        if (to && d && d > to) return false;
      }
      return true;
    });
  }, [
    data,
    q,
    cols,
    dateCompanyFilter,
    company,
    from,
    to,
    letter,
    alphabetField,
    companyKind,
    companyTypes,
  ]);

  async function remove(row: Record<string, unknown>) {
    if (!(await confirmAction("Delete this record?", { danger: true, confirmLabel: "Delete" })))
      return;
    const { error } = await (supabase.from(table as "careers") as any).delete().eq("id", row["id"]);
    if (error) return notify(error.message, "error");
    qc.invalidateQueries({ queryKey: ["admin", table] });
    if (table === "companies")
      void qc.invalidateQueries({ queryKey: ["admin", "company-contact-classification"] });
  }

  async function toggleArchived(row: Record<string, unknown>) {
    const { error } = await (supabase.from("careers") as any)
      .update({ archived: !row["archived"] })
      .eq("id", row["id"]);
    if (error) return notify(error.message, "error");
    qc.invalidateQueries({ queryKey: ["admin", table] });
  }

  if (editing) {
    const onDone = () => {
      setCareerDrafts((current) => {
        const next = { ...current };
        delete next[String(editing["id"])];
        return next;
      });
      setInitialAiAction(undefined);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", table] });
      if (table === "companies")
        void qc.invalidateQueries({ queryKey: ["admin", "company-contact-classification"] });
    };
    const onCancel = () => {
      setInitialAiAction(undefined);
      setEditing(null);
    };
    return indemnityEdit ? (
      <ApplicationEditPanel table={table} row={editing} onDone={onDone} onCancel={onCancel} />
    ) : (
      <EditRecord
        title={title}
        table={table}
        cols={cols}
        row={editing}
        initialAiAction={initialAiAction}
        onDone={onDone}
        onCancel={onCancel}
      />
    );
  }

  if (creating) {
    const onDone = () => {
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["admin", table] });
      if (table === "companies")
        void qc.invalidateQueries({ queryKey: ["admin", "company-contact-classification"] });
    };
    return <CreateRole onDone={onDone} onCancel={() => setCreating(false)} />;
  }

  return (
    <div className="bg-ivory">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-ivory px-6 py-6 text-foreground">
        <h1 className="font-display text-2xl uppercase">{title}</h1>
      </div>
      {alphabetField && (
        <div
          className="flex flex-wrap gap-1.5 border-b border-border bg-ivory px-6 py-4"
          aria-label={`Filter ${title} alphabetically`}
        >
          <button
            type="button"
            onClick={() => setLetter(null)}
            aria-pressed={letter === null}
            className={`rounded-full px-2.5 py-1.5 text-xs font-medium uppercase transition ${letter === null ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground hover:bg-teal/20"}`}
          >
            All
          </button>
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => setLetter(letter === ch ? null : ch)}
              disabled={!letterCounts.has(ch)}
              aria-pressed={letter === ch}
              className={`rounded-full px-2.5 py-1.5 text-xs font-medium uppercase transition ${letter === ch ? "bg-primary text-primary-foreground" : !letterCounts.has(ch) ? "bg-muted/30 text-muted-foreground/50" : "bg-muted/70 text-foreground hover:bg-teal/20"}`}
            >
              {ch}
            </button>
          ))}
        </div>
      )}
      <div className="bg-ivory px-6 py-6 text-foreground">
        {exportError && (
          <p role="alert" className="mb-4 text-sm font-medium">
            {exportError}
          </p>
        )}
        <div className="flex flex-wrap items-end gap-6">
          <label className="block max-w-sm text-sm">
            Search
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}`}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
            />
          </label>
          {dateCompanyFilter && (
            <>
              <label className="text-sm">
                From
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="block border-b border-input bg-transparent px-1 py-1 outline-none"
                />
              </label>
              <label className="text-sm">
                To
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="block border-b border-input bg-transparent px-1 py-1 outline-none"
                />
              </label>
              <label className="text-sm">
                Select company
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="block border-b border-input bg-transparent px-1 py-1 outline-none"
                >
                  {companies.map((c) => (
                    <option key={c} value={c} className="text-foreground">
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {isUsers && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showSpam}
                onChange={(e) => setShowSpam(e.target.checked)}
              />
              Show spam-flagged accounts
            </label>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-3">
            {table === "careers" && (
              <BulkCareerDrafts
                records={data ?? []}
                drafts={careerDrafts}
                disabled={isLoading}
                onDraft={(id, draft) => setCareerDrafts((current) => ({ ...current, [id]: draft }))}
                onReview={async (id) => {
                  try {
                    const result = await supabase
                      .from("careers")
                      .select("*")
                      .eq("id", Number(id))
                      .maybeSingle();
                    if (result.error) throw result.error;
                    if (!result.data) {
                      notify("This career no longer exists.", "error");
                      return;
                    }
                    const fresh = result.data;
                    setInitialAiAction(undefined);
                    setEditing({
                      ...fresh,
                      ...careerDraftPatch(careerContentForAI(fresh), careerDrafts[id] ?? {}),
                    });
                  } catch (error) {
                    notify(
                      error instanceof Error
                        ? error.message
                        : "Could not load this career for review.",
                      "error",
                    );
                  }
                }}
              />
            )}
            {csvUpload && (table === "careers" || table === "sectors") && (
              <NamedCsvUpload table={table} />
            )}
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
                <Button onClick={addNamed} disabled={addBusy || !newName.trim()}>
                  Add
                </Button>
              </div>
            )}
            <Button variant="outline" onClick={exportAll} disabled={isLoading || exporting}>
              {exporting ? "Exporting…" : "Export"}
            </Button>
          </div>
        </div>
        {table === "careers" ? (
          <div className="mt-4 space-y-0">
            {[...new Set(rows.map((r) => alphabetInitial(fmt(r["name"]))))]
              .sort((a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)))
              .map((group) => {
                const groupRows = rows.filter((r) => alphabetInitial(fmt(r["name"])) === group);
                return (
                  <Accordion
                    key={group}
                    type="multiple"
                    className="overflow-hidden border-x border-border bg-ivory first:border-t last:border-b"
                  >
                    <AccordionItem value={group}>
                      <AccordionTrigger className="px-3 py-3 text-sm hover:no-underline hover:bg-muted/30">
                        <span className="font-bold text-primary">{group}</span>&nbsp;
                        <span className="text-muted-foreground">({groupRows.length})</span>
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
                                      <button
                                        type="button"
                                        aria-expanded={descOpen}
                                        aria-label={
                                          descOpen ? "Hide description" : "Show description"
                                        }
                                        onClick={() =>
                                          setOpenDesc((prev) => {
                                            const n = new Set(prev);
                                            n.has(rid) ? n.delete(rid) : n.add(rid);
                                            return n;
                                          })
                                        }
                                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-warm-divider bg-card text-xs font-bold text-muted-foreground hover:text-primary"
                                      >
                                        {descOpen ? "−" : "+"}
                                      </button>
                                    )}
                                    <div className="min-w-0">
                                      <span className="block truncate text-sm font-medium leading-tight">
                                        {fmt(r["name"])}
                                        {!!r["archived"] && (
                                          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                                            Archived
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                      {fmt(r["_student_count"])} scholars
                                    </span>
                                  </div>
                                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                                    <span
                                      className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${Number(r["_real_availability"]) > 0 ? "bg-cta text-cta-foreground" : "bg-muted text-foreground"}`}
                                      title="Available mentors compared with this career’s mentor target"
                                    >
                                      {fmt(
                                        r["mentor_available_count"] ?? r["_real_availability"] ?? 0,
                                      )}{" "}
                                      of{" "}
                                      {fmt(
                                        Math.max(
                                          Number(r["mentor_target_count"] ?? 1),
                                          Number(
                                            r["mentor_available_count"] ??
                                              r["_real_availability"] ??
                                              0,
                                          ),
                                        ),
                                      )}{" "}
                                      mentors available
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInitialAiAction("fill");
                                        setEditing(r);
                                      }}
                                      aria-label={
                                        "AI: Fill missing fields for " + String(r["name"])
                                      }
                                      title="AI: Fill missing fields"
                                      className="rounded border border-warm-divider p-1.5 text-muted-foreground hover:text-primary"
                                    >
                                      <Sparkles className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInitialAiAction("regenerate");
                                        setEditing(r);
                                      }}
                                      aria-label={"Regenerate " + String(r["name"])}
                                      title="Regenerate this career"
                                      className="rounded border border-warm-divider p-1.5 text-muted-foreground hover:text-primary"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => void toggleArchived(r)}
                                      className="rounded border border-warm-divider p-1.5 text-muted-foreground transition hover:text-primary"
                                      aria-label={r["archived"] ? "Unarchive" : "Archive"}
                                      title={
                                        r["archived"]
                                          ? "Unarchive — show this career to users again"
                                          : "Archive — hide this career from users without deleting it"
                                      }
                                    >
                                      {r["archived"] ? (
                                        <ArchiveRestore className="h-3 w-3" />
                                      ) : (
                                        <Archive className="h-3 w-3" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setEditing(r)}
                                      className="rounded border border-warm-divider p-1.5 text-muted-foreground transition hover:text-primary"
                                      aria-label="Edit"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => remove(r)}
                                      className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/5 hover:text-destructive"
                                      aria-label="Delete"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                                {table === "careers" && descOpen && (
                                  <div className="bg-ivory pb-3 pl-12 pr-4 text-sm text-foreground">
                                    <CareerGuidance
                                      name={String(r["name"] ?? "")}
                                      description={String(r["description"] ?? "")}
                                      saved={r}
                                      showEmptySections
                                    />
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
            {rows.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">
                No {title.toLowerCase()} match this search.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-track]:bg-muted">
            <table
              className={`w-full min-w-[700px] text-left ${table === "companies" ? "text-xs" : "text-sm"}`}
            >
              <thead>
                <tr className="border-b border-border font-medium">
                  {cols.map((c) => (
                    <th
                      key={c.key}
                      className={`whitespace-nowrap ${table === "companies" ? "px-2 py-1" : "px-3 py-2"}`}
                    >
                      {c.label}
                    </th>
                  ))}
                  <th className={table === "companies" ? "px-2 py-1" : "px-3 py-2"}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-3 py-4" colSpan={cols.length + 1}>
                      Loading…
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const rid = String(r["id"]);
                    const descOpen = openDesc.has(rid);
                    return (
                      <Fragment key={rid}>
                        <tr className="border-b border-warm-divider">
                          {cols.map((c) => (
                            <td
                              key={c.key}
                              className={`align-top ${table === "companies" ? "px-2 py-1" : "px-3 py-2"}`}
                            >
                              {table === "careers" && c.key === "name" ? (
                                <span className="flex items-start gap-2">
                                  <button
                                    type="button"
                                    aria-expanded={descOpen}
                                    aria-label={descOpen ? "Hide description" : "Show description"}
                                    onClick={() =>
                                      setOpenDesc((prev) => {
                                        const n = new Set(prev);
                                        n.has(rid) ? n.delete(rid) : n.add(rid);
                                        return n;
                                      })
                                    }
                                    className="grid h-5 w-5 shrink-0 place-items-center rounded border border-border text-xs font-bold text-muted-foreground hover:text-primary"
                                  >
                                    {descOpen ? "−" : "+"}
                                  </button>
                                  {fmtCell(r[c.key])}
                                </span>
                              ) : c.key === "custom_indemnity_text" ? (
                                r[c.key] ? (
                                  "Uploaded"
                                ) : (
                                  "—"
                                )
                              ) : (
                                fmtCell(r[c.key])
                              )}
                            </td>
                          ))}
                          <td className={table === "companies" ? "px-2 py-1" : "px-3 py-2"}>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setEditing(r)}
                                className="rounded border border-border p-1.5 text-muted-foreground transition hover:text-primary"
                                aria-label="Edit"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => remove(r)}
                                className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/5 hover:text-destructive"
                                aria-label="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {table === "careers" && descOpen && (
                          <tr className="border-b border-border/60 bg-muted/30">
                            <td
                              colSpan={cols.length + 1}
                              className="px-10 py-3 text-sm text-muted-foreground"
                            >
                              {r["description"] ? (
                                <RichText text={String(r["description"])} />
                              ) : (
                                <em>No description yet — edit this career to add one.</em>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
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

function ApplicationEditPanel({
  table,
  row,
  onDone,
  onCancel,
}: {
  table: string;
  row: Record<string, unknown>;
  onDone: () => void;
  onCancel: () => void;
}) {
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
    if (up.error) {
      setBusy(false);
      return setErr(up.error.message);
    }
    const { error } = await (supabase.from(table as "careers") as any)
      .update({ indemnity_file: path })
      .eq("id", row["id"]);
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
        <button onClick={onCancel} className="text-sm font-medium hover:underline">
          Back to list
        </button>
      </div>
      <div className="grid gap-px bg-foreground/10 sm:grid-cols-2">
        <div>
          <div className="border-b border-border bg-background px-6 py-5 text-foreground">
            <h2 className="text-xl font-medium">Edit Application #{String(row["id"])}</h2>
          </div>
          <div className="bg-background px-6 py-5 text-foreground">
            {filename && <p className="text-sm">{filename}</p>}
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-2 block text-xs"
            />
            {err && <p className="mt-2 text-sm font-medium">{err}</p>}
            <div className="mt-3 flex gap-2">
              <button
                onClick={upload}
                disabled={busy || !file}
                className="rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-sm font-medium uppercase text-foreground disabled:opacity-50"
              >
                Update
              </button>
              <button
                onClick={download}
                disabled={!filename}
                className="rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-sm font-medium uppercase text-foreground disabled:opacity-50"
              >
                Download File
              </button>
            </div>
          </div>
        </div>
        <div>
          <div className="border-b border-border bg-background px-6 py-5 text-foreground">
            <h2 className="text-xl font-medium">Resend Mails</h2>
          </div>
          <div className="bg-background px-6 py-5 text-foreground">
            <div className="flex flex-col gap-2">
              {RESEND_TEMPLATES.map((t, i) => (
                <button
                  key={t}
                  onClick={() =>
                    setNotice(
                      `"${t}" is queued to resend (no email service connected in this build).`,
                    )
                  }
                  className="rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-foreground"
                >
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

function CanonicalSelect({
  table,
  label,
  value,
  onChange,
}: {
  table: "careers" | "sectors";
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const qc = useQueryClient();
  const options = useQuery({
    queryKey: ["canonical", table],
    queryFn: async () =>
      ((await supabase.from(table).select("name").order("name")).data ?? []).map(
        (r) => r.name as string,
      ),
  });
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [busy, setBusy] = useState(false);

  async function addNew() {
    const name = newVal.trim();
    if (!name) return;
    setBusy(true);
    const { data: maxRow } = await supabase
      .from(table)
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
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
          <input
            autoFocus
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            className="w-full border-b border-input bg-transparent px-1 py-1 outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={addNew}
            disabled={busy || !newVal.trim()}
            className="shrink-0 rounded-md bg-teal/20 hover:bg-teal/30 px-3 py-1 text-xs font-medium uppercase text-foreground disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setNewVal("");
            }}
            className="shrink-0 text-xs underline"
          >
            Cancel
          </button>
        </div>
      </label>
    );
  }

  return (
    <label className="block text-sm">
      {label}
      <select
        value={(options.data ?? []).includes(value) ? value : ""}
        onChange={(e) =>
          e.target.value === "__add__" ? setAdding(true) : onChange(e.target.value)
        }
        className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 text-foreground outline-none focus:border-primary"
      >
        <option value="" className="text-foreground">
          Select…
        </option>
        {options.data?.map((n) => (
          <option key={n} value={n} className="text-foreground">
            {n}
          </option>
        ))}
        <option value="__add__" className="text-foreground">
          + Add new…
        </option>
      </select>
    </label>
  );
}

function CreateRole({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const syncHolidays = useServerFn(syncAutomaticHolidays);
  const [type, setType] = useState(0);
  const [vals, setVals] = useState<Record<string, string>>({
    company: "",
    career: "",
    sector: "",
    location: "",
    country_code: "ZA",
    amount: String(ROLE_TYPES[0]!.amount),
  });
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setType_(i: number) {
    setType(i);
    setVals((v) => ({ ...v, amount: String(ROLE_TYPES[i]!.amount) }));
  }

  const fields: { key: string; label: string }[] = [
    { key: "company", label: "Company" },
    { key: "location", label: "Location" },
    { key: "mentor_name", label: "Mentor name" },
    { key: "mentor_phone", label: "Mentor phone" },
    { key: "mentor_email", label: "Mentor email" },
    { key: "arrival_instruction", label: "Arrival instructions (used when no mentor is named)" },
    { key: "hr_contact_name", label: "HR contact name" },
    { key: "hr_contact_phone", label: "HR contact phone" },
    { key: "hr_contact_email", label: "HR contact email" },
    { key: "backup_mentor_name", label: "Backup mentor name" },
    { key: "backup_mentor_phone", label: "Backup mentor phone" },
    { key: "backup_mentor_email", label: "Backup mentor email" },
    { key: "max_applicants", label: "Places" },
  ];

  async function save() {
    if (!vals["company"] || !vals["career"]) {
      setErr("Company and Career are required.");
      return;
    }
    setBusy(true);
    setErr(null);
    const patch: Record<string, unknown> = {
      ...vals,
      amount: Number(vals["amount"]) || ROLE_TYPES[type]!.amount,
      active,
      mode: ROLE_TYPES[type]!.label,
      allow_weekends: vals["allow_weekends"] === "true",
      allow_off_season: vals["allow_off_season"] === "true",
    };
    if (patch["max_applicants"]) patch["max_applicants"] = Number(patch["max_applicants"]);
    try {
      const result = await syncHolidays({ data: { countryCode: vals["country_code"] ?? "ZA" } });
      if (result.failures.length) throw new Error(result.failures.join(" "));
    } catch (error) {
      setBusy(false);
      setErr(error instanceof Error ? error.message : "Could not load public holidays.");
      return;
    }
    const { error } = await supabase.from("companies").insert(patch as never);
    setBusy(false);
    if (error) return setErr(error.message);
    onDone();
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border bg-background px-6 py-5 text-foreground">
        <h1 className="text-xl font-medium">Add New Role</h1>
        <button onClick={onCancel} className="text-sm font-medium hover:underline">
          Back to list
        </button>
      </div>
      <div className="bg-background px-6 py-6 text-foreground">
        <label className="block max-w-sm text-sm">
          Shadow type
          <select
            value={type}
            onChange={(e) => setType_(Number(e.target.value))}
            className="mt-1 block w-full border-b border-input bg-transparent px-1 py-1 text-foreground outline-none"
          >
            {ROLE_TYPES.map((t, i) => (
              <option key={t.label} value={i} className="text-foreground">
                {t.label} (R{t.amount})
              </option>
            ))}
          </select>
        </label>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <CanonicalSelect
            table="sectors"
            label="Sector"
            value={vals["sector"] ?? ""}
            onChange={(v) => setVals({ ...vals, sector: v })}
          />
          <CanonicalSelect
            table="careers"
            label="Career / Role title"
            value={vals["career"] ?? ""}
            onChange={(v) => setVals({ ...vals, career: v })}
          />
          <CountrySelect
            value={vals["country_code"] ?? "ZA"}
            onChange={(country_code) => setVals({ ...vals, country_code })}
          />
          {fields.map((f) => (
            <label key={f.key} className="block text-sm">
              {f.label}
              <input
                value={vals[f.key] ?? ""}
                onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none focus:border-primary"
              />
            </label>
          ))}
          <label className="block text-sm">
            Price (R)
            <input
              type="number"
              value={vals["amount"] ?? ""}
              onChange={(e) => setVals({ ...vals, amount: e.target.value })}
              className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none focus:border-primary"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active (visible for booking)
          </label>
          <div className="sm:col-span-3">
            <p className="text-sm">Dates</p>
            <div className="mt-2 flex gap-5">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={vals["allow_weekends"] === "true"}
                  onChange={(e) =>
                    setVals({ ...vals, allow_weekends: e.target.checked ? "true" : "" })
                  }
                />
                Allow weekends
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={vals["allow_off_season"] === "true"}
                  onChange={(e) =>
                    setVals({ ...vals, allow_off_season: e.target.checked ? "true" : "" })
                  }
                />
                Allow Nov–Jan (off-season)
              </label>
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
        <button
          onClick={save}
          disabled={busy}
          className="mt-6 rounded-md bg-teal/20 hover:bg-teal/30 px-5 py-2.5 text-sm font-medium uppercase text-foreground"
        >
          Create
        </button>
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

function UserDocument({
  path,
  kind,
  verified = false,
}: {
  path: string | null;
  kind: "id" | "photo";
  verified?: boolean;
}) {
  const file = useQuery({
    queryKey: ["admin", "document-exists", path],
    enabled: !!path,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("scholar-docs").info(path!);
      return !error && !!data;
    },
    staleTime: 60_000,
  });
  const Icon = kind === "id" ? IdCard : ImageIcon;
  return (
    <div className="flex items-center gap-1">
      <span
        className="relative rounded p-1 text-muted-foreground"
        title={kind === "id" ? "ID document" : "Photo"}
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
        <span className="sr-only">{kind === "id" ? "ID document" : "Photo"}</span>
        {verified && (
          <BadgeCheck
            aria-label="ID verified"
            className="absolute -right-1 -top-1 h-3.5 w-3.5 fill-primary text-white"
          />
        )}
      </span>
      {file.data === true && (
        <button
          onClick={() => downloadDoc(path)}
          aria-label={kind === "id" ? "Download ID scan" : "Download photo"}
          title={kind === "id" ? "Download ID scan" : "Download photo"}
          className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-primary"
        >
          <Download className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

const ROLE_LABELS: Record<AccountRow["roles"][number], string> = {
  user: "Scholar",
  mentor: "Mentor",
  hr_admin: "HR Admin",
  school: "School",
  admin: "Admin",
  parent: "Parent",
};

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
    queryKey: ["admin", "file-preview", path],
    enabled: !!path,
    staleTime: 240_000,
    queryFn: async () => {
      const bucket = supabase.storage.from("scholar-docs");
      const info = await bucket.info(path!);
      if (info.error || !info.data) throw new Error("Document unavailable.");
      const signed = await bucket.createSignedUrl(path!, 300);
      if (signed.error) throw new Error(signed.error.message);
      return {
        url: signed.data.signedUrl,
        image: info.data.contentType?.startsWith("image/") === true,
      };
    },
  });
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium">{label}</h3>
      {!path ? (
        <p className="text-xs text-muted-foreground">No file uploaded.</p>
      ) : preview.isPending ? (
        <p className="text-xs text-muted-foreground">Loading document…</p>
      ) : preview.error ? (
        <p className="text-xs text-muted-foreground">Document unavailable.</p>
      ) : (
        preview.data && (
          <a
            href={preview.data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded border border-border bg-muted/30 p-2 text-xs text-primary"
          >
            {preview.data.image ? (
              <img src={preview.data.url} alt={label} className="max-h-48 w-full object-contain" />
            ) : (
              "Open " + label.toLowerCase()
            )}
          </a>
        )
      )}
    </section>
  );
}

function UserTableColumns() {
  return (
    <colgroup>
      {[13, 10, 19, 12, 12, 11, 6, 9, 8].map((width, index) => (
        <col key={index} style={{ width: width + "%" }} />
      ))}
    </colgroup>
  );
}

function UserTableRow({
  a,
  selectedId,
  busyId,
  expandedApplicationUser,
  mentorBadge,
  onSelect,
  onEdit,
  onDelete,
  onVerify,
  onToggleExpand,
}: {
  a: AccountRow;
  selectedId: string | null;
  busyId: string | null;
  expandedApplicationUser: string | null;
  mentorBadge?: "IM" | "CM" | null;
  onSelect: (id: string) => void;
  onEdit: () => void;
  onDelete: (id: string, label: string) => void;
  onVerify: (id: string, verified: boolean) => void;
  onToggleExpand: () => void;
}) {
  const avatarUrl = a.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(a.avatar_path).data.publicUrl
    : null;
  const label = a.display_name || a.full_name || a.email || a.id;
  const { first: firstName, last: lastName } = accountNameParts(a);
  const expanded = expandedApplicationUser === a.id;
  const applications = useUserApplications(expanded ? a.id : null);
  return (
    <Fragment>
      <tr
        className={
          "border-t border-warm-divider transition-colors hover:bg-teal/5 " +
          (selectedId === a.id ? "bg-teal/10" : "")
        }
      >
        <td className="px-3 py-1.5">
          <div
            className="flex items-center gap-2"
            title={"Joined " + new Date(a.created_at).toLocaleDateString()}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-teal/15 text-[11px] uppercase">
                {label.slice(0, 1)}
              </span>
            )}
            <button
              onClick={() => onSelect(a.id)}
              className="max-w-32 truncate text-left font-medium hover:text-primary"
              title={label}
              aria-label={"View details for " + label}
            >
              {firstName || "—"}
            </button>
            {mentorBadge && (
              <span
                className={
                  "rounded px-1 py-0.5 text-[10px] font-bold " +
                  (mentorBadge === "IM"
                    ? "bg-teal/20 text-teal-foreground"
                    : "bg-accent/20 text-accent-foreground")
                }
                title={mentorBadge === "IM" ? "Independent Mentor" : "Company Mentor"}
              >
                {mentorBadge}
              </span>
            )}
            {a.classification_unconfirmed && (
              <span
                className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground"
                title="Moved to Scholars; classification still needs review"
              >
                Unclassified
              </span>
            )}
            {a.is_spam && <span className="text-[10px] text-destructive">Spam</span>}
            {!a.self_registered && (
              <span
                className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground"
                title="This account was provisioned by an admin from a company contact and has not signed in itself."
              >
                Not registered
              </span>
            )}
          </div>
        </td>
        <td className="truncate px-3 py-1.5" title={lastName}>
          {lastName || "—"}
        </td>
        <td className="px-3 py-1.5">
          <span className="block max-w-full truncate" title={a.email ?? ""}>
            {a.email || "—"}
          </span>
        </td>
        <td className="truncate px-3 py-1.5" title={a.id_number ?? ""}>
          {a.id_number || "—"}
        </td>
        <td className="px-3 py-1.5">
          <span className="block max-w-full truncate" title={a.school ?? ""}>
            {a.school || "—"}
          </span>
        </td>
        <td className="px-3 py-1.5">
          <div className="flex items-center gap-2">
            <label
              className="flex items-center"
              title={a.id_verified === null ? "No scholar profile to verify" : "ID verified"}
            >
              <input
                type="checkbox"
                className="accent-primary"
                checked={a.id_verified === true}
                disabled={a.id_verified === null || busyId === a.id}
                onChange={(e) => onVerify(a.id, e.target.checked)}
                aria-label={"ID verified for " + label}
              />
            </label>
            <UserDocument path={a.id_file_path} kind="id" verified={a.id_verified === true} />
            <UserDocument path={a.photo_path} kind="photo" />
          </div>
        </td>
        <td className="px-3 py-1.5">
          <button
            aria-expanded={expanded}
            aria-controls={"applications-" + a.id}
            onClick={onToggleExpand}
            className="flex items-center gap-2 whitespace-nowrap rounded px-1.5 py-1 text-xs hover:bg-muted"
            title={a.booking_count + " bookings"}
          >
            {a.booking_count}
            <ChevronDown className={"h-3 w-3 transition " + (expanded ? "rotate-180" : "")} />
            <span className="sr-only">Applications for {label}</span>
          </button>
        </td>
        <td
          className="px-3 py-1.5 whitespace-nowrap text-muted-foreground"
          title={a.last_accessed_at ? new Date(a.last_accessed_at).toLocaleString() : "Unknown"}
        >
          {a.last_accessed_at ? new Date(a.last_accessed_at).toLocaleDateString() : "Unknown"}
        </td>
        <td className="px-3 py-1.5 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={onEdit}
              disabled={busyId === a.id}
              className="rounded p-1.5 text-muted-foreground transition hover:text-primary disabled:opacity-50"
              title="Edit user"
              aria-label={"Edit " + label}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(a.id, label)}
              disabled={busyId === a.id}
              className="rounded p-1.5 text-muted-foreground transition hover:bg-destructive/5 hover:text-destructive disabled:opacity-50"
              aria-label={"Delete account for " + label}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr id={"applications-" + a.id}>
          <td colSpan={9} className="border-t border-border bg-muted/30 px-5 py-3">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>Applications for {label}</span>
              <span>
                {a.booking_count} bookings · Joined {new Date(a.created_at).toLocaleDateString()}
              </span>
            </div>
            {applications.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : !applications.data?.length ? (
              <p className="text-xs text-muted-foreground">No applications recorded.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr>
                    {["ID", "Company", "Career", "Dates", "Paid", "Indemnity", "Cancelled"].map(
                      (heading) => (
                        <th key={heading} className="px-2 py-2 font-medium">
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {applications.data.map((application) => (
                    <tr
                      key={application.source + "-" + application.id}
                      className="border-t border-border/70"
                    >
                      <td className="px-2 py-2">
                        {application.source} #{application.id}
                      </td>
                      <td className="px-2 py-2">{application.company || "—"}</td>
                      <td className="px-2 py-2">{application.career || "—"}</td>
                      <td className="px-2 py-2">{application.dates || "—"}</td>
                      {[application.paid, application.indemnity, application.cancelled].map(
                        (value, index) => (
                          <td key={index} className="px-2 py-2">
                            {value === null ? (
                              "Not recorded"
                            ) : (
                              <BoolIcon value={index === 2 ? !value : value} />
                            )}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function UserDetailPanel({
  account: a,
  mentorInfo,
  onClose,
  onEdit,
}: {
  account: AccountRow;
  mentorInfo?:
    | {
        preferred_contact: string;
        contact_hours_note: string | null;
        avoid_weekends: boolean;
        engagement_notes: string | null;
      }
    | undefined;
  onClose: () => void;
  onEdit: () => void;
}) {
  const label = a.display_name || a.full_name || a.email || a.id;
  const applications = useUserApplications(a.id);
  const CONTACT_LABEL: Record<string, string> = {
    email: "Email",
    whatsapp: "WhatsApp",
    phone: "Phone call",
    sms: "SMS",
  };
  return (
    <aside
      aria-label="Selected user details"
      className="w-full shrink-0 border-t border-border bg-background p-5 xl:sticky xl:top-0 xl:max-h-screen xl:w-72 xl:overflow-y-auto xl:border-l xl:border-t-0"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-sans text-sm font-medium">{label}</h2>
          <div className="mt-1 flex flex-wrap gap-1">
            {(a.roles.length === 0 || a.classification_unconfirmed) && (
              <span className="text-xs text-muted-foreground">Unclassified</span>
            )}
            {a.roles.map((role) => (
              <span key={role} className="rounded bg-teal/15 px-1.5 py-0.5 text-[10px]">
                {ROLE_LABELS[role]}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close user details"
          className="rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <dl className="space-y-2 text-xs">
        {(
          [
            ["Email", a.email],
            ["Phone", a.contact_no],
            ["School", a.school],
            ["ID / passport", a.id_number],
            ["Joined", new Date(a.created_at).toLocaleDateString()],
            [
              "Last accessed",
              a.last_accessed_at ? new Date(a.last_accessed_at).toLocaleString() : "Unknown",
            ],
          ] as const
        ).map(([title, value]) => (
          <div key={title}>
            <dt className="text-muted-foreground">{title}</dt>
            <dd className="break-words">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      {mentorInfo && (
        <section className="mt-4 space-y-2 border-t border-border pt-4 text-xs">
          <h3 className="text-xs font-medium">Rules of engagement</h3>
          <div>
            <dt className="text-muted-foreground">Preferred contact</dt>
            <dd>{CONTACT_LABEL[mentorInfo.preferred_contact] ?? mentorInfo.preferred_contact}</dd>
          </div>
          {mentorInfo.contact_hours_note && (
            <div>
              <dt className="text-muted-foreground">Best times to contact</dt>
              <dd className="break-words">{mentorInfo.contact_hours_note}</dd>
            </div>
          )}
          {mentorInfo.avoid_weekends && (
            <p className="text-muted-foreground">Do not contact on weekends.</p>
          )}
          {mentorInfo.engagement_notes && (
            <div>
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="break-words">{mentorInfo.engagement_notes}</dd>
            </div>
          )}
        </section>
      )}
      <div className="my-4 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <BoolIcon value={!!a.id_verified} /> {a.id_verified ? "ID verified" : "ID not verified"}
        </span>
        <button onClick={onEdit} className="flex items-center gap-1 text-xs text-primary">
          <Pencil className="h-3 w-3" />
          Edit user
        </button>
      </div>
      <div className="space-y-4 border-t border-border py-4">
        <UserFilePreview path={a.id_file_path} label="Uploaded ID" />
        <UserFilePreview path={a.photo_path} label="Uploaded photo" />
      </div>
      <section className="border-t border-border pt-4">
        <h3 className="mb-3 text-xs font-medium">
          Application history {applications.data ? `(${applications.data.length})` : ""}
        </h3>
        <div className="space-y-3">
          {applications.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : applications.data?.length ? (
            applications.data.map((application) => (
              <article
                key={application.source + application.id}
                className="border-b border-border/60 pb-3 text-xs"
              >
                <p className="font-medium">{application.career || "Career not recorded"}</p>
                <p className="text-muted-foreground">
                  {application.company || "Company not recorded"} ·{" "}
                  {application.dates || "Dates not recorded"}
                </p>
                <p className="mt-1 text-[10px]">
                  {application.source} #{application.id}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    Paid:{" "}
                    {application.paid === null ? (
                      "Not recorded"
                    ) : (
                      <BoolIcon value={application.paid} />
                    )}
                  </span>{" "}
                  ·{" "}
                  <span className="flex items-center gap-1">
                    Indemnity:{" "}
                    {application.indemnity === null ? (
                      "Not recorded"
                    ) : (
                      <BoolIcon value={application.indemnity} />
                    )}
                  </span>{" "}
                  ·{" "}
                  <span className="flex items-center gap-1">
                    Cancelled:{" "}
                    {application.cancelled === null ? (
                      "Not recorded"
                    ) : (
                      <BoolIcon value={!application.cancelled} />
                    )}
                  </span>
                </p>
              </article>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No applications recorded.</p>
          )}
        </div>
      </section>
    </aside>
  );
}

function UserCards({
  rows,
  selectedId,
  busyId,
  onSelect,
  onEdit,
  onDelete,
  onVerify,
}: {
  rows: AccountRow[];
  selectedId: string | null;
  busyId: string | null;
  onSelect: (id: string) => void;
  onEdit: (account: AccountRow) => void;
  onDelete: (id: string, label: string) => void;
  onVerify: (id: string, verified: boolean) => void;
}) {
  return (
    <div className="grid gap-3 border-t border-border bg-ivory p-3 sm:grid-cols-2 2xl:grid-cols-3">
      {rows.map((a) => {
        const label = a.display_name || a.full_name || a.email || a.id;
        return (
          <article
            key={a.id}
            className={
              "min-w-0 rounded-md border bg-ivory p-4 " +
              (selectedId === a.id ? "border-primary/40" : "border-border")
            }
          >
            <button
              className="max-w-full truncate text-left text-sm font-medium hover:text-primary"
              onClick={() => onSelect(a.id)}
            >
              {label}
            </button>
            <div className="my-2 flex flex-wrap gap-1">
              {(a.roles.length === 0 || a.classification_unconfirmed) && (
                <span className="text-xs text-muted-foreground">Unclassified</span>
              )}
              {a.roles.map((role) => (
                <span key={role} className="rounded bg-teal/15 px-1.5 py-0.5 text-[10px]">
                  {ROLE_LABELS[role]}
                </span>
              ))}
              {a.is_spam && <span className="text-[10px] text-destructive">Spam</span>}
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="truncate" title={a.email ?? undefined}>
                {a.email || "No email"}
              </p>
              <p>{a.contact_no || "No phone"}</p>
              <p className="truncate" title={a.school ?? undefined}>
                {a.school || "No school"}
              </p>
              <p>ID / passport: {a.id_number || "—"}</p>
              <p>Joined {new Date(a.created_at).toLocaleDateString()}</p>
              <p>
                Last accessed{" "}
                {a.last_accessed_at ? new Date(a.last_accessed_at).toLocaleDateString() : "Unknown"}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <label title="ID verified">
                <input
                  type="checkbox"
                  className="accent-teal"
                  checked={a.id_verified === true}
                  disabled={a.id_verified === null || busyId === a.id}
                  onChange={(e) => onVerify(a.id, e.target.checked)}
                  aria-label={"ID verified for " + label}
                />
              </label>
              <UserDocument path={a.id_file_path} kind="id" verified={a.id_verified === true} />
              <UserDocument path={a.photo_path} kind="photo" />
              <button
                onClick={() => onEdit(a)}
                disabled={busyId === a.id}
                className="ml-auto flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
              <button
                onClick={() => onDelete(a.id, label)}
                disabled={busyId === a.id}
                aria-label={"Delete account for " + label}
                className="p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <button onClick={() => onSelect(a.id)} className="mt-3 text-xs text-primary">
              View details · {a.booking_count} bookings
            </button>
          </article>
        );
      })}
    </div>
  );
}

export function AdminUsers() {
  const qc = useQueryClient();
  const updateRoleFn = useServerFn(updateAccount);
  const removeAccountFn = useServerFn(removeAccount);
  const accounts = useQuery({
    queryKey: ["admin", "accounts"],
    queryFn: fetchAllAccounts,
  });
  const [q, setQ] = useState("");
  const [view, setView] = useState<"table" | "cards">("table");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedAccount = accounts.data?.find((account) => account.id === selectedId);
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [expandedApplicationUser, setExpandedApplicationUser] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const FREE_MAIL = new Set([
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "icloud.com",
    "live.com",
    "webmail.co.za",
    "mweb.co.za",
    "telkomsa.net",
    "vodamail.co.za",
  ]);
  const [roleTab, setRoleTab] = useState<AccountRow["roles"][number] | "unclassified">("user");
  const [mentorKind, setMentorKind] = useState<"company" | "independent">("company");
  const isUnclassified = roleTab === "unclassified";
  const accountRole = isUnclassified ? "user" : roleTab;
  const mentorCompanies = useQuery({
    queryKey: ["admin", "company-contact-classification"],
    queryFn: () =>
      fetchAllRows(async (from, to) => {
        const result = await supabase
          .from("companies")
          .select("company,mentor_name,mentor_email,backup_mentor_name,backup_mentor_email")
          .order("id")
          .range(from, to);
        if (result.error) throw result.error;
        return result.data ?? [];
      }),
  });
  const soleMentors = useMemo(
    () =>
      individualMentorEmails(
        (mentorCompanies.data ?? []) as {
          company: string | null;
          mentor_email: string | null;
          backup_mentor_email: string | null;
        }[],
      ),
    [mentorCompanies.data],
  );
  const companyEmails = useMemo(
    () =>
      new Set(
        (
          (mentorCompanies.data ?? []) as {
            mentor_email: string | null;
            backup_mentor_email: string | null;
          }[]
        )
          .flatMap((c) => [c.mentor_email, c.backup_mentor_email])
          .map((e) => (e ?? "").trim().toLowerCase())
          .filter(Boolean),
      ),
    [mentorCompanies.data],
  );
  const mentorDomainCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of accounts.data ?? [])
      if (a.roles.includes("mentor")) {
        const d = (a.email ?? "").toLowerCase().split("@")[1] ?? "";
        if (FREE_MAIL.has(d)) continue;
        m.set(d, (m.get(d) ?? 0) + 1);
      }
    return m;
  }, [accounts.data]);
  // A mentor's own registration answer (host_profiles.via_company) is the source of truth once
  // they've set it; accounts that haven't fall back to the company-record / shared-domain guess.
  const mentorClassifications = useQuery({
    queryKey: ["admin", "mentor-classifications"],
    queryFn: async () => {
      const result = await supabase.rpc("admin_list_mentor_classifications");
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });
  const declaredViaCompany = useMemo(
    () =>
      new Map(
        mentorClassifications.data?.map((row) => [
          row.mentor_email.trim().toLowerCase(),
          row.via_company,
        ]) ?? [],
      ),
    [mentorClassifications.data],
  );
  const isIndependentMentor = (a: AccountRow) => {
    const email = (a.email ?? "").trim().toLowerCase();
    const declared = declaredViaCompany.get(email);
    if (declared !== undefined) return !declared;
    return (
      soleMentors.has(email) ||
      (a.roles.includes("mentor") &&
        !companyEmails.has(email) &&
        (mentorDomainCounts.get(email.split("@")[1] ?? "") ?? 0) < 2)
    );
  };
  const matchesRole = (a: AccountRow, tab = roleTab) => {
    const isMentorPerson =
      a.roles.includes("mentor") || a.roles.includes("hr_admin") || isIndependentMentor(a);
    if (tab === "unclassified")
      return a.classification_unconfirmed === true || (a.roles.length === 0 && !isMentorPerson);
    if (tab === "mentor") return isMentorPerson;
    if (tab === "admin") return a.roles.includes("admin");
    return a.roles.includes(tab);
  };
  const mentorBadge = (a: AccountRow): "IM" | "CM" | null => {
    if (!(a.roles.includes("mentor") || a.roles.includes("hr_admin") || isIndependentMentor(a)))
      return null;
    return isIndependentMentor(a) ? "IM" : "CM";
  };
  const [showSpam, setShowSpam] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [letter, setLetter] = useState<string | null>(null);

  async function setIdVerified(userId: string, verified: boolean) {
    setBusyId(userId);
    try {
      const { error } = await supabase
        .from("scholar_profiles")
        .update({
          id_verified: verified,
          id_verified_at: verified ? new Date().toISOString() : null,
        })
        .eq("user_id", userId);
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
      await updateRoleFn({
        data: {
          userId: editing.id,
          display_name: editing.display_name ?? "",
          first_name: editing.first_name,
          last_name: editing.last_name,
          scholar_first_name: editing.scholar_first_name,
          scholar_last_name: editing.scholar_last_name,
          full_name: editing.full_name ?? "",
          contact_no: editing.contact_no ?? "",
          school: editing.school ?? "",
          id_number: editing.id_number ?? "",
          roles: editing.roles,
        },
      });
      await qc.invalidateQueries({ queryKey: ["admin", "accounts"] });
      setEditing(null);
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteAccountRow(userId: string, label: string) {
    if (
      !(await confirmAction(
        `Permanently delete the account for ${label}? This removes their login and all linked data. This cannot be undone.`,
        { danger: true, confirmLabel: "Delete" },
      ))
    )
      return;
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
        if (roleTab === "mentor" && isIndependentMentor(a) !== (mentorKind === "independent"))
          return false;
        if (!showSpam && a.is_spam) return false;
        if (
          s &&
          ![
            a.email,
            a.display_name,
            a.full_name,
            a.contact_no,
            a.school,
            a.id_number,
            ...a.roles.map((role) => ROLE_LABELS[role]),
          ].some((v) => (v ?? "").toLowerCase().includes(s))
        )
          return false;
        if (letter && accountInitial(a) !== letter) return false;
        return true;
      })
      .sort((a, b) =>
        (a.display_name || a.full_name || a.email || "").localeCompare(
          b.display_name || b.full_name || b.email || "",
        ),
      );
  }, [
    accounts.data,
    q,
    showSpam,
    letter,
    accountRole,
    isUnclassified,
    soleMentors,
    roleTab,
    mentorKind,
  ]);

  const letterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (accounts.data ?? []).forEach((a) => {
      if (!matchesRole(a)) return;
      if (roleTab === "mentor" && isIndependentMentor(a) !== (mentorKind === "independent")) return;
      if (!showSpam && a.is_spam) return;
      const first = accountInitial(a);
      if (first) counts.set(first, (counts.get(first) ?? 0) + 1);
    });
    return counts;
  }, [accounts.data, showSpam, accountRole, isUnclassified, soleMentors, roleTab, mentorKind]);

  return (
    <div>
      {createOpen && (
        <CreateAccountDialog
          role={accountRole}
          label={ROLE_LABELS[accountRole]}
          onClose={() => setCreateOpen(false)}
        />
      )}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open && busyId !== editing?.id) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveAccount();
              }}
              className="space-y-3"
            >
              <p className="text-sm text-muted-foreground">{editing.email}</p>
              <PersonNameFields
                id="admin-account-name"
                label="Account Name"
                firstName={editing.first_name}
                lastName={editing.last_name}
                originalName={editing.display_name}
                disabled={busyId === editing.id}
                onChange={(first, last, full) =>
                  setEditing({ ...editing, first_name: first, last_name: last, display_name: full })
                }
              />
              {editing.has_scholar_profile && (
                <PersonNameFields
                  id="admin-scholar-name"
                  label="Learner Name"
                  firstName={editing.scholar_first_name}
                  lastName={editing.scholar_last_name}
                  originalName={editing.full_name}
                  disabled={busyId === editing.id}
                  onChange={(first, last, full) =>
                    setEditing({
                      ...editing,
                      scholar_first_name: first,
                      scholar_last_name: last,
                      full_name: full,
                    })
                  }
                />
              )}
              {(
                [
                  ["contact_no", "Mobile Number"],
                  ["school", "School"],
                  ["id_number", "ID / passport number"],
                ] as const
              ).map(([field, label]) => (
                <label key={field} className="block text-sm">
                  {label}
                  {field === "contact_no" ? (
                    <PhoneInput
                      label={label}
                      disabled={busyId === editing.id || !editing.has_scholar_profile}
                      value={editing.contact_no ?? ""}
                      onChange={(value) => setEditing({ ...editing, contact_no: value })}
                    />
                  ) : (
                    <input
                      disabled={busyId === editing.id || !editing.has_scholar_profile}
                      value={editing[field] ?? ""}
                      onChange={(e) => setEditing({ ...editing, [field]: e.target.value })}
                      className="mt-1 w-full rounded border border-input bg-background px-3 py-2 disabled:opacity-50"
                    />
                  )}
                </label>
              ))}
              {!editing.has_scholar_profile && (
                <p className="text-xs text-muted-foreground">
                  Scholar details can be edited once this user has a scholar profile. Imported
                  details remain on the original application.
                </p>
              )}
              <details className="rounded border border-input p-3">
                <summary className="cursor-pointer text-sm">
                  User types:{" "}
                  {editing.roles.map((role) => ROLE_LABELS[role]).join(", ") || "Select roles"}
                </summary>
                <div className="mt-2 space-y-2">
                  {(Object.keys(ROLE_LABELS) as AccountRow["roles"][number][]).map((role) => (
                    <label key={role} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        disabled={busyId === editing.id}
                        checked={editing.roles.includes(role)}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            roles: e.target.checked
                              ? [...editing.roles, role]
                              : editing.roles.filter((item) => item !== role),
                          })
                        }
                      />
                      {ROLE_LABELS[role]}
                    </label>
                  ))}
                </div>
              </details>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busyId === editing.id}
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button disabled={busyId === editing.id || editing.roles.length === 0}>
                  {busyId === editing.id ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <AdminScreenHeader
        title="Users"
        actions={
          <div
            role="group"
            aria-label="Users view"
            className="flex rounded border border-border p-0.5"
          >
            {(
              [
                ["table", List, "Table"],
                ["cards", LayoutGrid, "Cards"],
              ] as const
            ).map(([value, Icon, label]) => (
              <button
                key={value}
                onClick={() => setView(value)}
                aria-pressed={view === value}
                className={
                  "flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs transition " +
                  (view === value ? "bg-background text-primary" : "hover:bg-primary/5")
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        }
      />
      <Tabs
        value={roleTab}
        onValueChange={(value) => {
          setRoleTab(value as AccountRow["roles"][number] | "unclassified");
          setLetter(null);
          setOpenGroups([]);
          setSelectedId(null);
        }}
      >
        <div className="overflow-x-auto bg-ivory px-6 py-4">
          <TabsList aria-label="User Type">
            {(
              [
                ["user", "Scholars"],
                ["mentor", "Mentors"],
                ["school", "Schools"],
                ["admin", "Admin"],
              ] as const
            ).map(([role, name]) => (
              <TabsTrigger key={role} value={role}>
                {name} (
                {role === "school"
                  ? schoolDirectory(accounts.data ?? []).length
                  : (accounts.data ?? []).filter(
                      (user) => matchesRole(user, role) && (showSpam || !user.is_spam),
                    ).length}
                )
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value={roleTab} className="mt-0">
          {roleTab === "school" ? (
            <SchoolsDirectory
              accounts={accounts.data ?? []}
              onAdd={() => setCreateOpen(true)}
              onEdit={(account) => setEditing({ ...account, roles: [...account.roles] })}
              onDelete={deleteAccountRow}
              busyId={busyId}
            />
          ) : (
            <>
              {roleTab === "mentor" && (
                <div className="bg-ivory px-4 pt-3">
                  <Tabs
                    value={mentorKind}
                    onValueChange={(value) => {
                      setMentorKind(value as "company" | "independent");
                      setLetter(null);
                      setOpenGroups([]);
                      setSelectedId(null);
                    }}
                  >
                    <TabsList aria-label="Mentor type">
                      <TabsTrigger value="company">Company</TabsTrigger>
                      <TabsTrigger value="independent">Independent</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <ProviderDirectory
                    key={mentorKind}
                    kind="mentor"
                    year={null}
                    mentorType={mentorKind}
                  />
                </div>
              )}
              <MentorAccountGroup collapsed={roleTab === "mentor"} count={rows.length}>
                <div className="flex flex-col items-start xl:flex-row">
                  <div className={"min-w-0 w-full flex-1 px-4 py-2 text-foreground " + "bg-ivory"}>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        aria-pressed={letter === null}
                        onClick={() => {
                          setLetter(null);
                          setOpenGroups([]);
                        }}
                        className={`rounded-full px-2.5 py-1.5 text-xs font-medium uppercase transition ${letter === null ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground hover:bg-teal/20"}`}
                      >
                        All
                      </button>
                      {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((ch) => {
                        const count = letterCounts.get(ch) ?? 0;
                        return (
                          <button
                            key={ch}
                            type="button"
                            aria-pressed={letter === ch}
                            onClick={() => {
                              setLetter(ch);
                              setOpenGroups([ch]);
                            }}
                            disabled={count === 0}
                            className={`rounded-full px-2.5 py-1.5 text-xs font-medium uppercase transition ${letter === ch ? "bg-primary text-primary-foreground" : count === 0 ? "bg-muted/30 text-muted-foreground/50" : "bg-muted/70 text-foreground hover:bg-teal/20"}`}
                          >
                            {ch}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex flex-wrap items-end gap-4">
                      <label className="block max-w-sm text-sm">
                        Search
                        <input
                          value={q}
                          onChange={(e) => setQ(e.target.value)}
                          placeholder="Name, email, school, company or career"
                          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none"
                        />
                      </label>
                      {!isUnclassified && (
                        <Button className="ml-auto" onClick={() => setCreateOpen(true)}>
                          Add {ROLE_LABELS[accountRole]}
                        </Button>
                      )}
                    </div>
                    {accounts.isLoading ? (
                      <p className="mt-6">Loading…</p>
                    ) : accounts.error ? (
                      <p className="mt-6 text-destructive">{(accounts.error as Error).message}</p>
                    ) : (
                      <div
                        className={
                          view === "table"
                            ? "mt-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-track]:bg-muted"
                            : ""
                        }
                      >
                        <div className={view === "table" ? "min-w-[1100px]" : ""}>
                          {view === "table" && rows.length > 0 && (
                            <div className="border border-b-0 border-border">
                              <table className="w-full min-w-[1100px] table-fixed text-left text-xs">
                                <UserTableColumns />
                                <thead className="bg-background/40 text-foreground">
                                  <tr>
                                    {[
                                      "First Name",
                                      "Last Name",
                                      "Email",
                                      "ID / passport",
                                      "School",
                                      "Documents",
                                      "Applications",
                                      "Last Accessed",
                                      "Actions",
                                    ].map((heading) => (
                                      <th
                                        key={heading}
                                        className={`whitespace-nowrap px-3 py-2 font-normal ${heading === "Actions" ? "text-right" : ""}`}
                                      >
                                        {heading}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                              </table>
                            </div>
                          )}
                          <Accordion
                            type="multiple"
                            value={openGroups}
                            onValueChange={setOpenGroups}
                            className="border-t border-border"
                          >
                            {[...new Set(rows.map((a) => accountInitial(a)))]
                              .sort((a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)))
                              .map((group) => (
                                <AccordionItem key={group} value={group}>
                                  <AccordionTrigger className="px-3 py-3 text-sm hover:no-underline hover:bg-muted/30">
                                    <span className="font-bold text-primary">{group}</span>&nbsp;
                                    <span className="text-muted-foreground">
                                      ({rows.filter((a) => accountInitial(a) === group).length})
                                    </span>
                                  </AccordionTrigger>
                                  <AccordionContent className="pb-0">
                                    {view === "cards" ? (
                                      <UserCards
                                        rows={rows.filter((a) => accountInitial(a) === group)}
                                        selectedId={selectedId}
                                        busyId={busyId}
                                        onSelect={setSelectedId}
                                        onEdit={(a) => setEditing({ ...a, roles: [...a.roles] })}
                                        onDelete={deleteAccountRow}
                                        onVerify={setIdVerified}
                                      />
                                    ) : (
                                      <div className="border-t border-border">
                                        <table className="w-full min-w-[1100px] table-fixed text-left text-xs">
                                          <UserTableColumns />
                                          <tbody>
                                            {rows
                                              .filter((a) => accountInitial(a) === group)
                                              .map((a) => (
                                                <UserTableRow
                                                  key={a.id}
                                                  a={a}
                                                  selectedId={selectedId}
                                                  busyId={busyId}
                                                  expandedApplicationUser={expandedApplicationUser}
                                                  mentorBadge={mentorBadge(a)}
                                                  onSelect={setSelectedId}
                                                  onEdit={() =>
                                                    setEditing({ ...a, roles: [...a.roles] })
                                                  }
                                                  onDelete={deleteAccountRow}
                                                  onVerify={setIdVerified}
                                                  onToggleExpand={() =>
                                                    setExpandedApplicationUser(
                                                      expandedApplicationUser === a.id
                                                        ? null
                                                        : a.id,
                                                    )
                                                  }
                                                />
                                              ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            {rows.length === 0 && (
                              <p className="py-6 text-sm text-muted-foreground">
                                No users match "{q}".
                              </p>
                            )}
                          </Accordion>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedAccount && (
                    <UserDetailPanel
                      account={selectedAccount}
                      mentorInfo={mentorClassifications.data?.find(
                        (row) =>
                          row.mentor_email.trim().toLowerCase() ===
                          (selectedAccount.email ?? "").trim().toLowerCase(),
                      )}
                      onClose={() => setSelectedId(null)}
                      onEdit={() =>
                        setEditing({ ...selectedAccount, roles: [...selectedAccount.roles] })
                      }
                    />
                  )}
                </div>
              </MentorAccountGroup>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MentorAccountGroup({
  collapsed,
  count,
  children,
}: {
  collapsed: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return collapsed ? (
    <details className="border-t border-border bg-ivory">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
        Registered mentor accounts ({count})
      </summary>
      {children}
    </details>
  ) : (
    <>{children}</>
  );
}

type EmailRow = {
  id: string;
  recipient: string | null;
  subject: string;
  body: string;
  template: string;
  status: string;
  created_at: string;
};

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
    queryFn: async () =>
      ((
        await supabase
          .from("email_outbox")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500)
      ).data ?? []) as EmailRow[],
  });
  const qc = useQueryClient();
  const send = useServerFn(sendQueuedEmails);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  async function flush(retryFailed: boolean) {
    setSending(true);
    setSendMsg(null);
    try {
      const r = await send({ data: { retryFailed } });
      const failed = r.results.filter((x) => !x.ok);
      setSendMsg(
        `Sent ${r.sent} of ${r.processed}.` +
          (failed.length ? ` First error: ${failed[0]?.error}` : ""),
      );
    } catch (e) {
      setSendMsg((e as Error).message);
    }
    setSending(false);
    qc.invalidateQueries({ queryKey: ["admin", "email_outbox"] });
  }
  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return (emails.data ?? []).filter(
      (e) =>
        (statusFilter === "all" || e.status === statusFilter) &&
        (!s ||
          [e.recipient, e.subject, e.template, e.status].some((v) =>
            (v ?? "").toLowerCase().includes(s),
          )),
    );
  }, [emails.data, q, statusFilter]);
  const selected = rows.find((e) => e.id === selectedId) ?? rows[0] ?? null;
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: (emails.data ?? []).length };
    for (const e of emails.data ?? []) counts[e.status] = (counts[e.status] ?? 0) + 1;
    return counts;
  }, [emails.data]);

  return (
    <div>
      <div className="border-b border-border bg-background px-6 py-6 text-foreground">
        <h1 className="font-display text-2xl uppercase">Email Archive</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-6 py-3">
        <button
          onClick={() => flush(false)}
          disabled
          className="rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-xs font-medium uppercase tracking-wide text-foreground disabled:opacity-50"
        >
          Send queued emails now
        </button>
        <button
          onClick={() => flush(true)}
          disabled
          className="bg-primary px-4 py-2 text-xs font-medium uppercase tracking-wide text-primary-foreground disabled:opacity-50"
        >
          Retry failed emails
        </button>
        <p className="text-sm">Email delivery is paused during development.</p>
        {sendMsg && <p className="text-sm break-words">{sendMsg}</p>}
      </div>
      <div className="flex min-h-[70vh] flex-col bg-background text-foreground md:flex-row">
        {/* Mailbox sidebar: status "folders" */}
        <div className="shrink-0 border-b border-border bg-muted/30 md:w-48 md:border-b-0 md:border-r">
          <nav className="flex gap-1 overflow-x-auto p-2 md:block md:space-y-1 md:overflow-visible">
            {(["all", "queued", "sent", "failed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium capitalize ${statusFilter === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {s === "all" ? "Inbox" : s}
                <span className="text-xs opacity-70">{statusCounts[s] ?? 0}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Message list */}
        <div className="flex w-full flex-col border-b border-border md:w-80 md:shrink-0 md:border-b-0 md:border-r">
          <div className="border-b border-border p-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search mail…"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none"
            />
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
                    <span className="truncate font-medium">
                      {e.recipient || "(no address on file)"}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${STATUS_BADGE[e.status] ?? "bg-muted"}`}
                    >
                      {e.status}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate">{e.subject}</p>
                  <p className="mt-0.5 truncate text-muted-foreground">
                    {e.template} · {new Date(e.created_at).toLocaleString()}
                  </p>
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
                <p className="mt-1 text-xs text-muted-foreground">
                  To: {selected.recipient || "(no address on file)"} · {selected.template} ·{" "}
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-semibold uppercase ${STATUS_BADGE[selected.status] ?? "bg-muted"}`}
                  >
                    {selected.status}
                  </span>{" "}
                  · {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
              <iframe
                title={`Preview: ${selected.subject}`}
                srcDoc={renderEmailHtml(selected)}
                className="mt-3 h-[560px] w-full rounded border border-border bg-background"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type EvaluationRow = {
  id: string;
  booking_id: string;
  role: "scholar" | "mentor";
  ratings: number[];
  continue_text: string | null;
  stop_text: string | null;
  start_text: string | null;
  extra_text: string | null;
  comments_text: string | null;
  created_at: string;
};

function LegalContentEditor() {
  const qc = useQueryClient();
  const docs = useQuery({
    queryKey: ["admin", "legal_documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("legal_documents").select("*").order("key");
      if (error) throw error;
      const order = [
        "legal_review_notice",
        "privacy_policy",
        "consent_forms",
        "platform_terms",
        "standard_indemnity_clauses",
      ];
      return (data ?? []).sort((a, b) => {
        const rank = (key: string) => {
          const index = order.indexOf(key);
          return index < 0 ? order.length : index;
        };
        return rank(a.key) - rank(b.key) || a.title.localeCompare(b.title);
      });
    },
  });
  const [editing, setEditing] = useState<{ key: string; title: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!editing) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase
      .from("legal_documents")
      .update({ title: editing.title, body: editing.body })
      .eq("key", editing.key);
    setBusy(false);
    if (error) return setErr(error.message);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin", "legal_documents"] });
    notify("Saved.", "success");
  }

  return (
    <div>
      <div className="border-b border-border bg-background px-6 py-6 text-foreground">
        <h1 className="font-display text-2xl uppercase">Legal Content</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit the text shown on /legal and in the indemnity signing flow directly — no code change
          needed. Use "## Heading" on its own line for a section heading; leave a blank line between
          paragraphs.
        </p>
      </div>
      <div className="bg-background px-6 py-6 text-foreground">
        {editing ? (
          <div className="space-y-3">
            <label className="block text-sm">
              Title
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none"
              />
            </label>
            <label className="block text-sm">
              Body
              <textarea
                rows={20}
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                className="mt-1 w-full rounded border border-input bg-transparent p-2 font-mono text-xs outline-none"
              />
            </label>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <div className="flex gap-2">
              <Button onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : docs.isLoading ? (
          <p>Loading…</p>
        ) : (
          <div className="space-y-2">
            {docs.data?.map((d) => (
              <div
                key={d.key}
                className="flex items-center justify-between rounded border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{d.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(d.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setEditing({ key: d.key, title: d.title, body: d.body })}
                >
                  Edit
                </Button>
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
    queryFn: async () =>
      ((await supabase.from("evaluations").select("*").order("created_at", { ascending: false }))
        .data ?? []) as EvaluationRow[],
  });
  const bookingIds = useMemo(
    () => [...new Set((evals.data ?? []).map((e) => e.booking_id))],
    [evals.data],
  );
  const bookings = useQuery({
    queryKey: ["admin", "evaluations-bookings", bookingIds],
    enabled: bookingIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("bookings")
        .select("id, career, company, shadow_date")
        .in("id", bookingIds);
      return new Map((data ?? []).map((b) => [b.id, b]));
    },
  });

  return (
    <div>
      <div className="border-b border-border bg-background px-6 py-6 text-foreground">
        <h1 className="font-display text-2xl uppercase">Evaluations</h1>
      </div>
      <div className="bg-background px-6 py-6 text-foreground">
        {evals.isLoading ? (
          <p>Loading…</p>
        ) : (evals.data?.length ?? 0) === 0 ? (
          <p>No evaluations submitted yet.</p>
        ) : (
          <div className="space-y-2">
            {evals.data!.map((e) => {
              const b = bookings.data?.get(e.booking_id);
              const avg = e.ratings.length
                ? (e.ratings.reduce((a, c) => a + c, 0) / e.ratings.length).toFixed(1)
                : "—";
              return (
                <details
                  key={e.id}
                  className="rounded-lg border border-border bg-background/10 p-3 text-sm"
                >
                  <summary className="cursor-pointer">
                    <strong>{e.role === "mentor" ? "Host" : "Scholar"} evaluation</strong> —{" "}
                    {b
                      ? `${b.career} at ${b.company}, ${b.shadow_date}`
                      : `booking #${e.booking_id}`}{" "}
                    · avg rating {avg}/6 · {new Date(e.created_at).toLocaleDateString()}
                  </summary>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">Ratings: {e.ratings.join(", ")}</p>
                    {e.continue_text && (
                      <p>
                        <strong>Continue:</strong> {e.continue_text}
                      </p>
                    )}
                    {e.stop_text && (
                      <p>
                        <strong>Stop:</strong> {e.stop_text}
                      </p>
                    )}
                    {e.start_text && (
                      <p>
                        <strong>Start:</strong> {e.start_text}
                      </p>
                    )}
                    {e.extra_text && (
                      <p>
                        <strong>Additional:</strong> {e.extra_text}
                      </p>
                    )}
                    {e.comments_text && (
                      <p>
                        <strong>Comments:</strong> {e.comments_text}
                      </p>
                    )}
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

const BOOKING_STATUS_LABELS: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  indemnity_required: "Paid – indemnity needed",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

function ProviderDirectory({
  kind,
  year,
  mentorType = "independent",
}: {
  kind: "mentor" | "host";
  year: number | null;
  mentorType?: "company" | "independent";
}) {
  const qc = useQueryClient();
  const config = TABLES.find((entry) => entry.id === "companies")!;
  const data = useQuery({
    queryKey: ["admin", "companies", false],
    queryFn: () =>
      fetchAllRows(async (from, to) => {
        const result = await supabase
          .from("companies")
          .select("*")
          .order("id", { ascending: false })
          .range(from, to);
        if (result.error) throw result.error;
        return result.data ?? [];
      }),
  });
  const [search, setSearch] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const [open, setOpen] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expandedHosts, setExpandedHosts] = useState<string[]>([]);
  const all = (data.data ?? []).filter((row) => year === null || row["year"] === year);
  const mentors = mentorGroups(all);
  const hostKeys = new Set(
    providerGroups(all)
      .filter((group) => group.kind === "host")
      .map((group) => group.key),
  );
  const groups = (
    kind === "mentor"
      ? mentors.filter((m) =>
          mentorType === "company"
            ? hostKeys.has(companyKey(m.company))
            : !hostKeys.has(companyKey(m.company)),
        )
      : providerGroups(all).filter((group) => group.kind === "host")
  ).sort((a, b) =>
    (kind === "mentor" ? a.names[0] || a.company : a.company).localeCompare(
      kind === "mentor" ? b.names[0] || b.company : b.company,
    ),
  );
  const initial = (group: (typeof groups)[number]) =>
    alphabetInitial(kind === "mentor" ? group.names[0] || group.company : group.company);
  const matches = groups.filter(
    (group) =>
      (!letter || initial(group) === letter) &&
      (!search.trim() ||
        [group.company, ...group.names, ...group.emails, ...group.careers]
          .join(" ")
          .toLowerCase()
          .includes(search.trim().toLowerCase())),
  );
  const detail = groups.find((group) => group.key === selected);
  const refresh = () => {
    setEditing(null);
    setCreating(false);
    void qc.invalidateQueries({ queryKey: ["admin", "companies"] });
    void qc.invalidateQueries({ queryKey: ["admin", "company-contact-classification"] });
  };
  async function remove(record: Record<string, unknown>) {
    if (
      !(await confirmAction(
        "Delete this placement record? Other placements and contact records are kept.",
        { danger: true, confirmLabel: "Delete placement" },
      ))
    )
      return;
    const result = await supabase.from("companies").delete().eq("id", Number(record["id"]));
    if (result.error) return setErr(result.error.message);
    refresh();
  }
  if (editing)
    return (
      <EditRecord
        title="Companies"
        table="companies"
        cols={config.cols}
        row={editing}
        onDone={refresh}
        onCancel={() => setEditing(null)}
      />
    );
  if (creating) return <CreateRole onDone={refresh} onCancel={() => setCreating(false)} />;
  return (
    <section className="bg-ivory">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-ivory px-6 py-6 text-foreground">
        <h1 className="font-display text-2xl uppercase">
          {kind === "mentor"
            ? mentorType === "company"
              ? "Company Mentors"
              : "Independent Mentors"
            : "Hosts"}
        </h1>
      </div>
      <div className="space-y-3 px-4 py-3">
        <div className="flex flex-wrap gap-1.5" aria-label="Filter providers alphabetically">
          {["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")].map((ch) => (
            <button
              key={ch}
              disabled={ch !== "All" && !groups.some((group) => initial(group) === ch)}
              aria-pressed={ch === "All" ? !letter : letter === ch}
              onClick={() => {
                setLetter(ch === "All" ? null : ch);
                setOpen(ch === "All" ? [] : [ch]);
              }}
              className={
                "rounded-full px-2.5 py-1.5 text-xs font-medium uppercase transition disabled:opacity-30 " +
                ((ch === "All" ? !letter : letter === ch)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-foreground hover:bg-teal/20")
              }
            >
              {ch}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="block max-w-sm flex-1 text-sm">
            Search
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, company, email or career"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button onClick={() => setCreating(true)}>Add placement</Button>
            <Button
              variant="outline"
              disabled={data.isPending || !!data.error}
              onClick={() =>
                exportCsv("Company contacts full", completeExportColumns(config.cols, all), all)
              }
            >
              Export all
            </Button>
          </div>
        </div>
        {err && (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        )}
        {data.isPending ? (
          <p className="py-4 text-sm">Loading…</p>
        ) : data.error ? (
          <p role="alert" className="py-4 text-sm text-destructive">
            Unable to load contact records.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto pb-1">
              <div className="min-w-[650px]">
                {matches.length > 0 && (
                  <div className="border-b border-border">
                    <table className="w-full min-w-[650px] table-fixed text-left text-xs">
                      <colgroup>
                        <col className="w-[28%]" />
                        <col className="w-[24%]" />
                        <col className="w-[26%]" />
                        <col className="w-[8%]" />
                        <col className="w-[14%]" />
                      </colgroup>
                      <thead>
                        <tr>
                          {[
                            kind === "mentor" ? "Mentor" : "Company",
                            kind === "mentor" ? "Company" : "Mentors",
                            "Email",
                            "Careers",
                            "Actions",
                          ].map((heading) => (
                            <th key={heading} className="whitespace-nowrap px-3 py-2 font-medium">
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    </table>
                  </div>
                )}
                <Accordion
                  type="multiple"
                  value={open}
                  onValueChange={setOpen}
                  className="border-t border-border"
                >
                  {[...new Set(matches.map(initial))].sort().map((ch) => (
                    <AccordionItem key={ch} value={ch}>
                      <AccordionTrigger className="px-3 py-3 text-sm hover:no-underline hover:bg-muted/30">
                        <span className="font-bold text-primary">{ch}</span>&nbsp;
                        <span className="text-muted-foreground">
                          ({matches.filter((group) => initial(group) === ch).length})
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div>
                          <table className="w-full min-w-[650px] table-fixed text-left text-xs">
                            <colgroup>
                              <col className="w-[28%]" />
                              <col className="w-[24%]" />
                              <col className="w-[26%]" />
                              <col className="w-[8%]" />
                              <col className="w-[14%]" />
                            </colgroup>
                            <tbody>
                              {matches
                                .filter((group) => initial(group) === ch)
                                .map((group) => {
                                  const childMentors =
                                    kind === "host"
                                      ? mentors.filter((m) => companyKey(m.company) === group.key)
                                      : [];
                                  const expanded = expandedHosts.includes(group.key);
                                  return (
                                    <Fragment key={group.key}>
                                      <tr className="border-t border-warm-divider hover:bg-teal/5">
                                        <td className="px-3 py-2 font-medium">
                                          {kind === "mentor"
                                            ? group.names.join(" · ") || "Name not recorded"
                                            : group.company}
                                        </td>
                                        <td
                                          className="truncate px-3 py-2"
                                          title={
                                            kind === "mentor"
                                              ? group.company
                                              : group.names.join(", ")
                                          }
                                        >
                                          {kind === "mentor" ? (
                                            group.company
                                          ) : childMentors.length > 0 ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setExpandedHosts(
                                                  expanded
                                                    ? expandedHosts.filter(
                                                        (key) => key !== group.key,
                                                      )
                                                    : [...expandedHosts, group.key],
                                                )
                                              }
                                              aria-expanded={expanded}
                                              className="flex items-center gap-1 hover:text-primary"
                                            >
                                              <ChevronDown
                                                className={
                                                  "h-3 w-3 shrink-0 transition " +
                                                  (expanded ? "rotate-180" : "")
                                                }
                                              />
                                              {childMentors.length} mentor
                                              {childMentors.length === 1 ? "" : "s"}
                                            </button>
                                          ) : (
                                            group.names.join(", ") || "Name not recorded"
                                          )}
                                        </td>
                                        <td
                                          className="truncate px-3 py-2"
                                          title={
                                            kind === "mentor" ? group.emails.join(", ") : undefined
                                          }
                                        >
                                          {kind === "mentor"
                                            ? group.emails.join(", ") || "Not recorded"
                                            : ""}
                                        </td>
                                        <td className="px-3 py-2">{group.careers.length}</td>
                                        <td className="px-3 py-2">
                                          <button
                                            onClick={() => setSelected(group.key)}
                                            className="whitespace-nowrap rounded border border-border px-2 py-1"
                                          >
                                            View / edit
                                          </button>
                                        </td>
                                      </tr>
                                      {expanded &&
                                        childMentors.map((mentor) => (
                                          <tr
                                            key={mentor.key}
                                            className="border-t border-warm-divider bg-muted/20 text-muted-foreground"
                                          >
                                            <td className="py-2 pl-8 pr-3">
                                              ↳ {mentor.names.join(" · ") || "Name not recorded"}
                                            </td>
                                            <td className="truncate px-3 py-2"></td>
                                            <td
                                              className="truncate px-3 py-2"
                                              title={mentor.emails.join(", ")}
                                            >
                                              {mentor.emails.join(", ") || "Not recorded"}
                                            </td>
                                            <td className="px-3 py-2">{mentor.careers.length}</td>
                                            <td className="px-3 py-2"></td>
                                          </tr>
                                        ))}
                                    </Fragment>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                  {!matches.length && (
                    <p className="py-4 text-sm text-muted-foreground">
                      No matching contact records.
                    </p>
                  )}
                </Accordion>
              </div>
            </div>
          </>
        )}
      </div>
      <Sheet
        open={!!detail}
        onOpenChange={(value) => {
          if (!value) setSelected(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto bg-ivory sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{detail?.company}</SheetTitle>
            <SheetDescription>
              {kind === "mentor"
                ? "Individual mentor and linked placements"
                : "Host company and contributing mentors"}
            </SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-4 space-y-4">
              <p className="text-sm">{detail.names.join(" · ")}</p>
              <p className="break-words text-xs text-muted-foreground">
                {detail.emails.join(", ")}
              </p>
              {detail.records.map((record) => (
                <details key={String(record["id"])} className="rounded border border-border p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    {String(record["career"] || "Placement")} ·{" "}
                    {String(record["location"] || "Location not recorded")}
                  </summary>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelected(null);
                        setEditing(record);
                      }}
                    >
                      Edit placement
                    </Button>
                    <Button variant="outline" onClick={() => void remove(record)}>
                      Delete placement
                    </Button>
                  </div>
                  <dl className="mt-3 space-y-3 text-xs">
                    {Object.entries(record).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-muted-foreground">{key.replaceAll("_", " ")}</dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words">
                          {value == null
                            ? "Not recorded"
                            : typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}

function CompaniesList({ kind }: { kind?: "mentor" | "host" } = {}) {
  const config = TABLES.find((entry) => entry.id === "companies")!;
  return (
    <DataTable
      title={
        kind === "mentor"
          ? "Mentor records"
          : kind === "host"
            ? "Host company records"
            : config.singular
      }
      table={config.table}
      cols={config.cols}
      companyKind={kind}
    />
  );
}

function CompanyPlacements() {
  const qc = useQueryClient();
  const thisYear = new Date().getFullYear();
  const years = useQuery({
    queryKey: ["admin", "company-years"],
    queryFn: async () => {
      const rows = await fetchAllRows(async (from, to) => {
        const result = await supabase.from("companies").select("year").order("id").range(from, to);
        if (result.error) throw result.error;
        return result.data ?? [];
      });
      return [...new Set((rows as { year: number }[]).map((r) => r.year))].sort((a, b) => b - a);
    },
  });
  const [year, setYear] = useState<number | null>(null);
  const [copying, setCopying] = useState(false);
  useEffect(() => {
    if (year === null && years.data?.length)
      setYear(years.data.includes(thisYear) ? thisYear : years.data[0]!);
  }, [years.data]);

  async function copyForward() {
    if (year === null) return;
    const toYear = year + 1;
    if (
      !(await confirmAction(
        `Copy every ${year} host/mentor record forward to ${toYear}? You can then remove the ones no longer mentoring in ${toYear}. The ${year} records are kept as-is.`,
        { confirmLabel: "Copy forward" },
      ))
    )
      return;
    setCopying(true);
    try {
      const { data: count, error } = await supabase.rpc("copy_companies_to_year", {
        _from_year: year,
        _to_year: toYear,
      });
      if (error) throw new Error(error.message);
      notify(`Copied ${count ?? 0} record${count === 1 ? "" : "s"} to ${toYear}.`, "success");
      await qc.invalidateQueries({ queryKey: ["admin", "companies"] });
      await qc.invalidateQueries({ queryKey: ["admin", "company-years"] });
      setYear(toYear);
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setCopying(false);
    }
  }

  return (
    <Tabs defaultValue="host" className="bg-ivory">
      <AdminScreenHeader
        title="Companies"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm">
              Year
              <select
                value={year ?? ""}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded border border-input bg-background px-2 py-1.5 text-sm"
              >
                {(years.data ?? []).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              disabled={year === null || copying}
              onClick={() => void copyForward()}
            >
              {copying ? "Copying…" : `Copy ${year ?? ""} to ${year !== null ? year + 1 : ""}`}
            </Button>
          </div>
        }
      />
      <div className="overflow-x-auto bg-ivory px-6 py-4">
        <TabsList aria-label="Company placements">
          <TabsTrigger value="host">Hosts</TabsTrigger>
          <TabsTrigger value="mentor">Mentors</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="host" className="mt-0">
        <ProviderDirectory kind="host" year={year} />
      </TabsContent>
      <TabsContent value="mentor" className="mt-0">
        <ProviderDirectory kind="mentor" year={year} />
      </TabsContent>
    </Tabs>
  );
}

function CareersAndSectors() {
  return (
    <Tabs defaultValue="sectors" className="min-h-screen bg-ivory">
      <AdminScreenHeader title="Career Management" />
      <div className="overflow-x-auto bg-ivory px-6 py-4">
        <TabsList aria-label="Career management">
          <TabsTrigger value="sectors">Sectors</TabsTrigger>
          <TabsTrigger value="careers">Careers</TabsTrigger>
        </TabsList>
      </div>
      {(["sectors", "careers"] as const).map((id) => {
        const config = TABLES.find((entry) => entry.id === id)!;
        return (
          <TabsContent key={id} value={id} className="mt-0">
            <DataTable title={config.singular} table={config.table} cols={config.cols} csvUpload />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function ApplicationsScreen() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const refresh = () => {
    setEditing(null);
    void qc.invalidateQueries({ queryKey: ["admin", "combined-applications"] });
    void qc.invalidateQueries({ queryKey: ["admin", "accounts"] });
  };
  async function remove(row: Record<string, unknown>) {
    if (
      !(await confirmAction(
        "Delete this imported application? The user account and any live bookings are kept.",
        { danger: true, confirmLabel: "Delete application" },
      ))
    )
      return;
    const result = await supabase.from("legacy_applications").delete().eq("id", Number(row["id"]));
    if (result.error) return notify(result.error.message, "error");
    refresh();
  }
  return editing ? (
    <ApplicationEditPanel
      table="legacy_applications"
      row={editing}
      onDone={refresh}
      onCancel={() => setEditing(null)}
    />
  ) : (
    <ApplicationsList onEditImported={setEditing} onDeleteImported={remove} />
  );
}

function RefundRequests() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const requests = useQuery({
    queryKey: ["admin", "pending-refunds"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_pending_refunds");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  async function review(id: string, approve: boolean) {
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("admin_review_no_show_refund", {
        _booking: id,
        _approve: approve,
      });
      if (error) throw new Error(error.message);
      notify(
        approve
          ? "Refund approved and credited to the scholar's wallet."
          : "Refund request declined.",
        "success",
      );
      await qc.invalidateQueries({ queryKey: ["admin", "pending-refunds"] });
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-background p-6">
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        A mentor reported these scholars as no-shows. Approving credits the amount to the scholar's
        wallet (applied automatically to their next booking); declining does nothing.
      </p>
      {requests.isPending ? (
        <p>Loading…</p>
      ) : requests.error ? (
        <p role="alert" className="text-destructive">
          {requests.error.message}
        </p>
      ) : !requests.data?.length ? (
        <p className="text-sm text-muted-foreground">No pending refund requests.</p>
      ) : (
        <div className="max-w-3xl space-y-3">
          {requests.data.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {r.scholar_name ?? "Scholar"} · {r.career} · {r.company}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {r.shadow_date} · R{Number(r.amount_due).toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => void review(r.id, true)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === r.id}
                    onClick={() => void review(r.id, false)}
                  >
                    Decline
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-sm">
                <span className="font-medium">Reason: </span>
                {r.no_show_reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminReports() {
  return (
    <div className="bg-background">
      <AdminScreenHeader title="Reports" />
      <Tabs defaultValue="applications">
        <div className="overflow-x-auto bg-ivory px-6 py-4">
          <TabsList aria-label="Admin reports" className="justify-start">
            {[
              "Applications",
              "Bookings",
              "Refund Requests",
              "Evaluations",
              "Vouchers",
              "CSI",
              "Mentor Coverage",
              "Activity Log",
              "Token Ledger",
            ].map((label) => (
              <TabsTrigger
                key={label}
                value={label.toLowerCase().replaceAll(" / ", "-").replaceAll(" ", "-")}
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="applications" className="mt-0">
          <ApplicationsScreen />
        </TabsContent>
        <TabsContent value="bookings" className="mt-0">
          <LiveBookings />
        </TabsContent>
        <TabsContent value="refund-requests" className="mt-0">
          <RefundRequests />
        </TabsContent>
        <TabsContent value="evaluations" className="mt-0">
          <Evaluations />
        </TabsContent>
        <TabsContent value="vouchers" className="mt-0">
          <VoucherReport />
        </TabsContent>
        <TabsContent value="csi" className="mt-0">
          <BeeCpdReports />
        </TabsContent>
        <TabsContent value="mentor-coverage" className="mt-0">
          <MentorCoverageReport />
        </TabsContent>
        <TabsContent value="activity-log" className="mt-0">
          <AdminLedgerReport table="activity_log" />
        </TabsContent>
        <TabsContent value="token-ledger" className="mt-0">
          <AdminLedgerReport table="ai_token_ledger" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MentorCoverageReport() {
  const companies = useQuery({
    queryKey: ["admin", "mentor-coverage"],
    queryFn: async () => {
      return fetchAllRows(async (from, to) => {
        const result = await supabase
          .from("companies")
          .select(
            "company, career, mentor_name, mentor_email, active, dates, arrival_time, collection_time",
          )
          .order("id")
          .range(from, to);
        if (result.error) throw result.error;
        return result.data ?? [];
      });
    },
  });
  const [filter, setFilter] = useState<"all" | "zero" | "inactive">("zero");
  const rows = useMemo(() => {
    const availability = mentorAvailability(companies.data ?? []);
    return ROLE_TITLES.map((career) => {
      const count = availability.get(career.toLowerCase().replace(/[^a-z0-9]/g, ""));
      return { career, total: count?.total ?? 0, availableNow: count?.available ?? 0 };
    }).sort(
      (a, b) =>
        a.availableNow - b.availableNow || a.total - b.total || a.career.localeCompare(b.career),
    );
  }, [companies.data]);
  const shown = rows.filter((r) =>
    filter === "all" ? true : filter === "zero" ? r.total === 0 : r.availableNow === 0,
  );
  return (
    <div className="bg-background p-6">
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Availability counts distinct primary mentors at each company. An available mentor needs an
        active placement, an upcoming date, and valid start and end times. "No mentors at all" means
        there are no named mentor contacts for that career.
      </p>
      <div role="group" aria-label="Filter by coverage" className="mb-4 flex flex-wrap gap-1.5">
        {(
          [
            ["zero", "No mentors at all"],
            ["inactive", "Not currently available"],
            ["all", "All careers"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${filter === key ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {companies.isPending ? (
        <p>Loading…</p>
      ) : companies.error ? (
        <p role="alert" className="text-destructive">
          {companies.error.message}
        </p>
      ) : (
        <table className="w-full max-w-2xl text-left text-sm">
          <thead>
            <tr>
              <th className="border-b border-border py-2 font-medium">Career</th>
              <th className="border-b border-border py-2 font-medium">Registered mentors</th>
              <th className="border-b border-border py-2 font-medium">Available now</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.career} className="border-b border-border">
                <td className="py-2">{r.career}</td>
                <td className="py-2">
                  {r.total === 0 ? (
                    <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                      No mentors at all
                    </span>
                  ) : (
                    r.total
                  )}
                </td>
                <td className="py-2">
                  {r.total > 0 && r.availableNow === 0 ? (
                    <span className="rounded-full bg-accent/60 px-2 py-0.5 text-xs font-semibold">
                      Not currently available
                    </span>
                  ) : (
                    r.availableNow
                  )}
                </td>
              </tr>
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={3} className="py-4 text-muted-foreground">
                  No careers match this filter.
                </td>
              </tr>
            )}
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
      const { data, error } = await supabase
        .from("companies")
        .select("company, hr_email")
        .order("company");
      if (error) throw new Error(error.message);
      // Group by hr_email: the companies table has one row per career/placement listing, so the
      // same real company (same HR contact) can have several rows — one entry per HR contact here.
      const byEmail = new Map<string, { company: string; hr_email: string }>();
      for (const c of data ?? []) {
        if (!c.hr_email) continue;
        const key = c.hr_email.toLowerCase();
        const existing = byEmail.get(key);
        if (!existing) byEmail.set(key, { company: c.company ?? "", hr_email: c.hr_email });
        else if (c.company && !existing.company.split(", ").includes(c.company))
          existing.company = [...existing.company.split(", "), c.company]
            .filter(Boolean)
            .sort()
            .join(", ");
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
  return (
    <div className="p-6">
      <p className="text-sm text-muted-foreground">
        Sends each company's HR contact a B-BBEE Skills Development / CSI report of the job shadows
        they've hosted, with the demographic breakdown needed to claim CPD points and CSI spend
        credit. Companies can also view and export this themselves at <code>/company-report</code>{" "}
        once signed in with their HR email.
      </p>
      <div className="mt-4 overflow-x-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-track]:bg-muted">
        <table className="w-full min-w-[600px] text-left text-xs">
          <thead>
            <tr>
              <th className="border-b border-border px-3 py-2 font-medium">Company</th>
              <th className="border-b border-border px-3 py-2 font-medium">HR email</th>
              <th className="border-b border-border px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {companies.isPending ? (
              <tr>
                <td colSpan={3} className="p-4">
                  Loading…
                </td>
              </tr>
            ) : (
              (companies.data ?? []).map((c) => (
                <tr key={c.hr_email} className="border-b border-border/60">
                  <td className="px-3 py-2">{c.company}</td>
                  <td className="px-3 py-2">{c.hr_email || "—"}</td>
                  <td className="px-3 py-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!c.hr_email || sendingEmail === c.hr_email}
                      onClick={() => emailReport(c.hr_email)}
                    >
                      {sendingEmail === c.hr_email
                        ? "Sending…"
                        : sentEmail === c.hr_email
                          ? "Sent"
                          : "Email report"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VoucherReport() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const qc = useQueryClient();
  const refresh = () => {
    setEditing(null);
    void qc.invalidateQueries({ queryKey: ["admin", "voucher-report"] });
    void qc.invalidateQueries({ queryKey: ["admin", "vouchers"] });
  };
  async function removeVoucher(row: Record<string, unknown>) {
    if (
      !(await confirmAction(
        "Delete this voucher? Existing bookings keep their recorded discount.",
        { danger: true, confirmLabel: "Delete voucher" },
      ))
    )
      return;
    const result = await supabase.from("vouchers").delete().eq("id", Number(row["id"]));
    if (result.error) return notify(result.error.message, "error");
    refresh();
  }
  const report = useQuery({
    queryKey: ["admin", "voucher-report"],
    queryFn: async () => {
      const [vouchers, bookings] = await Promise.all([
        fetchAllRows(async (from, to) => {
          const result = await supabase.from("vouchers").select("*").order("id").range(from, to);
          if (result.error) throw result.error;
          return result.data ?? [];
        }),
        fetchAllRows(async (from, to) => {
          const result = await supabase
            .from("bookings")
            .select("id, voucher_code, paid_at, status")
            .order("id")
            .range(from, to);
          if (result.error) throw result.error;
          return result.data ?? [];
        }),
      ]);
      return vouchers.map((voucher) => {
        const code = String(voucher["code"] ?? "")
          .trim()
          .toLowerCase();
        const uses = code
          ? bookings.filter(
              (booking) =>
                String(booking["voucher_code"] ?? "")
                  .trim()
                  .toLowerCase() === code,
            )
          : [];
        return {
          ...voucher,
          bookings: uses.length,
          paid_bookings: uses.filter((booking) => !!booking["paid_at"]).length,
          cancelled_bookings: uses.filter((booking) =>
            ["cancelled", "canceled"].includes(String(booking["status"])),
          ).length,
        };
      });
    },
  });
  const columns: Col[] = [
    { key: "name", label: "Name" },
    { key: "code", label: "Code" },
    { key: "discount", label: "Discount" },
    { key: "available_from", label: "From" },
    { key: "available_until", label: "Until" },
    { key: "usage_limit", label: "Usage limit" },
    { key: "bookings", label: "All bookings" },
    { key: "paid_bookings", label: "Paid bookings" },
    { key: "cancelled_bookings", label: "Cancelled bookings" },
  ];
  const all = (report.data ?? []) as Record<string, unknown>[];
  const rows = all.filter((row) =>
    [row["name"], row["code"]].some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(search.toLowerCase().trim()),
    ),
  );
  return (
    <section className="bg-ivory">
      {editing && (
        <VoucherEditor
          voucher={editing}
          known={all}
          onDone={refresh}
          onCancel={() => setEditing(null)}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-ivory px-6 py-6 text-foreground">
        <h1 className="font-display text-2xl uppercase">Vouchers</h1>
      </div>
      <div className="flex flex-wrap items-end gap-4 px-6 py-6">
        <label className="block max-w-sm flex-1 text-sm">
          Search
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Voucher name or code"
            className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
          />
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button disabled={report.isPending || !!report.error} onClick={() => setEditing({})}>
            Add voucher
          </Button>
          <Button
            disabled={report.isPending || !!report.error}
            onClick={() => exportCsv("Voucher report", completeExportColumns(columns, all), all)}
            variant="outline"
          >
            Export all
          </Button>
        </div>
      </div>
      <p className="px-6 text-xs text-muted-foreground">
        Counts include all matching bookings; paid and cancelled counts are shown separately.
      </p>
      <div className="mt-4 overflow-x-auto px-6 pb-6 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-track]:bg-muted">
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap border-b border-border px-3 py-2 font-medium"
                >
                  {column.label}
                </th>
              ))}
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {report.isPending ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-4">
                  Loading…
                </td>
              </tr>
            ) : report.error ? (
              <tr>
                <td colSpan={columns.length + 1} role="alert" className="p-4 text-destructive">
                  {report.error.message}
                </td>
              </tr>
            ) : !rows.length ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-4">
                  No vouchers match this search.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={String(row["id"])}>
                  {columns.map((column) => (
                    <td key={column.key} className="border-b border-border px-3 py-2">
                      {fmtCell(row[column.key]) || "—"}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditing(row)}
                        aria-label={"Edit voucher " + String(row["code"] ?? row["id"])}
                        className="rounded border border-border px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void removeVoucher(row)}
                        aria-label={"Delete voucher " + String(row["code"] ?? row["id"])}
                        className="rounded px-2 py-1 text-destructive"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LiveBookings() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const bookings = useQuery({
    queryKey: ["admin", "live-bookings"],
    queryFn: async () => {
      const b = await fetchAllRows(async (from, to) => {
        const { data, error } = await supabase
          .from("bookings")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        return data ?? [];
      });
      const [{ data: profiles }, { data: companies }] = await Promise.all([
        supabase
          .from("scholar_profiles")
          .select(
            "user_id, full_name, contact_no, id_number, school, career_interests, dietary, guardian_name, guardian_contact, guardian_email",
          ),
        supabase
          .from("companies")
          .select(
            "id, mentor_name, mentor_position, mentor_phone, mentor_email, hr_contact_name, hr_contact_phone, hr_contact_email",
          ),
      ]);
      const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      const byCompany = new Map((companies ?? []).map((c) => [c.id, c]));
      return b.map((row) => {
        const p = byUser.get(row["user_id"] as string);
        const c = byCompany.get(row["company_id"] as number);
        return {
          ...row,
          student_name: p?.full_name ?? "",
          student_contact: p?.contact_no ?? "",
          student_id_number: p?.id_number ?? "",
          student_school: p?.school ?? "",
          student_career_interests: p?.career_interests ?? "",
          student_dietary: p?.dietary ?? "",
          guardian_name: p?.guardian_name ?? "",
          guardian_contact: p?.guardian_contact ?? "",
          guardian_email: p?.guardian_email ?? "",
          mentor_name: c?.mentor_name ?? "",
          mentor_position: c?.mentor_position ?? "",
          mentor_phone: c?.mentor_phone ?? "",
          mentor_email: c?.mentor_email ?? "",
          hr_contact_name: c?.hr_contact_name ?? "",
          hr_contact_phone: c?.hr_contact_phone ?? "",
          hr_contact_email: c?.hr_contact_email ?? "",
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
      return [
        "student_name",
        "career",
        "company",
        "mentor_name",
        "hr_contact_name",
        "shadow_date",
      ].some((k) =>
        String(r[k] ?? "")
          .toLowerCase()
          .includes(s),
      );
    });
  }, [bookings.data, q, status]);

  function exportCsvNow() {
    setExporting(true);
    try {
      const csv = toCsv(BOOKING_EXPORT_COLS, bookings.data ?? []);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bookings.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-6 py-6 text-foreground">
        <h1 className="font-display text-2xl uppercase">Bookings</h1>
      </div>
      <div className="bg-background px-6 py-6 text-foreground">
        <div className="flex flex-wrap items-end gap-6">
          <label className="block max-w-sm text-sm">
            Search
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Scholar, career, company, mentor, HR, date"
              className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none"
            />
          </label>
          <div
            role="group"
            aria-label="Filter bookings by status"
            className="flex flex-wrap gap-1.5"
          >
            {[["", "All"], ...Object.entries(BOOKING_STATUS_LABELS)].map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={status === key}
                onClick={() => setStatus(key!)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition " +
                  (status === key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-ivory text-foreground hover:bg-teal/15")
                }
              >
                {label}{" "}
                <span className="ml-1 opacity-70">
                  {
                    (bookings.data ?? []).filter((booking) => !key || booking["status"] === key)
                      .length
                  }
                </span>
              </button>
            ))}
          </div>
          <Button
            onClick={exportCsvNow}
            disabled={bookings.isLoading || exporting}
            className="ml-auto rounded-md bg-teal/20 hover:bg-teal/30 px-4 py-2 text-sm font-medium uppercase text-foreground"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        </div>
        <div className="mt-6 overflow-x-auto [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/40 [&::-webkit-scrollbar-track]:bg-muted">
          <table className="w-full min-w-[1100px] table-fixed text-left text-xs">
            <UserTableColumns />
            <thead>
              <tr className="border-b border-border font-medium">
                {[
                  "Date",
                  "Status",
                  "Career",
                  "Company",
                  "Scholar",
                  "School",
                  "Mentor",
                  "HR contact",
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.isLoading ? (
                <tr>
                  <td className="px-3 py-4" colSpan={8}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4" colSpan={8}>
                    No bookings found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={String(r["id"])} className="border-b border-warm-divider">
                    <td className="whitespace-nowrap px-3 py-2">{String(r["shadow_date"])}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {BOOKING_STATUS_LABELS[String(r["status"])] ?? String(r["status"])}
                    </td>
                    <td className="px-3 py-2">{String(r["career"] ?? "")}</td>
                    <td className="px-3 py-2">{String(r["company"] ?? "")}</td>
                    <td className="px-3 py-2">{String(r["student_name"] ?? "")}</td>
                    <td className="px-3 py-2">{String(r["student_school"] ?? "")}</td>
                    <td className="px-3 py-2">{String(r["mentor_name"] ?? "")}</td>
                    <td className="px-3 py-2">{String(r["hr_contact_name"] ?? "")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type BookingSettingsRow = {
  min_lead_days: number;
  blackout_dates: string[] | null;
  public_holidays: string[] | null;
  no_availability_message: string;
  max_advance_days: number;
  documentation_deadline_days: number;
  cancellation_cutoff_days: number;
  reschedule_allowed: boolean;
  reschedule_min_notice_days: number;
  max_pending_requests: number;
  waitlist_expiry_hours: number;
  request_expiry_hours: number;
  scholar_reminder_days: number[];
  mentor_reminder_days: number[];
  season_start_month: number;
  season_end_month: number;
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
function DatesPicker({
  value,
  onChange,
  allowWeekends = true,
  allowOffSeason = true,
  countryCode = "ZA",
}: {
  value: string;
  onChange: (v: string) => void;
  allowWeekends?: boolean;
  allowOffSeason?: boolean;
  countryCode?: string;
}) {
  const dates = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseUsDate)
    .filter((d): d is Date => d !== null);
  const holidays = useQuery({
    queryKey: ["public-holidays", countryCode],
    queryFn: async () => {
      const result = await supabase.rpc("get_country_public_holidays", {
        _country_code: countryCode,
      });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
    staleTime: 60 * 60_000,
  });
  const holidaySet = new Set(
    (holidays.data ?? []).map((h) => parseUsDate(h)?.toDateString()).filter(Boolean),
  );
  const season = useQuery({
    queryKey: ["season-window"],
    queryFn: async () =>
      ((await supabase.rpc("get_season_window")).data ?? [])[0] ?? {
        season_start_month: 1,
        season_end_month: 12,
      },
    staleTime: 60 * 60_000,
  });
  function set(next: Date[]) {
    onChange(next.map(toUsDate).join(", "));
  }
  const disabledMatchers = [
    { before: new Date() },
    (d: Date) => holidaySet.has(d.toDateString()),
    ...(allowWeekends ? [] : [(d: Date) => d.getDay() === 0 || d.getDay() === 6]),
    ...(allowOffSeason
      ? []
      : [
          (d: Date) => {
            const m = d.getMonth() + 1;
            return (
              m < (season.data?.season_start_month ?? 1) ||
              m > (season.data?.season_end_month ?? 12)
            );
          },
        ]),
  ];
  return (
    <div className="flex flex-wrap items-start gap-4">
      <Calendar
        mode="multiple"
        selected={dates}
        onSelect={(d) => set(d ?? [])}
        disabled={disabledMatchers}
        className="rounded-md border border-warm-divider bg-background"
      />
      <div className="flex flex-wrap gap-1.5">
        {dates.length === 0 && <span className="text-xs text-muted-foreground">No dates set.</span>}
        {dates.map((d, i) => (
          <span
            key={i}
            className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
          >
            {toUsDate(d)}
            <button
              type="button"
              onClick={() => set(dates.filter((_, idx) => idx !== i))}
              aria-label={`Remove ${toUsDate(d)}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function SettingsFrame({
  title,
  description,
  icon: Icon,
  tint = "bg-rose-100 text-rose-600",
  children,
  compact = false,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  tint?: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-warm-divider bg-ivory">
      <header
        className={
          "flex items-start gap-3 border-b border-warm-divider " +
          (compact ? "px-3 py-2" : "px-4 py-3")
        }
      >
        {Icon && (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tint}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span>
          <h2 className="text-base font-medium">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </span>
      </header>
      <div className="divide-y divide-warm-divider">{children}</div>
    </section>
  );
}

function NumberField({
  compact = false,
  label,
  hint,
  value,
  onChange,
  suffix,
}: {
  label: string;
  compact?: boolean;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <label
      className={
        compact
          ? "grid items-start gap-2 px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]"
          : "grid items-start gap-4 px-4 py-3 text-sm md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.6fr)]"
      }
    >
      <span>
        <span>{label}</span>
        {hint && <span className="mt-1 block max-w-xl text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 w-20 border-b border-input bg-transparent px-1 py-1 outline-none"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </span>
    </label>
  );
}

function parseIntList(s: string): number[] {
  return [
    ...new Set(
      s
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((n) => Number.isFinite(n) && n >= 0),
    ),
  ].sort((a, b) => b - a);
}

const NOT_ENFORCED_HINT = "Not active yet.";

export function BookingSettings() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["admin", "booking_settings"],
    queryFn: async () =>
      (await supabase.from("booking_settings").select("*").eq("id", 1).single())
        .data as BookingSettingsRow | null,
  });
  const [v, setV] = useState<Record<string, string>>({});
  const [blackoutDates, setBlackoutDates] = useState<Date[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    const s = settings.data;
    setV({
      min_lead_days: String(s.min_lead_days),
      max_advance_days: String(s.max_advance_days),
      documentation_deadline_days: String(s.documentation_deadline_days),
      request_expiry_hours: String(s.request_expiry_hours),
      cancellation_cutoff_days: String(s.cancellation_cutoff_days),
      reschedule_min_notice_days: String(s.reschedule_min_notice_days),
      waitlist_expiry_hours: String(s.waitlist_expiry_hours),
      max_pending_requests: String(s.max_pending_requests),
      no_availability_message: s.no_availability_message ?? "",
      scholar_reminder_days: (s.scholar_reminder_days ?? []).join(", "),
      mentor_reminder_days: (s.mentor_reminder_days ?? []).join(", "),
      season_start_month: String(s.season_start_month),
      season_end_month: String(s.season_end_month),
    });
    setBlackoutDates(
      (s.blackout_dates ?? []).map(parseUsDate).filter((d): d is Date => d !== null),
    );
  }, [settings.data]);

  const f = (key: string) => v[key] ?? "";
  const set = (key: string) => (val: string) => setV((cur) => ({ ...cur, [key]: val }));

  async function save() {
    setBusy(true);
    setErr(null);
    setSaved(false);
    const { error } = await supabase
      .from("booking_settings")
      .update({
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
        no_availability_message: f("no_availability_message"),
      })
      .eq("id", 1);
    setBusy(false);
    if (error) return setErr(error.message);
    setSaved(true);
    qc.invalidateQueries({ queryKey: ["admin", "booking_settings"] });
    qc.invalidateQueries({ queryKey: ["booking-settings"] });
  }

  const sectionClass = "space-y-3 text-foreground";

  return (
    <div>
      <AdminScreenHeader title="Booking Settings" />
      <div className="w-full space-y-3 bg-background px-4 py-3 text-foreground">
        <Tabs defaultValue="rules" className="w-full">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="rules">Booking Rules</TabsTrigger>
            <TabsTrigger value="docs">Documentation &amp; Approval</TabsTrigger>
            <TabsTrigger value="cancel">Cancellations &amp; Waitlists</TabsTrigger>
            <TabsTrigger value="notify">Notifications &amp; Messages</TabsTrigger>
          </TabsList>

          <TabsContent
            value="rules"
            className="mt-3 grid items-start gap-3 text-foreground lg:grid-cols-2"
          >
            <div className="space-y-3">
              <SettingsFrame
                compact
                title="Scheduling Windows &amp; Lead Times"
                description="Choose when scholars can request a booking."
                icon={Clock}
                tint="bg-rose-100 text-rose-600"
              >
                <NumberField
                  compact
                  label="Minimum request lead time"
                  suffix="days before the shadow date"
                  value={f("min_lead_days")}
                  onChange={set("min_lead_days")}
                  hint="How many days’ notice is needed before a visit."
                />
                <NumberField
                  compact
                  label="Maximum advance booking window"
                  suffix="days ahead"
                  value={f("max_advance_days")}
                  onChange={set("max_advance_days")}
                  hint="How far ahead scholars can book."
                />
              </SettingsFrame>
              <SettingsFrame
                compact
                title="Operating Season &amp; Request Caps"
                description="Choose booking months and request limits."
                icon={CalendarIcon}
                tint="bg-orange-100 text-orange-600"
              >
                <div className="space-y-2 px-3 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        ["season_start_month", "Season starts"],
                        ["season_end_month", "Season ends"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="text-xs">
                        {label}
                        <select
                          value={f(key)}
                          onChange={(e) => set(key)(e.target.value)}
                          className="mt-1 block w-full border-b border-input bg-transparent px-1 py-1 text-sm outline-none"
                        >
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i} value={i + 1}>
                              {new Date(2020, i, 1).toLocaleString("en-ZA", { month: "long" })}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Operating months</p>
                    <ol className="grid grid-cols-12 gap-1" aria-label="Annual season preview">
                      {Array.from({ length: 12 }, (_, i) => {
                        const m = i + 1,
                          start = Number(f("season_start_month")),
                          end = Number(f("season_end_month"));
                        const active = m >= start && m <= end;
                        const name = new Date(2020, i, 1).toLocaleString("en-ZA", {
                          month: "long",
                        });
                        return (
                          <li
                            key={m}
                            title={name + (active ? ": Active" : ": Inactive")}
                            aria-label={name + (active ? ": Active" : ": Inactive")}
                            className={
                              "rounded px-1 py-1 text-center text-xs " +
                              (active
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground")
                            }
                          >
                            {name[0]}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </div>
                <NumberField
                  compact
                  label="Maximum pending requests per scholar"
                  suffix="active requests"
                  value={f("max_pending_requests")}
                  onChange={set("max_pending_requests")}
                  hint={NOT_ENFORCED_HINT}
                />
              </SettingsFrame>
            </div>
            <SettingsFrame
              compact
              title="Blackout Dates &amp; Public Holidays"
              description="Choose extra dates when bookings are closed. Public holidays are blocked automatically."
              icon={CalendarX}
              tint="bg-slate-100 text-slate-600"
            >
              <div className="px-3 py-2">
                <p className="text-sm">
                  Blackout dates{" "}
                  <span className="text-xs text-muted-foreground">(no bookings allowed)</span>
                </p>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span>Blocked dates ({blackoutDates.length})</span>
                  <button
                    type="button"
                    disabled={!blackoutDates.length}
                    onClick={() => setBlackoutDates([])}
                    className="text-primary hover:underline disabled:opacity-50"
                  >
                    Clear all
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-start gap-4">
                  <Calendar
                    mode="multiple"
                    selected={blackoutDates}
                    onSelect={(d) => setBlackoutDates(d ?? [])}
                    classNames={{
                      root: "w-full",
                      months: "relative flex w-full flex-col",
                      day: "group/day relative h-8 w-full select-none p-0 text-center",
                    }}
                    className="rounded-md border border-warm-divider bg-background [&_button[data-day]]:aspect-auto [&_button[data-day]]:h-8 [&_[data-selected-single=true]]:bg-black [&_[data-selected-single=true]]:text-white [&_[data-selected-single=true]:hover]:bg-black [&_[data-selected-single=true]:hover]:text-white"
                  />
                  <div className="max-h-20 overflow-y-auto flex flex-wrap gap-1.5">
                    {blackoutDates.length === 0 && (
                      <span className="text-xs text-muted-foreground">No blackout dates set.</span>
                    )}
                    {blackoutDates.map((d, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1 rounded-full bg-black px-2.5 py-1 text-xs text-white"
                      >
                        {toUsDate(d)}
                        <button
                          type="button"
                          onClick={() =>
                            setBlackoutDates((cur) => cur.filter((_, idx) => idx !== i))
                          }
                          aria-label={`Remove ${toUsDate(d)}`}
                          className="text-white/70 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Public holidays in the host’s country are blocked automatically.
              </p>
            </SettingsFrame>
          </TabsContent>

          <TabsContent value="docs" className={sectionClass + " mt-6"}>
            <SettingsFrame
              title="Documentation & Approval"
              description="Set time limits for forms and host replies."
              icon={FileText}
              tint="bg-blue-100 text-blue-600"
            >
              <NumberField
                label="Documentation deadline"
                suffix="days before the shadow date"
                value={f("documentation_deadline_days")}
                onChange={set("documentation_deadline_days")}
                hint="Allow this many days before a visit for the required forms to be completed."
              />
              <NumberField
                label="Booking request expiry"
                suffix="hours for a host to respond"
                value={f("request_expiry_hours")}
                onChange={set("request_expiry_hours")}
                hint={NOT_ENFORCED_HINT}
              />
            </SettingsFrame>
          </TabsContent>

          <TabsContent value="cancel" className={sectionClass + " mt-6"}>
            <SettingsFrame
              title="Cancellations & Waitlists"
              description="Set time limits for cancellations, date changes and waitlists."
              icon={RotateCcw}
              tint="bg-amber-100 text-amber-600"
            >
              <NumberField
                label="Cancellation cut-off"
                suffix="days before the shadow date"
                value={f("cancellation_cutoff_days")}
                onChange={set("cancellation_cutoff_days")}
                hint={NOT_ENFORCED_HINT}
              />
              <NumberField
                label="Reschedule minimum notice"
                suffix="days ahead"
                value={f("reschedule_min_notice_days")}
                onChange={set("reschedule_min_notice_days")}
                hint={NOT_ENFORCED_HINT}
              />
              <NumberField
                label="Waitlist expiry"
                suffix="hours to respond to an offered place"
                value={f("waitlist_expiry_hours")}
                onChange={set("waitlist_expiry_hours")}
                hint={NOT_ENFORCED_HINT}
              />
            </SettingsFrame>
          </TabsContent>

          <TabsContent value="notify" className={sectionClass + " mt-6"}>
            <SettingsFrame
              title="Notifications & Messages"
              description="Choose what users see and when reminders are sent."
              icon={Bell}
              tint="bg-violet-100 text-violet-600"
            >
              <label className="block px-4 py-3 text-sm">
                "No mentors available" message{" "}
                <span className="text-xs text-muted-foreground">
                  (shown when no mentors are available)
                </span>
                <textarea
                  value={f("no_availability_message")}
                  onChange={(e) => set("no_availability_message")(e.target.value)}
                  className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none"
                />
              </label>
              <label className="block px-4 py-3 text-sm">
                Scholar reminders{" "}
                <span className="text-xs text-muted-foreground">
                  (days before the visit; for example, 2, 1)
                </span>
                <input
                  value={f("scholar_reminder_days")}
                  onChange={(e) => set("scholar_reminder_days")(e.target.value)}
                  placeholder="2, 1"
                  className="mt-1 w-full max-w-xs border-b border-input bg-transparent px-1 py-1 outline-none"
                />
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  The final reminder tells scholars what to bring.
                </p>
              </label>
              <label className="block px-4 py-3 text-sm">
                Host reminders{" "}
                <span className="text-xs text-muted-foreground">
                  (days before the visit; for example, 1)
                </span>
                <input
                  value={f("mentor_reminder_days")}
                  onChange={(e) => set("mentor_reminder_days")(e.target.value)}
                  placeholder="1"
                  className="mt-1 w-full max-w-xs border-b border-input bg-transparent px-1 py-1 outline-none"
                />
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  Reminders include who to contact if the host is unavailable.
                </p>
              </label>
            </SettingsFrame>
          </TabsContent>
        </Tabs>

        {err && <p className="text-sm font-medium">{err}</p>}
        <button
          onClick={save}
          disabled={busy || settings.isLoading}
          className="rounded-md bg-teal/20 hover:bg-teal/30 px-5 py-2.5 text-sm font-medium uppercase text-foreground disabled:opacity-50"
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

function LogoUpload({
  companyId,
  value,
  onChange,
}: {
  companyId: unknown;
  value: string;
  onChange: (path: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const previewUrl = value
    ? supabase.storage.from("partner-logos").getPublicUrl(value).data.publicUrl
    : null;

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    const path = `${companyId}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("partner-logos")
      .upload(path, file, { upsert: true });
    setBusy(false);
    if (error) return setErr(error.message);
    onChange(path);
  }

  return (
    <label className="block text-sm">
      Logo
      <div className="mt-1 flex items-center gap-3">
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Logo preview"
            className="h-10 w-10 rounded bg-white object-contain"
          />
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
          disabled={busy}
          className="text-xs"
        />
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </label>
  );
}

function CompanyIndemnityUpload({
  companyId,
  value,
  onChange,
}: {
  companyId: unknown;
  value: string;
  onChange: (text: string) => void;
}) {
  const extract = useServerFn(extractCompanyIndemnity);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    const path = `${companyId}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from("company-indemnity")
      .upload(path, file, { upsert: true });
    if (error) {
      setBusy(false);
      return setErr(error.message);
    }
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
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
            disabled={busy}
            className="text-xs"
          />
          {busy && <span className="text-xs text-muted-foreground">Reading document…</span>}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          AI extracts the clauses below; they'll be signed alongside the standard JobShadow
          indemnity.
        </p>
      </label>
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
      <textarea
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="No company indemnity uploaded yet."
        className="mt-2 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

function EditRecord({
  initialAiAction,
  title,
  table,
  cols,
  row,
  onDone,
  onCancel,
}: {
  initialAiAction?: "fill" | "regenerate" | undefined;
  title: string;
  table: string;
  cols: Col[];
  row: Record<string, unknown>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const syncHolidays = useServerFn(syncAutomaticHolidays);
  const qc = useQueryClient();
  const [vals, setVals] = useState<Record<string, unknown>>(row);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const editable = cols.filter((c) => c.key !== "id" && !c.key.startsWith("_"));

  async function save() {
    setBusy(true);
    setErr(null);
    if (
      table === "companies" &&
      vals["country_code"] &&
      vals["country_code"] !== row["country_code"]
    ) {
      try {
        await syncHolidays({
          data: { companyId: Number(row["id"]), countryCode: String(vals["country_code"]) },
        });
      } catch (error) {
        setBusy(false);
        setErr(error instanceof Error ? error.message : "Could not update the host country.");
        return;
      }
    }
    const patch = Object.fromEntries(
      Object.entries(vals).filter(([k]) => k !== "id" && !k.startsWith("_")),
    );
    const { error } = await (supabase.from(table as "careers") as any)
      .update(patch)
      .eq("id", row["id"]);
    setBusy(false);
    if (error) return setErr(error.message);
    if (table === "careers") {
      qc.invalidateQueries({ queryKey: ["public-career-content"] });
      qc.invalidateQueries({ queryKey: ["public-career-availability"] });
    }
    onDone();
  }

  return (
    <div className={table === "careers" ? "min-h-full bg-ivory" : ""}>
      {table !== "careers" && (
        <div className="flex items-center justify-between border-b border-border bg-background px-6 py-5 text-foreground">
          <h1 className="text-xl font-medium">
            Edit {title.replace(/s$/, "")} #{String(row["id"])}
          </h1>
          <button onClick={onCancel} className="text-sm font-medium hover:underline">
            Back to list
          </button>
        </div>
      )}
      <div
        className={
          table === "careers"
            ? "bg-ivory px-4 py-2 text-foreground"
            : "bg-background px-6 py-6 text-foreground"
        }
      >
        <div
          className={
            table === "careers" ? "flex flex-wrap items-center gap-3" : "grid gap-5 sm:grid-cols-3"
          }
        >
          {table === "companies" && (
            <CountrySelect
              value={String(vals["country_code"] ?? "ZA")}
              onChange={(country_code) => setVals({ ...vals, country_code })}
            />
          )}
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
              <LogoUpload
                key={c.key}
                companyId={row["id"]}
                value={(vals[c.key] as string) ?? ""}
                onChange={(v) => setVals({ ...vals, logo_path: v })}
              />
            ) : table === "companies" && c.key === "custom_indemnity_text" ? (
              <CompanyIndemnityUpload
                key={c.key}
                companyId={row["id"]}
                value={(vals[c.key] as string) ?? ""}
                onChange={(v) => setVals({ ...vals, custom_indemnity_text: v })}
              />
            ) : table === "companies" && c.key === "dates" ? (
              <div key={c.key} className="sm:col-span-3">
                <p className="text-sm">{c.label}</p>
                <div className="mt-2 flex gap-5">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!vals["allow_weekends"]}
                      onChange={(e) => setVals({ ...vals, allow_weekends: e.target.checked })}
                    />
                    Allow weekends
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!vals["allow_off_season"]}
                      onChange={(e) => setVals({ ...vals, allow_off_season: e.target.checked })}
                    />
                    Allow Nov–Jan (off-season)
                  </label>
                </div>
                <div className="mt-2">
                  <DatesPicker
                    value={(vals[c.key] as string) ?? ""}
                    onChange={(v) => setVals({ ...vals, dates: v })}
                    allowWeekends={!!vals["allow_weekends"]}
                    allowOffSeason={!!vals["allow_off_season"]}
                    countryCode={String(vals["country_code"] ?? "ZA")}
                  />
                </div>
              </div>
            ) : table === "companies" &&
              (c.key === "allow_weekends" || c.key === "allow_off_season") ? null : table ===
                "companies" && c.key === "mode" ? (
              <label key={c.key} className="block text-sm">
                {c.label}
                <select
                  value={(vals["mode"] as string) ?? ""}
                  onChange={(e) => setVals({ ...vals, mode: e.target.value })}
                  className="mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none focus:border-primary [&>option]:text-foreground"
                >
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
                    <input
                      type="checkbox"
                      checked={!!vals[c.key]}
                      onChange={(e) => setVals({ ...vals, [c.key]: e.target.checked })}
                    />
                  </div>
                ) : (
                  <input
                    type={c.field === "number" ? "number" : c.field === "date" ? "date" : "text"}
                    value={(vals[c.key] as string) ?? ""}
                    onChange={(e) => setVals({ ...vals, [c.key]: e.target.value })}
                    className={
                      table === "careers"
                        ? "w-56 max-w-full border-b border-input bg-transparent px-1 py-1 outline-none focus:border-primary"
                        : "mt-1 w-full border-b border-input bg-transparent px-1 py-1 outline-none focus:border-primary"
                    }
                  />
                )}
              </label>
            ),
          )}
          {table === "careers" && (
            <>
              <label className="flex items-center gap-2 whitespace-nowrap text-sm">
                Target
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={String(vals["mentor_target_count"] ?? "")}
                  onChange={(e) =>
                    setVals({ ...vals, mentor_target_count: Number(e.target.value) })
                  }
                  className="w-12 rounded border border-input bg-transparent px-1 py-1"
                />
              </label>
              <label className="flex items-center gap-2 whitespace-nowrap text-sm">
                Actual
                <input
                  type="number"
                  min="0"
                  max={Number(vals["mentor_target_count"] ?? 10000)}
                  placeholder="Automatic"
                  value={
                    vals["mentor_available_count"] == null
                      ? ""
                      : String(vals["mentor_available_count"])
                  }
                  onChange={(e) =>
                    setVals({
                      ...vals,
                      mentor_available_count: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="w-12 rounded border border-input bg-transparent px-1 py-1"
                />
              </label>
            </>
          )}
        </div>
        {table === "careers" && (
          <CareerDescriptionField
            autoAction={initialAiAction}
            career={String(vals["name"] ?? "")}
            value={(vals["description"] as string) ?? ""}
            onChange={(v) => setVals({ ...vals, description: v })}
            skills={getCareerSkills(
              String(vals["name"] ?? ""),
              vals["school_skills"],
              vals["workplace_skills"],
            )}
            onSkillsChange={(skills) =>
              setVals((current) => ({
                ...current,
                school_skills: skills.school,
                workplace_skills: skills.workplace,
              }))
            }
            guidance={getCareerGuidance(
              String(vals["name"] ?? ""),
              String(vals["description"] ?? ""),
              vals,
            )}
            onGuidanceChange={(patch) => setVals((current) => ({ ...current, ...patch }))}
            onDraft={(draft, regenerate) =>
              setVals((current) => ({
                ...current,
                ...careerDraftPatch(current, draft, regenerate),
              }))
            }
          />
        )}
        {err && <p className="mt-4 text-sm font-medium">{err}</p>}
        <button
          onClick={save}
          disabled={busy}
          className={
            "rounded-md bg-teal/20 hover:bg-teal/30 px-5 py-2.5 text-sm font-medium uppercase text-foreground " +
            (table === "careers" ? "mt-3" : "mt-6")
          }
        >
          Update
        </button>
        {table === "careers" && (
          <button type="button" onClick={onCancel} className="ml-3 text-sm hover:underline">
            Back to list
          </button>
        )}
      </div>
    </div>
  );
}

export function CareerDescriptionField({
  autoAction,
  career,
  value,
  onChange,
  skills,
  onSkillsChange,
  guidance,
  onGuidanceChange,
  onDraft,
}: {
  autoAction?: "fill" | "regenerate" | undefined;
  career: string;
  value: string;
  onChange: (v: string) => void;
  skills: { school: string[]; workplace: string[] };
  onSkillsChange: (skills: { school: string[]; workplace: string[] }) => void;
  guidance: ReturnType<typeof getCareerGuidance>;
  onGuidanceChange: (patch: {
    ideal_for?: string;
    specialisations?: string[];
    subjects?: string[];
    interpersonal_skills?: string[];
    recommended_courses?: string[];
    self_directed_learning?: string[];
    future_outlook?: string;
    ai_exposure_level?: "low" | "medium" | "high" | null;
    ai_exposure_note?: string;
  }) => void;
  onDraft: (draft: Partial<CareerDraft>, regenerate?: boolean) => void;
}) {
  const draft = useServerFn(draftCareerDescription);
  const autoStarted = useRef(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function suggest(regenerate = false) {
    if (!career.trim()) return setErr("Enter the career name first.");
    const content = {
      description: value,
      school_skills: skills.school,
      workplace_skills: skills.workplace,
      ideal_for: guidance.idealFor,
      specialisations: guidance.specialisations,
      subjects: guidance.subjects,
      interpersonal_skills: guidance.interpersonalSkills,
      recommended_courses: guidance.recommendedCourses,
      self_directed_learning: guidance.selfDirectedLearning,
      future_outlook: guidance.futureOutlook,
      ai_exposure_level: guidance.aiExposureLevel,
      ai_exposure_note: guidance.aiExposureNote,
    };
    const fields = regenerate ? [...CAREER_DRAFT_FIELDS] : missingCareerFields(content);
    if (!fields.length)
      return setErr("All fields already have content. Use Regenerate this career to replace it.");
    if (
      regenerate &&
      !(await confirmAction(
        'Replace the career content for "' +
          career +
          '"? Review the new draft before clicking Update.',
        { title: "Regenerate this career", confirmLabel: "Regenerate" },
      ))
    )
      return;
    setBusy(true);
    setErr(null);
    try {
      const generated = await draft({ data: { career, fields } });
      onDraft(
        Object.fromEntries(
          Object.entries(generated).filter(([key]) =>
            fields.includes(key as (typeof fields)[number]),
          ),
        ) as Partial<CareerDraft>,
        regenerate,
      );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (autoAction && !autoStarted.current) {
      autoStarted.current = true;
      void suggest(autoAction === "regenerate");
    }
  }, [autoAction]);
  return (
    <div className="mt-3 w-full">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">Career Content</span>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => void suggest()}
            disabled={busy}
            aria-label="AI: Fill missing fields"
            title="AI: Fill missing fields"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary bg-primary/10 text-primary text-xs hover:bg-primary/20 disabled:cursor-wait disabled:opacity-50"
          >
            <Sparkles className={"h-3.5 w-3.5 " + (busy ? "animate-pulse" : "")} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => void suggest(true)}
            disabled={busy}
            aria-label="Regenerate this career"
            title="Regenerate this career"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-xs hover:border-primary hover:text-primary disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
      {busy && (
        <p role="status" className="mt-1 text-xs text-primary">
          Generating career content…
        </p>
      )}
      <fieldset disabled={busy}>
        <label className="mt-1 block text-sm">
          Role Overview
          <textarea
            rows={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="A brief description of this career"
            className="mt-1 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        {value && (
          <details className="mt-1 rounded bg-muted/40 p-2 text-sm">
            <summary className="cursor-pointer">Preview description</summary>
            <RichText text={value} />
          </details>
        )}
        <label className="mt-1 block text-sm">
          Specialisations &amp; Roles
          <input
            value={guidance.specialisations.join(", ")}
            onChange={(e) =>
              onGuidanceChange({
                specialisations: e.target.value.split(",").map((value) => value.trimStart()),
              })
            }
            onBlur={() =>
              onGuidanceChange({
                specialisations: guidance.specialisations
                  .map((value) => value.trim())
                  .filter(Boolean),
              })
            }
            className="mt-1 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <fieldset className="mt-3 grid gap-3 rounded border border-border p-3 sm:grid-cols-3">
          <legend className="px-1 text-sm font-semibold">Skills Required</legend>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Separate skills with commas.
          </p>
          {(
            [
              ["school", "School foundations"],
              ["workplace", "Workplace skills"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              {label}
              <input
                value={skills[key].join(", ")}
                onChange={(e) =>
                  onSkillsChange({
                    ...skills,
                    [key]: e.target.value.split(",").map((skill) => skill.trimStart()),
                  })
                }
                onBlur={() =>
                  onSkillsChange({
                    ...skills,
                    [key]: skills[key].map((skill) => skill.trim()).filter(Boolean),
                  })
                }
                className="mt-1 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          ))}
          <label className="block text-sm">
            Interpersonal Skills
            <input
              value={guidance.interpersonalSkills.join(", ")}
              onChange={(e) =>
                onGuidanceChange({
                  interpersonal_skills: e.target.value.split(",").map((value) => value.trimStart()),
                })
              }
              onBlur={() =>
                onGuidanceChange({
                  interpersonal_skills: guidance.interpersonalSkills
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
              className="mt-1 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </fieldset>
        <fieldset className="mt-3 grid gap-3 rounded border border-border p-3 sm:grid-cols-2">
          <legend className="px-1 text-sm font-semibold">Career Preparation</legend>
          <label className="block text-sm sm:col-span-2">
            Ideal for
            <textarea
              rows={2}
              value={guidance.idealFor}
              onChange={(e) => onGuidanceChange({ ideal_for: e.target.value })}
              className="mt-1 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          {([["subjects", "Suggested Subjects"]] as const).map(([key, label]) => (
            <label key={key} className="block text-sm">
              {label}
              <input
                value={guidance[key].join(", ")}
                onChange={(e) =>
                  onGuidanceChange({
                    [key]: e.target.value.split(",").map((value) => value.trimStart()),
                  })
                }
                onBlur={() =>
                  onGuidanceChange({
                    [key]: guidance[key].map((value) => value.trim()).filter(Boolean),
                  })
                }
                className="mt-1 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
          ))}
          {([["recommendedCourses", "recommended_courses", "Recommended Training"]] as const).map(
            ([guidanceKey, patchKey, label]) => (
              <label key={guidanceKey} className="block text-sm">
                {label}
                <input
                  value={guidance[guidanceKey].join(", ")}
                  onChange={(e) =>
                    onGuidanceChange({
                      [patchKey]: e.target.value.split(",").map((value) => value.trimStart()),
                    })
                  }
                  onBlur={() =>
                    onGuidanceChange({
                      [patchKey]: guidance[guidanceKey]
                        .map((value) => value.trim())
                        .filter(Boolean),
                    })
                  }
                  className="mt-1 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary"
                />
              </label>
            ),
          )}
          <label className="block text-sm">
            Future of this Career
            <textarea
              rows={2}
              value={guidance.futureOutlook}
              onChange={(e) => onGuidanceChange({ future_outlook: e.target.value })}
              className="mt-1 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm">
            AI Exposure Level
            <select
              value={guidance.aiExposureLevel ?? ""}
              onChange={(e) =>
                onGuidanceChange({
                  ai_exposure_level: (e.target.value || null) as "low" | "medium" | "high" | null,
                })
              }
              className="mt-1 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Not set</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="block text-sm">
            AI Exposure Note
            <textarea
              rows={2}
              value={guidance.aiExposureNote}
              onChange={(e) => onGuidanceChange({ ai_exposure_note: e.target.value })}
              className="mt-1 w-full rounded border border-input bg-transparent px-2 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </fieldset>
      </fieldset>
      {err && (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {err}
        </p>
      )}
    </div>
  );
}
