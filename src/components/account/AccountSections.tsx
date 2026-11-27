import { ScholarAssessments } from "./ScholarAssessments";
import { displayTime } from "@/lib/time-entry";
import { ProfilePhotoPicker } from "./ProfilePhotoPicker";
import { bookingDateKey, datesInRange, placementsInDateRange } from "@/lib/placement-search";
import { fetchAllRows } from "@/lib/admin-export";
import { CareerStepBrowser } from "./CareerStepBrowser";
import { SchoolPicker } from "./SchoolPicker";
import { DietaryNeedsPicker } from "./ScholarSelections";
import { JourneyStepper, type JourneyStep } from "@/components/JourneyStepper";
import { ROLES } from "@/lib/data";
import { phoneWithCountryCode } from "@/components/PhoneInput";
import { PersonNameFields, joinPersonName } from "@/components/PersonNameFields";
import { PhoneInput } from "@/components/PhoneInput";
import { isPossiblePhoneNumber } from "libphonenumber-js/min";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  UserRound,
  Search,
  CalendarDays,
  FileText,
  BadgeCheck,
  CreditCard,
  Briefcase,
  Star,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { confirmAction } from "@/lib/dialogs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const STATUS: Record<string, string> = {
  pending_approval: "Awaiting mentor approval",
  awaiting_payment: "Awaiting payment",
  indemnity_required: "Paid – indemnity needed",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

function toIsoDate(mdy: string) {
  const [m, d, y] = mdy.split("/").map(Number);
  if (!m || !d || !y) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function fromIsoDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${m}/${d}/${y}`;
}
function formatAcceptedAt(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

function useUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
}

export function AccountPanel({
  withBookings = false,
  initialStep,
  profileContent,
  profileActions,
}: {
  withBookings?: boolean;
  initialStep?: string | undefined;
  profileContent?: ReactNode;
  profileActions?: ReactNode;
}) {
  const { data: user } = useUser();
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["scholar-profile", user?.id],
    staleTime: 15_000,
    enabled: !!user,
    queryFn: async () => {
      const result = await supabase
        .from("scholar_profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  async function deleteProfile() {
    if (!user) return;
    setDeleting(true);
    setDeleteErr(null);
    const { error } = await supabase.from("scholar_profiles").delete().eq("user_id", user.id);
    setDeleting(false);
    if (error) return setDeleteErr(error.message);
    setConfirmingDelete(false);
    await qc.invalidateQueries({ queryKey: ["scholar-profile"] });
  }

  if (profile.isLoading || !user) return <p>Loading…</p>;
  if (profile.error)
    return <p role="alert">Your profile could not be loaded. Please refresh before continuing.</p>;
  if (withBookings)
    return (
      <StudentJourney
        key={user.id}
        userId={user.id}
        savedCareer={
          typeof user.user_metadata?.["selected_career"] === "string"
            ? user.user_metadata["selected_career"]
            : ""
        }
        profile={profile.data as Record<string, unknown> | null}
        initialStep={initialStep}
        profileContent={profileContent}
      />
    );
  if (!profile.data || editing)
    return (
      <ProfileForm
        userId={user.id}
        initialProfile={(profile.data as Record<string, unknown> | null) ?? undefined}
        editing={editing}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          void qc.invalidateQueries({ queryKey: ["scholar-profile"] });
        }}
      />
    );
  return (
    <div className="space-y-4">
      <ScholarDetails p={profile.data as Record<string, unknown>} />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => setEditing(true)}>
          Edit Profile
        </Button>
        {!confirmingDelete ? (
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete Profile
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Delete your profile? This can&apos;t be undone.</span>
            <Button variant="destructive" disabled={deleting} onClick={deleteProfile}>
              {deleting ? "Deleting…" : "Yes, delete"}
            </Button>
            <Button variant="outline" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
          </div>
        )}
        {profileActions}
      </div>
      {deleteErr && (
        <p role="alert" className="text-sm text-destructive">
          {deleteErr}
        </p>
      )}
    </div>
  );
}

export const SCHOLAR_DETAIL_TABS: { id: string; label: string; rows: [string, string][] }[] = [
  {
    id: "personal",
    label: "Personal Details",
    rows: [
      ["First name", "first_name"],
      ["Last name", "last_name"],
      ["Contact number", "contact_no"],
      ["School", "school"],
      ["School type", "school_type"],
      ["School country", "school_country_code"],
    ],
  },
  {
    id: "guardian",
    label: "Parent / Guardian",
    rows: [
      ["First name", "guardian_first_name"],
      ["Last name", "guardian_last_name"],
      ["Contact number", "guardian_contact"],
      ["Email address", "guardian_email"],
    ],
  },
  {
    id: "school",
    label: "Secondary Information",
    rows: [
      ["Population group", "population_group"],
      ["Gender", "gender"],
      ["Disability status", "disability"],
      ["Citizenship", "citizenship"],
      ["Dietary Requirements", "dietary"],
    ],
  },
];

function ScholarDetails({ p: source }: { p: Record<string, unknown> }) {
  const p = {
    ...source,
    ...restoreProfileNames(
      Object.fromEntries(
        Object.entries(source).filter(
          ([, value]) => typeof value === "string" || typeof value === "boolean",
        ),
      ) as Record<string, string | boolean>,
    ),
  };
  const value = (k: string) =>
    (p[k] as string) ||
    (k === "first_name"
      ? String(p["full_name"] ?? "")
          .split(/\s+/)
          .slice(0, -1)
          .join(" ") || String(p["full_name"] ?? "")
      : k === "last_name"
        ? String(p["full_name"] ?? "")
            .trim()
            .split(/\s+/).length > 1
          ? String(p["full_name"]).trim().split(/\s+/).at(-1)
          : ""
        : "") ||
    "—";
  return (
    <Tabs defaultValue="personal" className="w-full">
      <TabsList className="flex w-full flex-wrap justify-start">
        {SCHOLAR_DETAIL_TABS.map((t) => (
          <TabsTrigger key={t.id} value={t.id}>
            {t.label}
          </TabsTrigger>
        ))}
        <TabsTrigger value="assessments">Assessments</TabsTrigger>
      </TabsList>
      {SCHOLAR_DETAIL_TABS.map((t) => (
        <TabsContent key={t.id} value={t.id} className="mt-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            {t.rows.map(([l, k]) => (
              <div
                key={k}
                className="min-w-0 space-y-1 border-b border-border py-3 text-card-foreground"
              >
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {l}
                </dt>
                <dd className="mt-1 text-sm">{value(k)}</dd>
              </div>
            ))}
          </dl>
        </TabsContent>
      ))}
      <TabsContent value="assessments" className="mt-4">
        <ScholarAssessments />
      </TabsContent>
    </Tabs>
  );
}

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Enter the first name").max(100),
  last_name: z.string().trim().min(1, "Enter the last name").max(100),
  guardian_first_name: z.string().trim().min(1, "Enter the parent/guardian first name").max(100),
  guardian_last_name: z.string().trim().min(1, "Enter the parent/guardian last name").max(100),
  full_name: z.string().trim().min(2, "Enter the scholar's name"),
  contact_no: z
    .string()
    .trim()
    .refine(isPossiblePhoneNumber, "Enter a valid number with its country code"),
  id_number: z.string().trim().default(""),
  school: z.string().trim().min(2, "Enter the current school"),
  school_type: z.enum(["Public School", "Private School", "Home School", "Not recorded"]),
  school_country_code: z
    .string()
    .trim()
    .regex(/^[A-Z]{2}$/, "Choose the school country")
    .or(z.literal(""))
    .optional(),
  career_interests: z.string().trim().max(10000).optional(),
  dietary: z.string().trim().max(200).optional(),
  guardian_name: z.string().trim().min(2, "Enter the parent/guardian name"),
  guardian_contact: z
    .string()
    .trim()
    .refine(isPossiblePhoneNumber, "Enter a valid parent/guardian number with its country code"),
  guardian_email: z.string().trim().email("Enter a valid email"),
  guardian_id: z.string().trim().optional(),
  tc_accepted: z.literal(true, {
    errorMap: () => ({ message: "Please accept the Terms & Conditions" }),
  }),
  popi_accepted: z.literal(true, {
    errorMap: () => ({ message: "Please provide POPI consent to continue" }),
  }),
  info_accurate: z.literal(true, {
    errorMap: () => ({ message: "Please confirm the information supplied is accurate" }),
  }),
  population_group: z.string().trim().max(50).optional(),
  gender: z.string().trim().max(50).optional(),
  disability: z.string().trim().max(50).optional(),
  citizenship: z.string().trim().max(50).optional(),
});

export function restoreProfileNames(
  values: Record<string, string | boolean>,
  original: Record<string, unknown> = {},
) {
  const result = { ...values };
  for (const prefix of ["", "guardian_"]) {
    const full = prefix ? "guardian_name" : "full_name";
    if (
      !String(result[prefix + "first_name"] ?? "").trim() &&
      !String(result[prefix + "last_name"] ?? "").trim()
    ) {
      const existing = String(result[full] || original[full] || "").trim();
      if (existing) {
        const [first, ...last] = existing.split(/\s+/);
        result[prefix + "first_name"] = first!;
        result[prefix + "last_name"] = last.join(" ");
        result[full] = existing;
      }
    }
  }
  return result;
}

export function ProfileForm({
  userId,
  initialProfile,
  onSaved,
  editing = false,
  onCancel,
}: {
  userId: string;
  initialProfile?: Record<string, unknown> | undefined;
  onSaved?: (() => void) | undefined;
  editing?: boolean;
  onCancel?: (() => void) | undefined;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState<Record<string, string | boolean>>(() =>
    restoreProfileNames(
      {
        school_type: "Not recorded",
        school_country_code: "",
        tc_accepted: false,
        popi_accepted: false,
        ...Object.fromEntries(
          Object.entries(initialProfile ?? {}).filter(
            ([, value]) => typeof value === "string" || typeof value === "boolean",
          ),
        ),
        info_accurate: true,
        contact_no: initialProfile?.["contact_no"]
          ? phoneWithCountryCode(String(initialProfile["contact_no"]), "ZA")
          : "",
        guardian_contact: initialProfile?.["guardian_contact"]
          ? phoneWithCountryCode(String(initialProfile["guardian_contact"]), "ZA")
          : "",
      },
      initialProfile,
    ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [draftReady, setDraftReady] = useState(editing);
  const draft = useQuery({
    queryKey: ["scholar-profile-draft", userId],
    enabled: !editing,
    retry: false,
    queryFn: async () => {
      const result = await supabase
        .from("scholar_profile_drafts")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });
  useEffect(() => {
    if (editing || !draft.isSuccess || draftReady) return;
    if (draft.data) {
      const values = z.record(z.union([z.string(), z.boolean()])).safeParse(draft.data.data);
      if (values.success) {
        setF((current) => restoreProfileNames({ ...current, ...values.data }, initialProfile));
        setActiveTab(draft.data.step === "diversity" ? "school" : draft.data.step);
      }
    }
    setDraftReady(true);
  }, [draft.isSuccess, draft.data, draftReady]);
  const account = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () =>
      (await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle()).data,
  });
  useEffect(() => {
    const a = account.data;
    if (!a) return;
    setF((cur) => {
      const first = String(cur["first_name"] ?? "") || a.first_name || "";
      const last = String(cur["last_name"] ?? "") || a.last_name || "";
      return {
        ...cur,
        first_name: first,
        last_name: last,
        full_name: String(cur["full_name"] ?? "") || `${first} ${last}`.trim(),
      };
    });
  }, [account.data]);
  const [files, setFiles] = useState<{ id?: File | undefined; photo?: File | undefined }>({});
  const errorTab = (key: string) =>
    key.startsWith("guardian_")
      ? "guardian"
      : [
            "career_interests",
            "dietary",
            "population_group",
            "gender",
            "disability",
            "citizenship",
          ].includes(key)
        ? "school"
        : "personal";
  function showError(key: string) {
    setActiveTab(errorTab(key));
    const target =
      key === "first_name" || key === "full_name"
        ? "learner-name-first"
        : key === "last_name"
          ? "learner-name-last"
          : key === "guardian_first_name" || key === "guardian_name"
            ? "guardian-name-first"
            : key === "guardian_last_name"
              ? "guardian-name-last"
              : key === "id_file_path"
                ? "id-scan"
                : key;
    setTimeout(() => document.getElementById(target)?.focus(), 0);
  }

  const field = (k: string, label: string, placeholder?: string) => (
    <div className={`min-w-0 ${errors[k] ? "rounded outline outline-2 outline-destructive" : ""}`}>
      <Label htmlFor={k}>{label}</Label>
      {["contact_no", "guardian_contact"].includes(k) ? (
        <PhoneInput
          id={k}
          label={label}
          value={String(f[k] ?? "")}
          onChange={(value) => setF({ ...f, [k]: value })}
        />
      ) : (
        <Input
          id={k}
          placeholder={placeholder}
          value={(f[k] as string) ?? ""}
          onChange={(e) => setF({ ...f, [k]: e.target.value })}
        />
      )}
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    await saveStep(editing);
  }
  async function saveStep(finishEditing = false) {
    if (busy || !draftReady) return;
    const values = {
      ...Object.fromEntries(Object.keys(profileSchema.shape).map((key) => [key, f[key] ?? ""])),
      full_name: joinPersonName(String(f["first_name"] ?? ""), String(f["last_name"] ?? "")),
      guardian_name: joinPersonName(
        String(f["guardian_first_name"] ?? ""),
        String(f["guardian_last_name"] ?? ""),
      ),
    };
    const lastStep = finishEditing || activeTab === "school";
    const schema = lastStep
      ? profileSchema
      : activeTab === "personal"
        ? profileSchema.pick({
            first_name: true,
            last_name: true,
            full_name: true,
            contact_no: true,
            school: true,
            school_type: true,
            school_country_code: true,
            tc_accepted: true,
            popi_accepted: true,
          })
        : profileSchema.pick({
            guardian_first_name: true,
            guardian_last_name: true,
            guardian_name: true,
            guardian_contact: true,
            guardian_email: true,
            guardian_id: true,
          });
    const validation = schema.safeParse(values);
    const issues = validation.success
      ? {}
      : Object.fromEntries(
          validation.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        );
    if (Object.keys(issues).length) {
      setErrors(issues);
      setActiveTab(errorTab(Object.keys(issues)[0]!));
      return;
    }
    setErrors({});
    setBusy(true);
    const upload = async (file: File | undefined, kind: string) => {
      if (!file) return null;
      const path = `${userId}/${kind}-${Date.now()}-${file.name}`;
      const res = await supabase.storage.from("scholar-docs").upload(path, file, { upsert: true });
      if (res.error) throw new Error(res.error.message);
      return path;
    };
    let id_file_path: string | null =
      typeof f["id_file_path"] === "string" ? f["id_file_path"] : null;
    let photo_path: string | null = typeof f["photo_path"] === "string" ? f["photo_path"] : null;
    try {
      if (files.id) id_file_path = await upload(files.id, "id");
      if (files.photo) photo_path = await upload(files.photo, "photo");
      const saved = {
        ...f,
        ...values,
        ...(id_file_path ? { id_file_path } : {}),
        ...(photo_path ? { photo_path } : {}),
        ...(f["tc_accepted"] === true && !f["tc_accepted_at"]
          ? { tc_accepted_at: new Date().toISOString() }
          : {}),
        ...(f["popi_accepted"] === true && !f["popi_accepted_at"]
          ? { popi_accepted_at: new Date().toISOString() }
          : {}),
      };
      const nextTab =
        SCHOLAR_DETAIL_TABS[SCHOLAR_DETAIL_TABS.findIndex((tab) => tab.id === activeTab) + 1]?.id ??
        "school";
      const draftSave = editing
        ? { error: null }
        : await supabase.from("scholar_profile_drafts").upsert({
            user_id: userId,
            data: saved,
            step: nextTab,
            updated_at: new Date().toISOString(),
          });
      if (draftSave.error) throw draftSave.error;
      setF(saved);
      setFiles({});
      if (!lastStep) {
        setActiveTab(nextTab);
        return;
      }
      const r = profileSchema.parse(values);
      const patch = {
        ...r,
        school_country_code: r.school_country_code || null,
        career_interests: r.career_interests || null,
        dietary: r.dietary || null,
        guardian_id: r.guardian_id || null,
        population_group: r.population_group || null,
        gender: r.gender || null,
        disability: r.disability || null,
        citizenship: r.citizenship || null,
        user_id: userId,
        id_file_path,
        photo_path,
        tc_accepted_at: String(saved["tc_accepted_at"]),
        popi_accepted_at: String(saved["popi_accepted_at"]),
      };
      const result = await supabase
        .from("scholar_profiles")
        .upsert(patch, { onConflict: "user_id" });
      if (result.error) throw result.error;
      const accountSave = await supabase.from("profiles").upsert({
        user_id: userId,
        first_name: r.first_name,
        last_name: r.last_name,
        display_name: r.full_name,
        updated_at: new Date().toISOString(),
      });
      if (accountSave.error) throw accountSave.error;
      const cleanup = editing
        ? { error: null }
        : await supabase.from("scholar_profile_drafts").delete().eq("user_id", userId);
      if (cleanup.error) throw cleanup.error;
      await qc.invalidateQueries({ queryKey: ["scholar-profile-draft", userId] });
      await qc.invalidateQueries({ queryKey: ["scholar-profile"] });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["site-session"] });
      await qc.invalidateQueries({ queryKey: ["how-to-progress"] });
      onSaved?.();
    } catch (ex) {
      setErrors({
        form:
          ex instanceof Error
            ? ex.message
            : String(
                (ex as { message?: string }).message ??
                  "Your progress could not be saved. Please try again.",
              ),
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      noValidate
      onSubmit={save}
      className="min-w-0 w-full space-y-5 [&_[aria-invalid=true]]:border-destructive [&_[aria-invalid=true]]:ring-1 [&_[aria-invalid=true]]:ring-destructive"
    >
      <div>
        <h1 className="font-display text-4xl">Personal Details</h1>
        <h5 className="mt-1 font-semibold">NOTE: no more than one scholar per registration.</h5>
      </div>
      <fieldset disabled={busy || !draftReady} className="min-w-0 space-y-5">
        <Tabs
          value={activeTab}
          onValueChange={(target) => {
            if (
              editing ||
              SCHOLAR_DETAIL_TABS.findIndex((tab) => tab.id === target) <
                SCHOLAR_DETAIL_TABS.findIndex((tab) => tab.id === activeTab)
            ) {
              setActiveTab(target);
              setErrors({});
            } else {
              void saveStep();
            }
          }}
          className="w-full"
        >
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="personal">Personal Details</TabsTrigger>
            <TabsTrigger value="guardian">Parent / Guardian</TabsTrigger>
            <TabsTrigger value="school">Secondary Information</TabsTrigger>
          </TabsList>
          <TabsContent value="personal" className="mt-4">
            <ProfilePhotoPicker
              path={String(f["photo_path"] ?? "")}
              file={files.photo}
              onChange={(photo) => setFiles((current) => ({ ...current, photo }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <PersonNameFields
                  id="learner-name"
                  label="Name"
                  originalName={String(initialProfile?.["full_name"] ?? "")}
                  required
                  firstName={String(f["first_name"] ?? "")}
                  lastName={String(f["last_name"] ?? "")}
                  firstNameInvalid={!!errors["first_name"]}
                  lastNameInvalid={!!errors["last_name"]}
                  onChange={(first, last, full) =>
                    setF({ ...f, first_name: first, last_name: last, full_name: full })
                  }
                />
                {(errors["first_name"] || errors["last_name"]) && (
                  <p className="text-xs text-destructive">
                    {errors["first_name"] || errors["last_name"]}
                  </p>
                )}
              </div>
              {field("contact_no", "Tel No", "Tel no")}
              <SchoolPicker
                school={String(f["school"] ?? "")}
                country={String(f["school_country_code"] ?? "")}
                schoolType={String(f["school_type"] ?? "")}
                invalid={!!errors["school"] || !!errors["school_country_code"]}
                onChange={(school, country, schoolType) =>
                  setF({ ...f, school, school_country_code: country, school_type: schoolType })
                }
              />
            </div>
          </TabsContent>
          <TabsContent value="guardian" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <PersonNameFields
                  id="guardian-name"
                  originalName={String(initialProfile?.["guardian_name"] ?? "")}
                  required
                  firstName={String(f["guardian_first_name"] ?? "")}
                  lastName={String(f["guardian_last_name"] ?? "")}
                  firstNameInvalid={!!errors["guardian_first_name"]}
                  lastNameInvalid={!!errors["guardian_last_name"]}
                  onChange={(first, last, full) =>
                    setF({
                      ...f,
                      guardian_first_name: first,
                      guardian_last_name: last,
                      guardian_name: full,
                    })
                  }
                />
                {(errors["guardian_first_name"] || errors["guardian_last_name"]) && (
                  <p className="text-xs text-destructive">
                    {errors["guardian_first_name"] || errors["guardian_last_name"]}
                  </p>
                )}
              </div>
              {field("guardian_contact", "Contact Number", "Contact number")}
              {field("guardian_email", "Email Address", "name@example.com")}
            </div>
          </TabsContent>
          <TabsContent value="school" className="mt-4">
            <p className="text-xs text-muted-foreground">
              Optional. These details support your host’s CSI reporting.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                Population group
                <select
                  value={String(f["population_group"] ?? "")}
                  onChange={(e) => setF({ ...f, population_group: e.target.value })}
                  className="mt-1 w-full rounded border border-input bg-background px-2 py-2"
                >
                  <option value="">Prefer not to say</option>
                  <option>African</option>
                  <option>Coloured</option>
                  <option>Indian</option>
                  <option>White</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="block text-sm">
                Gender
                <select
                  value={String(f["gender"] ?? "")}
                  onChange={(e) => setF({ ...f, gender: e.target.value })}
                  className="mt-1 w-full rounded border border-input bg-background px-2 py-2"
                >
                  <option value="">Prefer not to say</option>
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="block text-sm">
                Disability status
                <select
                  value={String(f["disability"] ?? "")}
                  onChange={(e) => setF({ ...f, disability: e.target.value })}
                  className="mt-1 w-full rounded border border-input bg-background px-2 py-2"
                >
                  <option value="">Prefer not to say</option>
                  <option>None</option>
                  <option>Disabled</option>
                </select>
              </label>
              <label className="block text-sm">
                Citizenship
                <select
                  value={String(f["citizenship"] ?? "")}
                  onChange={(e) => setF({ ...f, citizenship: e.target.value })}
                  className="mt-1 w-full rounded border border-input bg-background px-2 py-2"
                >
                  <option value="">Prefer not to say</option>
                  <option>South African</option>
                  <option>Other</option>
                </select>
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DietaryNeedsPicker
                value={String(f["dietary"] ?? "")}
                onChange={(value) => setF({ ...f, dietary: value })}
              />
            </div>
          </TabsContent>
        </Tabs>
        {activeTab === "personal" && (
          <>
            <div className="min-w-0 w-full space-y-1 rounded-md bg-cta px-4 py-3 text-cta-foreground">
              <label className="flex items-center gap-2 text-sm">
                <input
                  id="tc_accepted"
                  type="checkbox"
                  aria-invalid={!!errors["tc_accepted"]}
                  checked={!!f["tc_accepted"]}
                  onChange={(e) => setF({ ...f, tc_accepted: e.target.checked })}
                />
                I agree with the{" "}
                <Link to="/legal" target="_blank" className="font-bold underline">
                  Terms &amp; Conditions
                </Link>
              </label>
              {typeof initialProfile?.["tc_accepted_at"] === "string" && (
                <p className="pl-6 text-xs opacity-80">
                  Agreed {formatAcceptedAt(initialProfile["tc_accepted_at"])}
                </p>
              )}
            </div>
            {errors["tc_accepted"] && (
              <p className="text-xs text-destructive">{errors["tc_accepted"]}</p>
            )}
            <div className="min-w-0 w-full space-y-1 rounded-md bg-cta px-4 py-3 text-cta-foreground">
              <label className="flex items-center gap-2 text-sm">
                <input
                  id="popi_accepted"
                  type="checkbox"
                  aria-invalid={!!errors["popi_accepted"]}
                  checked={!!f["popi_accepted"]}
                  onChange={(e) => setF({ ...f, popi_accepted: e.target.checked })}
                />
                As parent/guardian, I give{" "}
                <Link to="/legal" target="_blank" className="font-bold underline">
                  POPI consent
                </Link>{" "}
                to process this information
              </label>
              {typeof initialProfile?.["popi_accepted_at"] === "string" && (
                <p className="pl-6 text-xs opacity-80">
                  Agreed {formatAcceptedAt(initialProfile["popi_accepted_at"])}
                </p>
              )}
            </div>
            {errors["popi_accepted"] && (
              <p className="text-xs text-destructive">{errors["popi_accepted"]}</p>
            )}
          </>
        )}
      </fieldset>
      {draft.error && (
        <p role="alert" className="text-sm text-destructive">
          Saved progress could not be loaded.{" "}
          <button type="button" className="underline" onClick={() => void draft.refetch()}>
            Try again
          </button>
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        {editing ? (
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        ) : activeTab !== "personal" ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy || !draftReady}
            onClick={() => {
              setActiveTab(
                SCHOLAR_DETAIL_TABS[
                  SCHOLAR_DETAIL_TABS.findIndex((tab) => tab.id === activeTab) - 1
                ]!.id,
              );
              setErrors({});
            }}
          >
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          disabled={busy || !draftReady}
          className="bg-primary text-primary-foreground"
        >
          {busy ? "Saving…" : editing ? "Save" : "Next"}
        </Button>
      </div>
      {errors["form"] && (
        <p role="alert" className="text-sm text-destructive">
          {errors["form"]}
        </p>
      )}
      {Object.keys(errors).some((key) => key !== "form") && (
        <div role="alert" className="text-sm text-destructive">
          <p className="font-semibold">Please complete the following required fields:</p>
          <ul className="list-disc pl-5">
            {Object.entries(errors)
              .filter(([key]) => key !== "form" && !["full_name", "guardian_name"].includes(key))
              .map(([key, message]) => (
                <li key={key}>
                  <button
                    type="button"
                    className="text-left underline"
                    onClick={() => showError(key)}
                  >
                    {message}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </form>
  );
}

export function Bookings({ selectedId }: { selectedId?: string | undefined } = {}) {
  const { data: user } = useUser();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const result = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });
  const [err, setErr] = useState<string | null>(null);
  async function act(fn: "confirm_test_payment", id: string) {
    setErr(null);
    const { error } = await supabase.rpc(fn, { _booking: id });
    if (error) setErr(error.message);
    qc.invalidateQueries({ queryKey: ["bookings"] });
    qc.invalidateQueries({ queryKey: ["emails"] });
  }
  async function reportMentorNoShow(id: string) {
    if (
      !(await confirmAction(
        "Report that the mentor did not show up for this job shadow? This immediately refunds the amount to your wallet.",
        { confirmLabel: "Report no-show" },
      ))
    )
      return;
    setErr(null);
    const { error } = await supabase.rpc("report_mentor_no_show", { _booking: id });
    if (error) return setErr(error.message);
    qc.invalidateQueries({ queryKey: ["bookings"] });
    qc.invalidateQueries({ queryKey: ["wallet-balance"] });
  }
  return (
    <div className="space-y-3">
      <h2 className="font-display text-3xl text-teal-foreground">My bookings</h2>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {q.data?.length === 0 && (
        <p className="text-muted-foreground">No bookings yet. Book your first Job Shadow below.</p>
      )}
      {q.data
        ?.filter((b) => !selectedId || b.id === selectedId)
        .map((b) => (
          <div key={b.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {b.career} · {b.company}
                  {b.mode ? ` (${b.mode})` : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {b.sector} · {b.location} · {b.shadow_date}
                  {b.arrival_time &&
                    b.collection_time &&
                    ` · ${displayTime(b.arrival_time)} – ${displayTime(b.collection_time)}`}
                </p>
              </div>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                {STATUS[b.status] ?? b.status}
              </span>
            </div>
            <p className="mt-2 text-sm">
              Amount: R{Number(b.amount_due).toFixed(0)}
              {b.voucher_code ? ` (voucher ${b.voucher_code}, -${b.discount}%)` : ""}
            </p>
            <div className="mt-3 flex gap-2">
              {b.status === "awaiting_payment" && (
                <Button size="sm" onClick={() => act("confirm_test_payment", b.id)}>
                  Pay R{Number(b.amount_due).toFixed(0)} (test payment)
                </Button>
              )}
              {b.status === "indemnity_required" && (
                <div className="flex flex-col gap-1">
                  <Link
                    to="/indemnity/$bookingId"
                    params={{ bookingId: b.id }}
                    target="_blank"
                    className="rounded bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground"
                  >
                    View indemnity form
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Your parent/guardian must sign this from their own account before the booking is
                    confirmed.
                  </p>
                </div>
              )}
              {b.status === "completed" && (
                <Link
                  to="/evaluation/$bookingId"
                  params={{ bookingId: b.id }}
                  className="rounded bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground"
                >
                  Evaluate this job shadow
                </Link>
              )}
              {["confirmed", "completed"].includes(b.status) &&
                (b.refund_status ?? "none") === "none" && (
                  <Button size="sm" variant="outline" onClick={() => reportMentorNoShow(b.id)}>
                    Mentor didn't show up?
                  </Button>
                )}
              {b.refund_status === "approved" && (
                <p className="text-xs text-muted-foreground">Refunded to your wallet.</p>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}

function StudentJourney({
  userId,
  savedCareer,
  profile,
  initialStep,
  profileContent,
}: {
  userId: string;
  savedCareer: string;
  profile: Record<string, unknown> | null;
  initialStep?: string | undefined;
  profileContent?: ReactNode;
}) {
  const [requestedActive, setActive] = useState(initialStep ?? "profile");
  useEffect(() => {
    if (initialStep) setActive(initialStep);
  }, [initialStep]);
  const [editingProfile, setEditingProfile] = useState(false);
  const qc = useQueryClient();
  const [selection, setSelection] = useState<string | null>(null);
  const career = selection ?? savedCareer;
  const saveCareer = useMutation({
    scope: { id: "scholar-career-preference" },
    mutationFn: async (value: string) => {
      const current = await supabase.auth.getUser();
      if (current.error || current.data.user?.id !== userId)
        throw new Error("Sign in to save your career selection.");
      const result = await supabase.auth.updateUser({ data: { selected_career: value } });
      if (result.error || result.data.user?.id !== userId)
        throw result.error ?? new Error("Career selection could not be saved.");
      return result.data.user;
    },
    onSuccess: (updated) => {
      qc.setQueryData(["me"], (cached: typeof updated | undefined) =>
        cached?.id === userId
          ? {
              ...cached,
              user_metadata: {
                ...cached.user_metadata,
                selected_career: updated.user_metadata["selected_career"],
              },
            }
          : cached,
      );
    },
  });
  const setCareer = (value: string) => {
    setSelection(value);
    saveCareer.mutate(value);
  };
  const [selectedId, setSelectedId] = useState("");
  const bookings = useQuery({
    queryKey: ["bookings", userId],
    queryFn: async () => {
      const result = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });
  const current = selectedId
    ? bookings.data?.find((booking) => booking.id === selectedId)
    : bookings.data?.find((booking) => booking.status !== "cancelled");
  const feedback = useQuery({
    queryKey: ["student-journey-feedback", current?.id],
    enabled: current?.status === "completed",
    queryFn: async () => {
      const result = await supabase.rpc("get_evaluation_context", { _booking: current!.id });
      if (result.error) throw result.error;
      return result.data?.[0];
    },
  });
  const paid =
    !!current?.paid_at ||
    ["indemnity_required", "confirmed", "completed"].includes(current?.status ?? "");
  const confirmed = current?.status === "confirmed" || current?.status === "completed";
  const steps: JourneyStep[] = [
    { id: "profile", title: "Complete Profile", icon: UserRound, complete: !!profile },
    {
      id: "careers",
      title: "Explore Careers",
      icon: Search,
      complete: !!career || !!current,
      locked: !profile,
    },
    {
      id: "request",
      title: "Request a Booking",
      icon: CalendarDays,
      complete: !!current,
      locked: !profile,
    },
    { id: "payment", title: "Make Payment", icon: CreditCard, complete: paid, locked: !current },
    {
      id: "forms",
      title: "Complete Forms",
      icon: FileText,
      complete: confirmed,
      locked: !current,
    },
    {
      id: "confirmation",
      title: "Check Confirmation",
      icon: BadgeCheck,
      complete: confirmed,
      locked: !current,
    },
    {
      id: "experience",
      title: "Do Your Job Shadow",
      icon: Briefcase,
      complete: current?.status === "completed",
      locked: !confirmed,
    },
    {
      id: "feedback",
      title: "Share Feedback",
      icon: Star,
      complete: feedback.data?.already_submitted === true,
      locked: current?.status !== "completed",
    },
  ];
  const unlockedActive = steps.find((step) => step.id === requestedActive)?.locked
    ? !profile
      ? "profile"
      : !current
        ? "request"
        : !confirmed
          ? "forms"
          : "experience"
    : requestedActive;
  const active = unlockedActive === "request" && !career ? "careers" : unlockedActive;

  return (
    <section className="min-w-0 space-y-5" aria-label="Scholar step wizard">
      {saveCareer.isPending && (
        <p role="status" className="text-sm">
          Saving your career selection…
        </p>
      )}
      {saveCareer.isError && (
        <p role="alert" className="text-sm text-destructive">
          Your career is selected, but could not be saved for your next visit.{" "}
          <button type="button" className="underline" onClick={() => saveCareer.mutate(career)}>
            Retry saving
          </button>
        </p>
      )}
      {active !== requestedActive && (
        <p className="text-sm">
          Complete the current step before continuing to the step you selected.
        </p>
      )}
      <JourneyStepper
        title="Your Job Shadow Journey"
        steps={steps}
        active={active}
        onChange={(step) => {
          if (step === "profile" && profile) setEditingProfile(true);
          setActive(step);
        }}
      >
        <div className="min-w-0 overflow-hidden text-foreground">
          {active === "profile" && profileContent && (
            <div className="space-y-4">
              {profileContent}
              <div className="flex justify-end">
                <Button disabled={!profile} onClick={() => setActive("careers")}>
                  Continue to Explore Careers
                </Button>
              </div>
            </div>
          )}
          {active === "profile" &&
            !profileContent &&
            (!profile || editingProfile ? (
              <ProfileForm
                userId={userId}
                initialProfile={profile ?? undefined}
                editing={!!profile && editingProfile}
                onCancel={() => setEditingProfile(false)}
                onSaved={() => {
                  setEditingProfile(false);
                  setActive("careers");
                }}
              />
            ) : (
              <div className="space-y-4">
                <p className="text-sm">
                  Your profile is saved. Review your details before choosing a career and host.
                </p>
                <ScholarDetails p={profile} />
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => setEditingProfile(true)}>
                    Edit Profile
                  </Button>
                  <Button className="ml-auto" onClick={() => setActive("careers")}>
                    Continue to Explore Careers
                  </Button>
                </div>
              </div>
            ))}
          {active === "careers" && (
            <div className="space-y-4">
              <p className="text-sm">
                Choose a career that interests you, then find a host offering that experience.
              </p>
              <CareerStepBrowser selected={career} onSelect={setCareer} />
              <Button
                disabled={!career || saveCareer.isPending}
                onClick={() => setActive("request")}
              >
                Continue to Find a Mentor
              </Button>
            </div>
          )}
          {active === "request" && (
            <NewBooking
              initialCareer={career}
              onBackToCareers={() => setActive("careers")}
              onBooked={(id) => {
                setSelectedId(id);
                setActive("payment");
              }}
            />
          )}
          {["payment", "forms", "confirmation", "experience", "feedback"].includes(active) && (
            <div className="space-y-4">
              <label className="block text-sm">
                Your application
                <select
                  value={current?.id ?? ""}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="mt-1 block w-full rounded border border-input bg-background p-2"
                >
                  <option value="" disabled>
                    Choose an application
                  </option>
                  {bookings.data?.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.career} — {booking.company} — {booking.shadow_date}
                    </option>
                  ))}
                </select>
              </label>
              {!current ? (
                <p className="text-sm">
                  {bookings.isFetching
                    ? "Loading your application…"
                    : "Choose an application to continue."}
                </p>
              ) : (
                <>
                  {active === "payment" && (
                    <>
                      <p className="text-sm">
                        {paid
                          ? "Payment is recorded for this booking."
                          : current.status === "pending_approval"
                            ? "Your host needs to approve the request before payment is available."
                            : "Review your booking and complete payment below."}
                      </p>
                      <Bookings selectedId={current.id} />
                      <Button disabled={!paid} onClick={() => setActive("forms")}>
                        Continue to Complete Forms
                      </Button>
                    </>
                  )}
                  {active === "forms" && (
                    <>
                      <p className="text-sm">
                        Check payment and complete the required indemnity and consent documents for
                        this booking.
                      </p>
                      <Bookings selectedId={current.id} />
                      <Button variant="outline" onClick={() => setActive("confirmation")}>
                        Check Confirmation
                      </Button>
                    </>
                  )}
                  {active === "confirmation" && (
                    <>
                      <p className="text-sm">
                        {confirmed
                          ? "Your booking is confirmed. Check the date, location and arrangements before your visit."
                          : current.status === "cancelled"
                            ? "This application has been cancelled. You can request another booking."
                            : "Your booking is not confirmed yet. Complete any outstanding payment or forms and check back here."}
                      </p>
                      <Bookings selectedId={current.id} />
                      {confirmed && (
                        <Button onClick={() => setActive("experience")}>
                          Continue to Your Job Shadow
                        </Button>
                      )}
                    </>
                  )}
                  {active === "experience" && (
                    <>
                      <p className="text-sm">
                        {current.career} at {current.company} · {current.shadow_date}
                      </p>
                      <p className="text-sm">
                        Check your booking instructions, arrival time and what to bring. Feedback
                        becomes available when the experience is recorded as completed.
                      </p>
                      <Bookings selectedId={current.id} />
                      {current.status === "completed" && (
                        <Button onClick={() => setActive("feedback")}>Continue to Feedback</Button>
                      )}
                    </>
                  )}
                  {active === "feedback" && (
                    <>
                      {feedback.data?.already_submitted ? (
                        <p className="text-sm">Thank you—your feedback has been submitted.</p>
                      ) : (
                        <>
                          <p className="text-sm">
                            Tell us about your experience and what you learned.
                          </p>
                          <Link
                            to="/evaluation/$bookingId"
                            params={{ bookingId: current.id }}
                            className="inline-block rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                          >
                            Complete Your Evaluation
                          </Link>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
          {bookings.error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Your applications could not be loaded. Please refresh and try again.
            </p>
          )}
        </div>
      </JourneyStepper>
    </section>
  );
}

type Placement = {
  id: number;
  company: string;
  sector: string;
  career: string;
  location: string;
  availability: string;
  amount: number;
  days_per_shadow: number | null;
  arrival_time: string | null;
  collection_time: string | null;
  description: string | null;
  mode: string | null;
};

const savedMentorSearch = z.object({
  sourceCareer: z.string(),
  career: z.string(),
  from: z.string(),
  to: z.string(),
  placementId: z.number().nullable(),
  date: z.string(),
});
type SavedMentorSearch = z.infer<typeof savedMentorSearch>;

function HostProfileCard({ companyId }: { companyId: number }) {
  const profile = useQuery({
    queryKey: ["host-profile-for-placement", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_host_profile_for_placement", {
        _company_id: companyId,
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });
  if (
    profile.isPending ||
    !profile.data ||
    (!profile.data.bio && !profile.data.certifications && !(profile.data.specialties ?? []).length)
  )
    return null;
  return (
    <div className="mt-4 rounded border border-current/20 bg-primary-foreground/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">About your host</p>
      {profile.data.bio && <p className="mt-1 text-sm">{profile.data.bio}</p>}
      {!!(profile.data.specialties ?? []).length && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {profile.data.specialties.map((s) => (
            <span key={s} className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">
              {s}
            </span>
          ))}
        </div>
      )}
      {profile.data.certifications && (
        <p className="mt-2 text-xs opacity-90">{profile.data.certifications}</p>
      )}
    </div>
  );
}

export function NewBooking({
  initialCareer = "",
  onBooked,
  onBackToCareers,
}: {
  initialCareer?: string;
  onBooked?: ((id: string) => void) | undefined;
  onBackToCareers?: (() => void) | undefined;
} = {}) {
  const { data: user } = useUser();
  const qc = useQueryClient();
  const placements = useQuery({
    queryKey: ["placements"],
    queryFn: async () =>
      (await fetchAllRows(async (from, to) => {
        const r = await supabase.rpc("list_placements").order("id").range(from, to);
        if (r.error) throw r.error;
        return r.data ?? [];
      })) as Placement[],
  });
  const favourites = useQuery({
    queryKey: ["career-favourites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const result = await supabase
        .from("career_favourites")
        .select("career_slug")
        .eq("user_id", user!.id);
      if (result.error) throw result.error;
      return new Set((result.data ?? []).map((row) => row.career_slug));
    },
  });
  const myBookings = useQuery({
    queryKey: ["bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const result = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return result.data ?? [];
    },
  });
  const noAvailabilityMessage = useQuery({
    queryKey: ["no-availability-message"],
    queryFn: async () => (await supabase.rpc("get_no_availability_message")).data,
  });
  const [sector, setSector] = useState("");
  const [career, setCareer] = useState("");
  const [step, setStep] = useState(1);
  const [pid, setPid] = useState<number | null>(null);
  useEffect(() => {
    if (initialCareer) {
      setCareer(initialCareer);
      setStep(3);
      setPid(null);
      setDate("");
    }
  }, [initialCareer]);
  const [date, setDate] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [rangeApplied, setRangeApplied] = useState(false);
  const [rangeError, setRangeError] = useState("");
  const [code, setCode] = useState("");
  const [voucher, setVoucher] = useState<{ code: string; discount: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDupe, setConfirmDupe] = useState(false);
  const [requestingDate, setRequestingDate] = useState(false);
  const [requestedDate, setRequestedDate] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [restoredSearch, setRestoredSearch] = useState(false);
  const restoredSearchKey = useRef("");
  const searchSave = useMutation({
    scope: { id: `mentor-search-${user?.id}` },
    mutationFn: async (value: { userId: string; search: SavedMentorSearch }) => {
      const session = await supabase.auth.getUser();
      if (session.error || session.data.user?.id !== value.userId)
        throw new Error("The signed-in account has changed.");
      const result = await supabase.auth.updateUser({ data: { mentor_search: value.search } });
      if (result.error) throw result.error;
      return value;
    },
    onSuccess: (value) => {
      qc.setQueryData(["me"], (previous: typeof user) =>
        previous?.id === value.userId
          ? {
              ...previous,
              user_metadata: { ...previous.user_metadata, mentor_search: value.search },
            }
          : previous,
      );
    },
  });
  function saveSearch(changes: Partial<SavedMentorSearch> = {}) {
    if (!user || !initialCareer) return;
    searchSave.mutate({
      userId: user.id,
      search: {
        sourceCareer: initialCareer,
        career,
        from: rangeFrom,
        to: rangeTo,
        placementId: pid,
        date,
        ...changes,
      },
    });
  }
  useEffect(() => {
    if (!user || !initialCareer || !placements.isSuccess) return;
    const key = `${user.id}:${initialCareer}`;
    if (restoredSearchKey.current === key) return;
    restoredSearchKey.current = key;
    setCareer(initialCareer);
    setRangeFrom("");
    setRangeTo("");
    setRangeApplied(false);
    setPid(null);
    setDate("");
    setRestoredSearch(false);
    setRangeError("");
    const parsed = savedMentorSearch.safeParse(user.user_metadata?.["mentor_search"]);
    if (!parsed.success || parsed.data.sourceCareer !== initialCareer) return;
    const saved = parsed.data;
    if (!bookingDateKey(saved.from) || !bookingDateKey(saved.to) || saved.from > saved.to) return;
    setCareer(saved.career);
    setRangeFrom(saved.from);
    setRangeTo(saved.to);
    const today = new Date();
    const todayKey = bookingDateKey(
      `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`,
    )!;
    if (saved.from < todayKey) {
      setRangeError(
        "Your saved search includes past dates. Choose a new date range to search again.",
      );
      return;
    }
    setRangeApplied(true);
    setRestoredSearch(true);
    const selected = placementsInDateRange(placements.data, saved.from, saved.to).find(
      (p) => p.id === saved.placementId && p.career === saved.career,
    );
    setPid(selected?.id ?? null);
    if (
      selected &&
      datesInRange(selected.availability, saved.from, saved.to).includes(
        bookingDateKey(saved.date) ?? "",
      )
    )
      setDate(saved.date);
  }, [user, initialCareer, placements.isSuccess, placements.data]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sectors = useMemo(
    () => [...new Set((placements.data ?? []).map((p) => p.sector))].sort(),
    [placements.data],
  );
  const options = (placements.data ?? []).filter((p) =>
    initialCareer
      ? p.career.trim().toLowerCase() === career.trim().toLowerCase()
      : p.sector === sector,
  );
  const chosen = options.find((p) => p.id === pid);
  const dayTimes = useQuery({
    queryKey: ["placement-day-times", chosen?.id],
    enabled: !!chosen,
    queryFn: async () => {
      const r = await supabase.rpc("get_placement_day_times", { _id: chosen!.id });
      if (r.error) throw r.error;
      return r.data ?? [];
    },
  });
  const selectedHours = dayTimes.data?.find((row) => row.available_on === bookingDateKey(date));
  const hostHolidays = useQuery({
    queryKey: ["placement-holidays", chosen?.id],
    enabled: !!chosen,
    queryFn: async () => {
      const country = await supabase.rpc("get_placement_country", { _id: chosen!.id });
      if (country.error) throw country.error;
      const holidays = await supabase.rpc("get_country_public_holidays", {
        _country_code: country.data || "ZA",
      });
      if (holidays.error) throw holidays.error;
      return holidays.data ?? [];
    },
  });
  const dates = (chosen?.availability ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean)
    .filter(
      (d) =>
        !initialCareer ||
        !rangeApplied ||
        (bookingDateKey(d) !== null &&
          bookingDateKey(d)! >= rangeFrom &&
          bookingDateKey(d)! <= rangeTo),
    )
    .filter(
      (d) =>
        hostHolidays.isSuccess && !(hostHolidays.data ?? []).includes(fromIsoDate(toIsoDate(d))),
    )
    .filter((d) => {
      const [m, dd, y] = d.split("/").map(Number);
      return new Date(y!, m! - 1, dd!) >= today;
    });
  const base = Number(chosen?.amount ?? 0);
  const due = voucher ? Math.max(0, base - (base * Number(voucher.discount)) / 100) : base;
  const duplicate = (myBookings.data ?? []).find(
    (b) =>
      chosen &&
      (b.shadow_date === date || (b.company_id === chosen.id && b.career === chosen.career)),
  );

  async function applyVoucher() {
    setMsg(null);
    const { data } = await supabase.rpc("check_voucher", { _code: code });
    const v = data?.[0];
    if (!v) {
      setVoucher(null);
      return setMsg("That promo code isn't valid right now.");
    }
    setVoucher({ code: v.code, discount: Number(v.discount) });
    setMsg(`Promo code applied: ${v.discount}% off.`);
  }
  async function book() {
    if (hostHolidays.isPending || hostHolidays.error) {
      setMsg("We’re checking the host’s public holidays. Please try again shortly.");
      return;
    }
    const effectiveDate = requestingDate ? requestedDate : date;
    if (
      !requestingDate &&
      (!dayTimes.isSuccess || !selectedHours?.from_time || !selectedHours?.to_time)
    )
      return setMsg("Please choose a day with confirmed From and To times.");
    if (!chosen || !effectiveDate) return setMsg("Choose a career and a date.");
    if (duplicate && !confirmDupe) return;
    const { data: created, error } = await supabase
      .from("bookings")
      .insert({
        company_id: chosen.id,
        company: chosen.company,
        sector: chosen.sector,
        career: chosen.career,
        location: chosen.location,
        mode: chosen.mode,
        shadow_date: effectiveDate,
        base_amount: base,
        voucher_code: voucher?.code ?? null,
        discount: voucher?.discount ?? 0,
        amount_due: due,
        ad_hoc_requested: requestingDate,
        ad_hoc_note: requestingDate ? requestNote || null : null,
      })
      .select("id, status")
      .single();
    if (error) return setMsg(error.message);
    setRequestingDate(false);
    setRequestedDate("");
    setRequestNote("");
    setPid(null);
    setDate("");
    setVoucher(null);
    setCode("");
    setConfirmDupe(false);
    if (created?.status === "pending_approval") {
      setMsg(
        "Your request has been sent to the mentor for approval. You'll be able to pay once they accept it.",
      );
    } else {
      setMsg("Booking created – continue to payment and forms.");
      if (created?.id) onBooked?.(created.id);
    }
    qc.invalidateQueries({ queryKey: ["bookings"] });
  }

  const careers = [...new Set(options.map((p) => p.career))].sort();
  const careerHosts = options.filter(
    (p) => p.career.trim().toLowerCase() === career.trim().toLowerCase(),
  );
  const hosts = initialCareer
    ? rangeApplied
      ? placementsInDateRange(careerHosts, rangeFrom, rangeTo)
      : []
    : careerHosts;
  const favouriteHosts = rangeApplied
    ? placementsInDateRange(
        (placements.data ?? []).filter((p) => {
          if (p.career.trim().toLowerCase() === career.trim().toLowerCase()) return false;
          const key = p.career
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
          const role = ROLES.find(
            (r) =>
              r.title
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "") === key,
          );
          return favourites.data?.has(role?.slug ?? "other-careers--" + key);
        }),
        rangeFrom,
        rangeTo,
      )
    : [];
  function updateRange(from: string, to: string) {
    setRangeFrom(from);
    setRangeTo(to);
    setRangeApplied(false);
    setRangeError("");
    setPid(null);
    setDate("");
    setConfirmDupe(false);
    setRestoredSearch(false);
  }
  function searchDates() {
    const todayKey = bookingDateKey(
      `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`,
    )!;
    if (!rangeFrom || !rangeTo || rangeFrom > rangeTo || rangeFrom < todayKey) {
      setRangeError(
        "Choose a start and end date, with the end on or after the start. The start date cannot be in the past.",
      );
      return;
    }
    setRangeApplied(true);
    setRangeError("");
    setRestoredSearch(false);
    saveSearch();
  }
  const sel =
    "block w-full max-w-md border-b border-current/50 bg-transparent p-2 text-teal-foreground outline-none [&>option]:text-foreground";
  const titles = ["Sector", "Career", "Mentor Availability", "Placement Details", "Date & Pay"];
  const hostLabel = (p: Placement, i: number) => {
    const sameLocation = hosts.filter((h) => h.location === p.location);
    const base =
      sameLocation.length > 1
        ? `${p.location} (Option ${sameLocation.indexOf(p) + 1})`
        : p.location || `Host ${i + 1}`;
    return p.mode ? `${base} — ${p.mode}` : base;
  };
  const STEP_BG = [
    "bg-teal text-teal-foreground",
    "bg-cta text-cta-foreground",
    "bg-teal text-teal-foreground",
    "bg-cta text-cta-foreground",
    "bg-teal text-teal-foreground",
  ];
  const canContinue =
    (step === 1 && !!sector) || (step === 2 && !!career) || (step === 3 && !!chosen) || step === 4;

  if (!initialCareer && !placements.isLoading && sectors.length === 0) {
    return (
      <div className="bg-accent px-6 py-8 text-center text-accent-foreground">
        <h2 className="font-display text-2xl">Book a Job Shadow</h2>
        <p className="mt-3">
          {noAvailabilityMessage.data ??
            "Our mentors are not available right now. Please check back closer to the time to see availability."}
        </p>
      </div>
    );
  }

  return (
    <div className={initialCareer ? "min-w-0" : "-mx-6"}>
      <div
        className={`${step === 3 ? "bg-[#FFFDF5] text-foreground" : STEP_BG[step - 1]} px-6 py-5`}
      >
        <div className="flex items-center gap-3">
          <ChevronDown className="h-6 w-6 shrink-0" />
          <h2 className="font-display text-2xl">
            {initialCareer ? titles[step - 1] : `Step ${step}: ${titles[step - 1]}`}
          </h2>
        </div>
        <div className="mt-5">
          {initialCareer && searchSave.isPending && (
            <p role="status" className="mb-3 text-sm">
              Saving your search…
            </p>
          )}
          {initialCareer && searchSave.isSuccess && !searchSave.isPending && (
            <p role="status" className="mb-3 text-sm">
              Search saved to your account.
            </p>
          )}
          {initialCareer && searchSave.isError && (
            <p role="alert" className="mb-3 text-sm text-destructive">
              Your search could not be saved.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => searchSave.variables && searchSave.mutate(searchSave.variables)}
              >
                Retry Saving
              </button>
            </p>
          )}
          {initialCareer && restoredSearch && (
            <p className="mb-3 text-sm">
              Your saved search has been restored. Results reflect current mentor availability.
            </p>
          )}
          {step === 1 && (
            <select
              className={sel}
              value={sector}
              onChange={(e) => {
                setSector(e.target.value);
                setCareer("");
                setPid(null);
                setDate("");
              }}
            >
              <option value="">Select a sector</option>
              {sectors.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
          {step === 2 && (
            <>
              <select
                className={sel}
                value={career}
                onChange={(e) => {
                  setCareer(e.target.value);
                  setPid(null);
                  setDate("");
                }}
              >
                <option value="">Select a career</option>
                {careers.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              {career && (
                <p className="mt-3 text-sm">
                  {options.find((p) => p.career === career)?.description || ""}
                </p>
              )}
            </>
          )}
          {step === 3 && !initialCareer && (
            <select
              className={sel}
              value={pid ?? ""}
              onChange={(e) => {
                setPid(Number(e.target.value) || null);
                setDate("");
                setConfirmDupe(false);
              }}
            >
              <option value="">Select a host</option>
              {hosts.map((p, i) => (
                <option key={p.id} value={p.id}>
                  {hostLabel(p, i)}
                </option>
              ))}
            </select>
          )}
          {step === 3 && initialCareer && (
            <div className="grid min-w-0 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <p className="text-sm font-semibold">{career}</p>
                <div className="flex flex-wrap items-end gap-4">
                  <label className="text-sm">
                    From
                    <input
                      type="date"
                      value={rangeFrom}
                      onChange={(e) => updateRange(e.target.value, rangeTo)}
                      className="mt-1 block rounded border border-current/40 bg-transparent p-2"
                    />
                  </label>
                  <label className="text-sm">
                    To
                    <input
                      type="date"
                      value={rangeTo}
                      min={rangeFrom || undefined}
                      onChange={(e) => updateRange(rangeFrom, e.target.value)}
                      className="mt-1 block rounded border border-current/40 bg-transparent p-2"
                    />
                  </label>
                  <Button type="button" disabled={placements.isFetching} onClick={searchDates}>
                    Search Available Mentors
                  </Button>
                </div>
                {rangeError && (
                  <p role="alert" className="text-sm">
                    {rangeError}
                  </p>
                )}
                {placements.isLoading ? (
                  <p role="status" className="text-sm">
                    Loading availability…
                  </p>
                ) : placements.error ? (
                  <p role="alert" className="text-sm">
                    Availability could not be loaded.{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => void placements.refetch()}
                    >
                      Try again
                    </button>
                  </p>
                ) : rangeApplied ? (
                  <div className="space-y-3">
                    <h3 className="font-semibold">Available mentor placements ({hosts.length})</h3>
                    {hosts.map((host, index) => (
                      <label
                        key={host.id}
                        className={
                          "flex cursor-pointer items-start gap-3 rounded border p-3 " +
                          (pid === host.id ? "border-primary bg-primary/5" : "border-current/30")
                        }
                      >
                        <input
                          type="radio"
                          name="matching-host"
                          checked={pid === host.id}
                          onChange={() => {
                            setPid(host.id);
                            setDate("");
                            setConfirmDupe(false);
                            saveSearch({ placementId: host.id, date: "" });
                          }}
                          className="mt-1"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">
                            {hostLabel(host, index)}
                          </span>
                          <span className="mt-1 block text-xs">
                            Times vary by available day · {host.days_per_shadow ?? 1} day(s)
                          </span>
                          <span className="mt-1 block text-xs">
                            Available:{" "}
                            {datesInRange(host.availability, rangeFrom, rangeTo)
                              .map((day) => new Date(day + "T12:00:00").toLocaleDateString("en-ZA"))
                              .join(", ")}
                          </span>
                        </span>
                      </label>
                    ))}
                    {!hosts.length && (
                      <p className="text-sm">
                        No available mentors match these dates. Try a wider range or choose another
                        career.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm">
                    Enter your preferred date range to find available mentors.
                  </p>
                )}
              </div>
              <aside aria-label="Favourite career availability" className="space-y-3">
                <h3 className="font-semibold">Your Favourites Are Available on These Days</h3>
                {!rangeApplied ? (
                  <p className="text-sm">
                    Search your preferred dates to see matches for your other favourite careers.
                  </p>
                ) : favourites.isPending ? (
                  <p role="status" className="text-sm">
                    Loading your favourites…
                  </p>
                ) : favourites.error ? (
                  <p role="alert" className="text-sm">
                    Your favourites could not be loaded.{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => void favourites.refetch()}
                    >
                      Try again
                    </button>
                  </p>
                ) : placements.error ? (
                  <p className="text-sm">
                    Availability could not be loaded. Please try the search again.
                  </p>
                ) : placements.isFetching ? (
                  <p role="status" className="text-sm">
                    Checking availability…
                  </p>
                ) : favouriteHosts.length ? (
                  favouriteHosts.map((host) => (
                    <div key={host.id} className="rounded border border-border p-3">
                      <p className="font-semibold">{host.career}</p>
                      <p className="text-sm">
                        {host.location}
                        {host.mode ? ` · ${host.mode}` : ""}
                      </p>
                      <p className="mt-1 text-sm">
                        {datesInRange(host.availability, rangeFrom, rangeTo)
                          .map((day) => new Date(day + "T12:00:00").toLocaleDateString("en-ZA"))
                          .join(", ")}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          setCareer(host.career);
                          setPid(host.id);
                          setDate("");
                          setConfirmDupe(false);
                          setStep(4);
                          saveSearch({ career: host.career, placementId: host.id, date: "" });
                        }}
                      >
                        Choose This Mentor
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm">
                    {favourites.data?.size
                      ? "No other favourite careers have mentors available in this date range."
                      : "Favourite careers while browsing to see their available dates here."}
                  </p>
                )}
              </aside>
            </div>
          )}
          {step === 4 && chosen && (
            <>
              <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold">Type</dt>
                  <dd>{chosen.mode || "TBC"}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Location</dt>
                  <dd>{chosen.location}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Days per shadow</dt>
                  <dd>{chosen.days_per_shadow ?? 1}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Arrival time</dt>
                  <dd>
                    {selectedHours?.from_time
                      ? displayTime(selectedHours.from_time)
                      : "Choose a date to see its hours"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Collection time</dt>
                  <dd>
                    {selectedHours?.to_time
                      ? displayTime(selectedHours.to_time)
                      : "Choose a date to see its hours"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Fee</dt>
                  <dd>R{base.toFixed(0)}</dd>
                </div>
              </dl>
              <HostProfileCard companyId={chosen.id} />
            </>
          )}
          {step === 5 && chosen && (
            <div className="space-y-3">
              <p className="text-sm">
                {dates.length
                  ? "Please select from the available dates below"
                  : "There are no available dates for this placement."}
              </p>
              <div className="flex flex-wrap gap-2">
                {dates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDate(d);
                      setConfirmDupe(false);
                      setRequestingDate(false);
                      saveSearch({ date: d });
                    }}
                    className={`border px-3 py-1 text-sm ${!requestingDate && date === d ? "bg-primary text-primary-foreground" : "border-current/60"}`}
                  >
                    {d}
                    {dayTimes.data?.find((row) => row.available_on === bookingDateKey(d)) && (
                      <span className="ml-2 text-xs">
                        {displayTime(
                          dayTimes.data.find((row) => row.available_on === bookingDateKey(d))!
                            .from_time ?? "",
                        )}{" "}
                        –{" "}
                        {displayTime(
                          dayTimes.data.find((row) => row.available_on === bookingDateKey(d))!
                            .to_time ?? "",
                        )}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {!requestingDate ? (
                <button
                  type="button"
                  onClick={() => {
                    setRequestingDate(true);
                    setDate("");
                    setConfirmDupe(false);
                  }}
                  className="text-sm underline"
                >
                  None of these dates work? Request a different date
                </button>
              ) : (
                <div className="space-y-2 rounded border border-current/40 bg-primary-foreground/10 p-3">
                  <label className="block text-sm">
                    Requested date
                    <input
                      type="date"
                      value={requestedDate ? toIsoDate(requestedDate) : ""}
                      onChange={(e) => setRequestedDate(fromIsoDate(e.target.value))}
                      className="mt-1 block w-full max-w-xs border-b border-current/50 bg-transparent px-1 py-1 outline-none"
                    />
                  </label>
                  <label className="block text-sm">
                    Note for the mentor (optional)
                    <textarea
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      className="mt-1 block w-full border-b border-current/50 bg-transparent px-1 py-1 outline-none"
                    />
                  </label>
                  <p className="text-xs text-current/70">
                    This date isn't pre-confirmed by the host — we'll check availability and follow
                    up before it's finalised.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestingDate(false);
                      setRequestedDate("");
                      setRequestNote("");
                    }}
                    className="text-xs underline"
                  >
                    Use a listed date instead
                  </button>
                </div>
              )}
              <div>
                <label className="text-sm font-semibold">Voucher code</label>
                <div className="mt-1 flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full max-w-xs border-b border-current/50 bg-transparent px-1 py-1 outline-none"
                  />
                  <button
                    type="button"
                    onClick={applyVoucher}
                    disabled={!code}
                    className="border border-current/60 px-4 py-1.5 text-sm font-semibold uppercase disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
              </div>
              <p className="text-sm">
                Total: <strong>R{due.toFixed(0)}</strong>
                {voucher && ` (was R${base.toFixed(0)})`}
              </p>
              {duplicate && (
                <div className="rounded border border-current/40 bg-primary-foreground/10 p-3 text-sm">
                  <p>
                    {duplicate.shadow_date === date
                      ? "You already have a booking on this date."
                      : `You already have a booking for ${duplicate.career} at ${duplicate.company}.`}
                  </p>
                  <label className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={confirmDupe}
                      onChange={(e) => setConfirmDupe(e.target.checked)}
                    />
                    Book anyway
                  </label>
                </div>
              )}
            </div>
          )}
          {msg && (
            <p aria-live="polite" className="mt-3 text-sm font-semibold">
              {msg}
            </p>
          )}
        </div>
      </div>
      <div
        className={`flex flex-wrap gap-2 px-6 pb-5 ${step === 3 ? "bg-[#FFFDF5] text-foreground" : initialCareer ? STEP_BG[step - 1] : "bg-primary pt-5"}`}
      >
        {initialCareer && step === 3 && (
          <Button type="button" variant="outline" onClick={onBackToCareers}>
            Back to Careers
          </Button>
        )}
        {step > (initialCareer ? 3 : 1) && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="bg-primary-foreground/20 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground"
          >
            {initialCareer ? `Back to ${titles[step - 2]}` : `Back to Step ${step - 1}`}
          </button>
        )}
        {step < 5 ? (
          <Button type="button" onClick={() => setStep(step + 1)} disabled={!canContinue}>
            {initialCareer
              ? step === 3
                ? "Continue to Payment"
                : `Continue to ${titles[step]}`
              : `Continue to Step ${step + 1}`}
          </Button>
        ) : (
          <button
            type="button"
            onClick={async () => {
              await book();
              setStep(initialCareer ? 3 : 1);
              setSector("");
              setCareer(initialCareer);
            }}
            disabled={
              !chosen || !(requestingDate ? requestedDate : date) || (!!duplicate && !confirmDupe)
            }
            className="rounded-full bg-cta px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-cta-foreground disabled:opacity-50"
          >
            {requestingDate ? "Submit date request" : "Pay with PayFast"}
          </button>
        )}
      </div>
    </div>
  );
}

export function Emails() {
  const q = useQuery({
    queryKey: ["emails"],
    queryFn: async () =>
      (await supabase.from("email_outbox").select("*").order("created_at", { ascending: false }))
        .data ?? [],
  });
  return (
    <div className="space-y-3">
      <h2 className="font-display text-3xl text-teal-foreground">Email notifications</h2>
      <p className="text-sm text-muted-foreground">
        Emails this booking triggers. They are recorded here and not sent yet.
      </p>
      {q.data?.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
      {q.data?.map((m) => (
        <details key={m.id} className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm">
            <strong>{m.subject}</strong> → {m.recipient || "(no address on file)"}
          </summary>
          <p className="mt-2 text-sm">{m.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {m.template} · {new Date(m.created_at).toLocaleString()}
          </p>
        </details>
      ))}
    </div>
  );
}
