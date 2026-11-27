import { MentorHostingGuide } from "@/components/mentor/MentorHostingGuide";
import { ProfileSummaryCard } from "@/components/account/ProfileSummaryCard";
import { readUserLocation, locationText } from "@/components/account/LocationFields";
import { MentorOnboardingWizard } from "@/components/mentor/MentorOnboardingWizard";
import { isMentorStep, type MentorOnboardingStep } from "@/lib/mentor-onboarding";
import { draftMentorProfileFromCv } from "@/lib/mentor-cv.functions";
import { TimePicker } from "@/components/TimePicker";
import { displayTime } from "@/lib/time-entry";
import { selectedDaySlots, validDaySlot, type DaySlot } from "@/lib/placement-day-times";
import {
  AccountPersonalDetails,
  type AccountPersonalDetailsHandle,
  useOwnIdentity,
} from "@/components/account/AccountProfile";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useServerFn } from "@tanstack/react-start";
import { syncAutomaticHolidays } from "@/lib/public-holidays.functions";
import { CountrySelect } from "@/components/CountrySelect";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Upload, Mail, Phone, MapPin } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/SiteLayout";
import { PortalLoading } from "@/components/PortalLoading";
import { bookingDayKey, countByDay, filterHostBookings } from "@/lib/host-bookings";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";

export const Route = createFileRoute("/_authenticated/mentor")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { section?: Section | undefined; entry?: "onboarding"; step?: MentorOnboardingStep } => ({
    ...(search["entry"] === "onboarding" ? { entry: "onboarding" as const } : {}),
    ...(isMentorStep(search["step"]) ? { step: search["step"] } : {}),
    section: ["calendar", "shadows", "messages", "profile", "professional", "settings"].includes(
      String(search["section"]),
    )
      ? (search["section"] as Section)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Mentor Portal | JobShadow" },
      { name: "description", content: "Manage your Job Shadow placements and bookings." },
      { property: "og:title", content: "Mentor Portal | JobShadow" },
      { property: "og:description", content: "Manage your Job Shadow placements and bookings." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MentorPortal,
});

type Placement = {
  id: number;
  company: string;
  career: string;
  sector: string;
  location: string;
  dates: string | null;
  active: boolean;
  max_applicants: number | null;
  days_per_shadow: number | null;
  arrival_time: string | null;
  collection_time: string | null;
  description: string | null;
  mode: string | null;
  allow_weekends: boolean;
  allow_off_season: boolean;
};
type MentorBooking = {
  id: string;
  company: string;
  career: string;
  location: string;
  shadow_date: string;
  status: string;
  scholar_name: string | null;
  scholar_contact: string | null;
  scholar_school: string | null;
  indemnity_received: boolean;
  internship_preapproved: boolean;
  internship_notes: string | null;
  decline_reason: string | null;
};

const STATUS: Record<string, string> = {
  pending_approval: "Awaiting your approval",
  awaiting_payment: "Awaiting payment",
  indemnity_required: "Paid – indemnity needed",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

type Section = "calendar" | "shadows" | "messages" | "profile" | "professional" | "settings";
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MentorPortal() {
  const search = Route.useSearch();
  const requestedSection = search.section;
  const ownIdentity = useOwnIdentity();
  const placements = useQuery({
    queryKey: ["mentor-placements"],
    queryFn: async () => {
      const r = await supabase.rpc("list_mentor_placements");
      if (r.error) throw r.error;
      return (r.data ?? []) as Placement[];
    },
  });
  const bookings = useQuery({
    queryKey: ["mentor-bookings"],
    queryFn: async () => {
      const r = await supabase.rpc("list_mentor_bookings");
      if (r.error) throw r.error;
      return (r.data ?? []) as MentorBooking[];
    },
  });
  const profile = useQuery({
    queryKey: ["host-profile"],
    staleTime: 15_000,
    queryFn: async () => {
      const r = await supabase.rpc("get_my_host_profile");
      if (r.error) throw r.error;
      return r.data;
    },
  });
  if (ownIdentity.pending || profile.isPending) return <PortalLoading portal={false} />;
  if (profile.error || !profile.data || !ownIdentity.user.data)
    return (
      <p role="alert" className="p-6">
        Your profile could not be loaded. Please refresh before editing.
      </p>
    );
  return (
    <div className="flex min-h-screen flex-col bg-teal">
      <SiteHeader />
      <main className="min-w-0 flex-1">
        <HostProfile
          initialStep={search.step}
          initialTab={
            requestedSection === "professional"
              ? "professional"
              : requestedSection === "settings"
                ? "availability"
                : requestedSection === "calendar" || requestedSection === "shadows"
                  ? "shadows"
                  : "overview"
          }
          bookings={bookings.data ?? []}
          placements={placements.data ?? []}
          loadingPlacements={placements.isPending}
          loadingBookings={bookings.isPending}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

function HostCalendar({ bookings }: { bookings: MentorBooking[] }) {
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [day, setDay] = useState<string | null>(null);
  const counts = useMemo(() => countByDay(bookings), [bookings]);
  const first = new Date(month.y, month.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(month.y, month.m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const key = (d: number) =>
    `${month.y}-${String(month.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const shift = (n: number) => {
    const d = new Date(month.y, month.m + n, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
    setDay(null);
  };
  const today = todayKey();
  const selected = day
    ? bookings.filter((b) => bookingDayKey(b.shadow_date) === day && b.status !== "cancelled")
    : [];
  return (
    <section aria-label="Job Shadows Calendar" className="w-full space-y-2 lg:w-1/2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Calendar</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="grid h-9 w-9 place-items-center rounded-full border bg-card"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-36 text-center text-sm font-semibold">
            {first.toLocaleString("en-ZA", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => shift(1)}
            aria-label="Next month"
            className="grid h-9 w-9 place-items-center rounded-full border bg-card"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 rounded-xl border bg-card p-3 text-center text-xs">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="py-1 font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <div key={`e${i}`} />
          ) : (
            <button
              key={d}
              onClick={() => setDay(key(d))}
              className={`relative min-h-8 rounded-md border p-1 text-left transition hover:bg-muted ${day === key(d) ? "border-primary" : "border-transparent"} ${key(d) === today ? "bg-accent/30" : ""}`}
            >
              <span className="text-sm">{d}</span>
              {(counts.get(key(d)) ?? 0) > 0 && (
                <span className="absolute bottom-1 right-1 rounded-full bg-cta px-2 py-0.5 text-[10px] font-bold text-cta-foreground">
                  {counts.get(key(d))}
                </span>
              )}
            </button>
          ),
        )}
      </div>
      {day && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Booked on {day}</h2>
          {selected.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scholars booked on this day.</p>
          ) : (
            selected.map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </div>
      )}
    </section>
  );
}

function JobShadows({
  bookings,
  placements,
  loadingPlacements,
}: {
  bookings: MentorBooking[];
  placements: Placement[];
  loadingPlacements: boolean;
}) {
  const [filter, setFilter] = useState<"upcoming" | "pending" | "all">("upcoming");
  const rows = filterHostBookings(bookings, filter, todayKey());
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <div aria-label="Booking filters" className="flex flex-wrap gap-1.5">
          {(["upcoming", "pending", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <HostCalendar bookings={bookings} />
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {filter === "upcoming"
              ? "No upcoming student bookings."
              : filter === "pending"
                ? "No student bookings awaiting approval."
                : "No student bookings yet."}
          </p>
        ) : (
          rows.map((b) => <BookingCard key={b.id} booking={b} />)
        )}
      </div>
      <div>
        <h2 className="text-lg font-semibold">My Mentor Sessions</h2>
        {loadingPlacements && <p className="mt-2 text-sm text-muted-foreground">Loading…</p>}
        {!loadingPlacements && placements.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            No placements are linked to this email. Contact the JobShadow admin if this looks wrong.
          </p>
        )}
        <div className="mt-4 space-y-4">
          {placements.map((p) => (
            <PlacementCard key={p.id} placement={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function parseUsDate(s: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  return Number.isNaN(d.getTime()) ? null : d;
}
function toUsDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function DatesPicker({
  value,
  onChange,
  allowWeekends = true,
  allowOffSeason = true,
  countryCode = "ZA",
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  allowWeekends?: boolean;
  allowOffSeason?: boolean;
  countryCode?: string;
  children?: React.ReactNode;
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
        className="availability-calendar rounded-md border bg-background"
      />
      {children ?? (
        <div className="flex flex-wrap gap-1.5">
          {dates.length === 0 && (
            <span className="text-xs text-muted-foreground">No dates set.</span>
          )}
          {dates.map((d, i) => (
            <span
              key={i}
              className="flex items-center gap-1 rounded-full bg-cta/20 px-2.5 py-1 text-xs text-charcoal"
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
      )}
    </div>
  );
}

function ProfessionalFrame({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset
      aria-label={title}
      className={"min-w-0 rounded border border-charcoal/25 p-3 " + className}
    >
      <legend className="px-1 text-sm font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}

function ProfessionalRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      role="group"
      aria-label={title}
      className="grid min-w-0 gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[150px_minmax(0,1fr)]"
    >
      <p className="text-sm font-bold">{title}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function HostProfile({
  initialTab = "overview",
  initialStep,
  wizard = false,
  onProfileCompleted,
  bookings,
  placements,
  loadingPlacements,
  loadingBookings,
}: {
  initialTab?: string;
  initialStep?: MentorOnboardingStep | undefined;
  wizard?: boolean;
  onProfileCompleted?: () => void;
  bookings: MentorBooking[];
  placements: Placement[];
  loadingPlacements: boolean;
  loadingBookings: boolean;
}) {
  const qc = useQueryClient();
  const personalSave = useRef<AccountPersonalDetailsHandle>(null);
  const [onboardingStep, setOnboardingStep] = useState<MentorOnboardingStep>(
    initialStep === "linkedin" ? "profile" : (initialStep ?? "profile"),
  );
  const ownIdentity = useOwnIdentity();
  const [wizardErrors, setWizardErrors] = useState<string[]>([]);
  const draftCv = useServerFn(draftMentorProfileFromCv);
  const initialized = useRef(false);
  const [cvAiBusy, setCvAiBusy] = useState(false);
  const [cvDraftNote, setCvDraftNote] = useState("");
  const [profileTab, setProfileTab] = useState(
    initialTab === "professional"
      ? "qualifications"
      : ["availability", "shadows"].includes(initialTab)
        ? "overview"
        : initialTab,
  );
  const profile = useQuery({
    queryKey: ["host-profile"],
    staleTime: 15_000,
    queryFn: async () => {
      const result = await supabase.rpc("get_my_host_profile");
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const [bio, setBio] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [certifications, setCertifications] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [cvPath, setCvPath] = useState<string | null>(null);
  const [cvBusy, setCvBusy] = useState(false);
  const [viaCompany, setViaCompany] = useState(false);
  const [hasHrAdmin, setHasHrAdmin] = useState(false);
  const [hrFirstName, setHrFirstName] = useState("");
  const [hrLastName, setHrLastName] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [preferredContact, setPreferredContact] = useState("email");
  const [contactHoursNote, setContactHoursNote] = useState("");
  const [avoidWeekends, setAvoidWeekends] = useState(false);
  const [engagementNotes, setEngagementNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState("");
  const lastProfessional = useRef("");
  const lastContact = useRef("");
  const savingSnapshot = useRef(false);
  const [contactSaved, setContactSaved] = useState(false);
  const identity = ownIdentity.profile.data;
  const mentorName =
    [identity?.first_name, identity?.last_name].filter(Boolean).join(" ") ||
    identity?.display_name ||
    "My Profile";
  const avatar = identity?.avatar_path
    ? supabase.storage.from("avatars").getPublicUrl(identity.avatar_path).data.publicUrl
    : null;
  const personalLocation =
    locationText(readUserLocation(ownIdentity.user.data?.user_metadata)) ||
    ownIdentity.user.data?.user_metadata?.["location"];

  const professionalSnapshot = JSON.stringify([
    bio,
    specialties
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    certifications,
    linkedinUrl,
    cvPath,
  ]);
  const contactSnapshot = JSON.stringify([
    viaCompany,
    hasHrAdmin,
    hrFirstName,
    hrLastName,
    hrEmail,
    preferredContact,
    contactHoursNote,
    avoidWeekends,
    engagementNotes,
  ]);
  useEffect(() => {
    if (!profile.data || initialized.current) return;
    initialized.current = true;
    const p = profile.data;
    lastProfessional.current = JSON.stringify([
      p.bio ?? "",
      p.specialties ?? [],
      p.certifications ?? "",
      p.linkedin_url ?? "",
      p.cv_path ?? null,
    ]);
    lastContact.current = JSON.stringify([
      p.via_company ?? false,
      p.has_hr_admin ?? false,
      p.hr_first_name ?? "",
      p.hr_last_name ?? "",
      p.hr_email ?? "",
      p.preferred_contact ?? "email",
      p.contact_hours_note ?? "",
      p.avoid_weekends ?? false,
      p.engagement_notes ?? "",
    ]);
    setBio(p.bio ?? "");
    setSpecialties((p.specialties ?? []).join(", "));
    setCertifications(p.certifications ?? "");
    setLinkedinUrl(p.linkedin_url ?? "");
    setCvPath(p.cv_path ?? null);
    setViaCompany(p.via_company ?? false);
    setHasHrAdmin(p.has_hr_admin ?? false);
    setHrFirstName(p.hr_first_name ?? "");
    setHrLastName(p.hr_last_name ?? "");
    setHrEmail(p.hr_email ?? "");
    setPreferredContact(p.preferred_contact ?? "email");
    setContactHoursNote(p.contact_hours_note ?? "");
    setAvoidWeekends(p.avoid_weekends ?? false);
    setEngagementNotes(p.engagement_notes ?? "");
  }, [profile.data]);

  async function fillFromCv(path: string) {
    if (cvAiBusy) return;
    if (bio.trim() && specialties.trim() && certifications.trim() && linkedinUrl.trim()) {
      setCvDraftNote(
        "CV uploaded. Your professional fields are already filled and have been preserved.",
      );
      return;
    }
    setCvAiBusy(true);
    setErr(null);
    setCvDraftNote("");
    try {
      const draft = await draftCv({ data: { storagePath: path } });
      setBio((current) => (current.trim() ? current : (draft.bio ?? "")));
      setSpecialties((current) =>
        current.trim() ? current : (draft.specialties ?? []).join(", "),
      );
      setCertifications((current) => (current.trim() ? current : (draft.certifications ?? "")));
      setLinkedinUrl((current) => (current.trim() ? current : (draft.linkedin_url ?? "")));
      setCvDraftNote(
        "CV draft added to empty fields. Review the Professional Profile tab; changes save automatically or when you click Next.",
      );
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : "Could not read your CV. Your current fields have been preserved.",
      );
    } finally {
      setCvAiBusy(false);
    }
  }

  async function uploadCv(file: File) {
    if (cvBusy || cvAiBusy) return;
    if (!/\.(pdf|docx?)$/i.test(file.name)) {
      setErr("Choose a PDF or Word CV. PDF files can fill your professional fields automatically.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErr("Choose a CV smaller than 10 MB.");
      return;
    }
    setCvDraftNote("");
    setCvBusy(true);
    setErr(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("Not signed in.");
      const path = `${email}/cv-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("host-docs")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      setCvPath(path);
      if (/\.pdf$/i.test(file.name)) await fillFromCv(path);
      else
        setCvDraftNote(
          "CV uploaded. To fill your professional fields automatically, upload a PDF version.",
        );
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setCvBusy(false);
    }
  }

  async function save(forceProfessional = false, contactOnly = false) {
    if (wizard) {
      const missing = [
        ...(!ownIdentity.profile.data?.first_name?.trim() ? ["First Name"] : []),
        ...(!ownIdentity.profile.data?.last_name?.trim() ? ["Last Name"] : []),
        ...(!bio.trim() ? ["Experience / Bio"] : []),
        ...(!specialties.split(",").some((value) => value.trim()) ? ["Specialties"] : []),
      ];
      setWizardErrors(missing);
      if (missing.length) {
        if (missing.some((name) => name.includes("Name"))) setProfileTab("overview");
        return false;
      }
    }
    if (
      !wizard &&
      viaCompany &&
      hasHrAdmin &&
      (!hrFirstName.trim() || !hrLastName.trim() || !hrEmail.trim())
    ) {
      setErr("Please provide your HR admin's first name, last name and email.");
      return false;
    }
    setBusy(true);
    setErr(null);
    setContactSaved(false);
    const saveProfessional =
      !contactOnly &&
      (forceProfessional ||
        profileTab === "professional" ||
        profileTab === "overview" ||
        profileTab === "qualifications");
    try {
      const { error } = await supabase.rpc("update_my_host_profile", {
        _bio: saveProfessional ? bio || null : (profile.data?.bio ?? null),
        _specialties: saveProfessional
          ? specialties
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : (profile.data?.specialties ?? []),
        _certifications: saveProfessional
          ? certifications || null
          : (profile.data?.certifications ?? null),
        _linkedin_url: saveProfessional
          ? linkedinUrl || null
          : (profile.data?.linkedin_url ?? null),
        _cv_path: saveProfessional ? cvPath : (profile.data?.cv_path ?? null),
        _via_company: viaCompany,
        _has_hr_admin: viaCompany && hasHrAdmin,
        _hr_first_name: viaCompany && hasHrAdmin ? hrFirstName.trim() : null,
        _hr_last_name: viaCompany && hasHrAdmin ? hrLastName.trim() : null,
        _hr_email: viaCompany && hasHrAdmin ? hrEmail.trim() : null,
        _preferred_contact: preferredContact,
        _contact_hours_note: contactHoursNote || null,
        _avoid_weekends: avoidWeekends,
        _engagement_notes: engagementNotes || null,
      } as never);
      if (error) {
        setErr(error.message);
        return false;
      }
      if (saveProfessional) lastProfessional.current = professionalSnapshot;
      lastContact.current = contactSnapshot;
      setContactSaved(!saveProfessional);
      await qc.invalidateQueries({ queryKey: ["host-profile"] });
      if (wizard) onProfileCompleted?.();
      return true;
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : "Your profile could not be saved. Please try again.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveProfileStep() {
    if (busy || cvBusy || cvAiBusy) {
      setErr("Please wait for your changes to finish saving or processing before continuing.");
      return false;
    }
    const missing = [
      ...(!bio.trim() ? ["Experience / Bio"] : []),
      ...(!specialties.split(",").some((item) => item.trim()) ? ["Specialties"] : []),
    ];
    setWizardErrors(missing);
    const personalSaved = personalSave.current ? await personalSave.current.save() : false;
    if (missing.length || !personalSaved) {
      setProfileTab(!personalSaved ? "overview" : "qualifications");
      return false;
    }
    return save(true);
  }

  const autosave = useRef<() => Promise<void>>(async () => {});
  autosave.current = async () => {
    if (
      !initialized.current ||
      onboardingStep !== "profile" ||
      busy ||
      cvBusy ||
      cvAiBusy ||
      savingSnapshot.current
    )
      return;
    const personalDirty = personalSave.current?.isDirty() ?? false;
    const professionalDirty =
      professionalSnapshot !== lastProfessional.current || contactSnapshot !== lastContact.current;
    if (!personalDirty && !professionalDirty) return;
    savingSnapshot.current = true;
    setAutosaveStatus("Saving changes…");
    try {
      if (personalDirty && !(await personalSave.current!.save({ validate: false }))) {
        setAutosaveStatus(
          "Changes could not be saved. Your edits are still here; autosave will retry.",
        );
        return;
      }
      if (professionalDirty && !(await save(true))) {
        setAutosaveStatus(
          "Changes could not be saved. Your edits are still here; autosave will retry.",
        );
        return;
      }
      setAutosaveStatus("Changes saved automatically.");
    } catch {
      setAutosaveStatus(
        "Changes could not be saved. Your edits are still here; autosave will retry.",
      );
    } finally {
      savingSnapshot.current = false;
    }
  };
  useEffect(() => {
    const timer = setInterval(() => {
      void autosave.current();
    }, 40_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="w-full space-y-4 bg-teal">
      {!wizard && <h1 className="screen-heading px-4 pt-4 text-white">My Profile</h1>}
      <MentorOnboardingWizard
        userId={ownIdentity.user.data?.id ?? ""}
        hostProfile={profile.data!}
        initialStep={initialStep ?? "profile"}
        activeStep={onboardingStep}
        onStepChange={setOnboardingStep}
        embedded
        beforeProfileNext={saveProfileStep}
        initialPhase={
          initialTab === "availability" || initialTab === "shadows" ? "hosting" : "onboarding"
        }
        renderHosting={() => (
          <MentorHostingGuide
            initialStep={initialTab === "shadows" ? "requests" : "availability"}
            complete={[
              placements.some((placement) => placement.active && !!placement.dates),
              false,
              bookings.length > 0,
              bookings.some((booking) => ["confirmed", "completed"].includes(booking.status)),
              bookings.some((booking) => booking.status === "completed"),
              false,
            ]}
            preferences={
              <>
                <div className="grid gap-3 lg:grid-cols-2">
                  {" "}
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    <p className="text-sm font-semibold">Company Contact</p>
                    <p className="text-sm">
                      {viaCompany ? "Company Mentor" : "Independent Mentor"}
                    </p>
                    {viaCompany && (
                      <label className="ml-6 flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={hasHrAdmin}
                          onChange={(e) => setHasHrAdmin(e.target.checked)}
                        />
                        Do you have an HR admin you report results to?
                      </label>
                    )}
                    {viaCompany && hasHrAdmin && (
                      <div className="ml-6 grid gap-3 sm:grid-cols-2">
                        <label className="block text-sm">
                          HR first name
                          <input
                            value={hrFirstName}
                            onChange={(e) => setHrFirstName(e.target.value)}
                            className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
                          />
                        </label>
                        <label className="block text-sm">
                          HR last name
                          <input
                            value={hrLastName}
                            onChange={(e) => setHrLastName(e.target.value)}
                            className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
                          />
                        </label>
                        <label className="block text-sm sm:col-span-2">
                          HR email
                          <input
                            type="email"
                            value={hrEmail}
                            onChange={(e) => setHrEmail(e.target.value)}
                            className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    <p className="text-sm font-semibold">Rules of Engagement</p>
                    <p className="text-xs text-muted-foreground">
                      Help admin know how best to reach you.
                    </p>
                    <label className="block text-sm">
                      Preferred contact method
                      <select
                        value={preferredContact}
                        onChange={(e) => setPreferredContact(e.target.value)}
                        className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
                      >
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="phone">Phone call</option>
                        <option value="sms">SMS</option>
                      </select>
                    </label>
                    <label className="block text-sm">
                      Best times to contact you (optional)
                      <input
                        value={contactHoursNote}
                        onChange={(e) => setContactHoursNote(e.target.value)}
                        placeholder="e.g. Weekdays 9am-5pm only"
                        className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={avoidWeekends}
                        onChange={(e) => setAvoidWeekends(e.target.checked)}
                      />
                      Please don't contact me on weekends
                    </label>
                    <label className="block text-sm">
                      Anything else admin should know (optional)
                      <textarea
                        rows={2}
                        value={engagementNotes}
                        onChange={(e) => setEngagementNotes(e.target.value)}
                        placeholder="e.g. prefers written briefs before a call, out of office in December"
                        className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
                      />
                    </label>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void save(false, true)}
                  disabled={busy || profile.isPending || !!profile.error}
                  className="rounded bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  {contactSaved ? "Saved" : "Save Contact Preferences"}
                </button>
                {(err || profile.error) && (
                  <p role="alert" className="text-sm text-destructive">
                    {err || "Unable to load your preferences. Please refresh."}
                  </p>
                )}
                <HostSettings />
              </>
            }
            bookings={
              loadingBookings ? (
                <p role="status">Loading bookings…</p>
              ) : (
                <JobShadows
                  bookings={bookings}
                  placements={placements}
                  loadingPlacements={loadingPlacements}
                />
              )
            }
          />
        )}
        renderProfile={() => (
          <>
            <Tabs value={profileTab} onValueChange={setProfileTab} className="space-y-4">
              <TabsList
                className="flex h-auto w-full flex-wrap justify-start"
                aria-label="Mentor profile details"
              >
                {!wizard && <TabsTrigger value="overview">Personal Details</TabsTrigger>}
                {!wizard && (
                  <>
                    <TabsTrigger value="qualifications">Professional Profile</TabsTrigger>
                  </>
                )}
              </TabsList>
              {!wizard && (
                <ProfileSummaryCard
                  layout="mentor"
                  aside={
                    <section role="group" aria-label="Profile Summary">
                      <h3 className="sr-only">Profile Summary</h3>
                      <dl
                        aria-label="Mentoring activity"
                        className="grid grid-cols-2 gap-y-4 py-2 sm:grid-cols-4"
                      >
                        {[
                          ["Mentor Sessions", loadingPlacements ? "—" : placements.length],
                          ["Total Bookings", loadingBookings ? "—" : bookings.length],
                          [
                            "Confirmed Bookings",
                            loadingBookings
                              ? "—"
                              : bookings.filter((booking) => booking.status === "confirmed").length,
                          ],
                          [
                            "Completed Bookings",
                            loadingBookings
                              ? "—"
                              : bookings.filter((booking) => booking.status === "completed").length,
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="px-3 text-center sm:border-l sm:border-border sm:first:border-l-0"
                          >
                            <dd className="text-2xl font-bold tabular-nums">{value}</dd>
                            <dt className="text-xs text-muted-foreground">{label}</dt>
                          </div>
                        ))}
                      </dl>
                    </section>
                  }
                  label="Mentor profile summary"
                  name={mentorName}
                  previewSections={[
                    {
                      title: "Personal Details",
                      fields: [
                        { label: "Email Address", value: ownIdentity.user.data?.email },
                        { label: "Contact Number", value: ownIdentity.user.data?.phone },
                        { label: "Location", value: personalLocation },
                        {
                          label: "Mentoring Type",
                          value: profile.data?.via_company
                            ? "Company Mentor"
                            : "Independent Mentor",
                        },
                      ],
                    },
                    {
                      title: "Qualifications",
                      fields: [
                        { label: "Skills & Expertise", value: profile.data?.specialties },
                        { label: "Experience", value: profile.data?.bio },
                        { label: "Qualifications", value: profile.data?.certifications },
                        { label: "Professional Profile URL", value: profile.data?.linkedin_url },
                      ],
                    },
                    {
                      title: "Preferences",
                      fields: [
                        {
                          label: "Preferred Contact Method",
                          value: profile.data?.preferred_contact,
                        },
                        { label: "Contact Hours", value: profile.data?.contact_hours_note },
                        { label: "Avoid Weekend Contact", value: profile.data?.avoid_weekends },
                        { label: "Rules of Engagement", value: profile.data?.engagement_notes },
                      ],
                    },
                  ]}
                  avatarUrl={avatar}
                  subtitle={
                    <>
                      <p>{profile.data?.via_company ? "Company Mentor" : "Independent Mentor"}</p>
                      <ul aria-label="Mentor skills" className="mt-2 flex flex-wrap gap-1.5">
                        {specialties
                          .split(",")
                          .map((skill) => skill.trim())
                          .filter(Boolean)
                          .map((skill, index) => (
                            <li
                              key={index}
                              className="rounded-full border border-border bg-ivory px-2.5 py-1 text-xs text-foreground"
                            >
                              {skill}
                            </li>
                          ))}
                      </ul>
                    </>
                  }
                  onPhoto={() => {
                    setOnboardingStep("profile");
                    setProfileTab("overview");
                    setTimeout(() => document.getElementById("mentor-profile-photo")?.click(), 0);
                  }}
                >
                  <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <li className="flex items-center gap-2 break-all">
                      <Mail className="h-4 w-4 shrink-0" />
                      {ownIdentity.user.data?.email || "Email not recorded"}
                    </li>
                    <li className="flex items-center gap-2 sm:border-l sm:border-border sm:pl-5">
                      <Phone className="h-4 w-4 shrink-0" />
                      {ownIdentity.user.data?.phone || "Phone not recorded"}
                    </li>
                    <li className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {typeof personalLocation === "string" && personalLocation.trim()
                        ? personalLocation
                        : "Location not recorded"}
                    </li>
                  </ul>
                </ProfileSummaryCard>
              )}
              {!wizard && (
                <>
                  <TabsContent
                    forceMount
                    value="overview"
                    className="mt-4 space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5 data-[state=inactive]:hidden"
                  >
                    <ProfessionalFrame title="Personal Details">
                      <AccountPersonalDetails
                        hidePhoto
                        rowLayout
                        hideSaveButton
                        validateNames
                        saveRef={personalSave}
                        photoInputId="mentor-profile-photo"
                        onSaved={
                          wizard
                            ? () => {
                                setWizardErrors([]);
                                setProfileTab("overview");
                              }
                            : undefined
                        }
                      />
                    </ProfessionalFrame>
                  </TabsContent>
                  <TabsContent
                    forceMount
                    value="qualifications"
                    className="mt-4 space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5 data-[state=inactive]:hidden"
                  >
                    <div className="grid items-start gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
                      <ProfessionalFrame title="CV">
                        <div
                          aria-label="CV upload area"
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            if (cvBusy || cvAiBusy) return;
                            const file = event.dataTransfer.files[0];
                            if (file) void uploadCv(file);
                          }}
                          className="rounded border border-dashed border-teal bg-teal/10 px-3 py-2"
                        >
                          <p className="text-xs font-medium">
                            Drop your PDF CV here, or choose Upload CV. Private — never shown to
                            scholars.
                          </p>
                          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                            <Upload className="h-3.5 w-3.5" />{" "}
                            {cvAiBusy
                              ? "Reading CV…"
                              : cvBusy
                                ? "Uploading…"
                                : cvPath
                                  ? "Replace CV"
                                  : "Upload CV"}
                            <input
                              aria-label="Upload CV"
                              type="file"
                              accept=".pdf,.doc,.docx"
                              hidden
                              disabled={cvBusy || cvAiBusy}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.accept = ".pdf,.doc,.docx";
                                if (f) void uploadCv(f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {cvPath && (
                            <span className="ml-2 break-all text-xs text-muted-foreground">
                              {cvPath.split("/").pop()}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Uploading a PDF sends it to OpenAI to fill empty professional fields
                          automatically. Review the draft before saving.
                        </p>
                        {cvDraftNote && (
                          <p role="status" className="mt-2 text-sm">
                            {cvDraftNote}
                          </p>
                        )}
                      </ProfessionalFrame>
                      <div className="min-w-0 rounded border border-charcoal/25 p-3 space-y-4">
                        <ProfessionalRow title="Experience">
                          <label className="block text-sm">
                            <span className="sr-only">Experience</span>
                            <textarea
                              value={bio}
                              onChange={(event) => setBio(event.target.value)}
                              aria-invalid={wizardErrors.includes("Experience / Bio")}
                              style={
                                wizardErrors.includes("Experience / Bio")
                                  ? {
                                      borderColor: "var(--destructive)",
                                      boxShadow: "0 0 0 1px var(--destructive)",
                                    }
                                  : undefined
                              }
                              rows={3}
                              placeholder="Describe your experience"
                              className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
                            />
                          </label>
                        </ProfessionalRow>
                        <ProfessionalRow title="Qualifications & Professional Links">
                          <label className="block text-sm">
                            Qualifications
                            <textarea
                              value={certifications}
                              onChange={(event) => setCertifications(event.target.value)}
                              rows={2}
                              className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
                            />
                          </label>
                          <label className="mt-3 block text-sm">
                            Professional Profile URL
                            <input
                              type="url"
                              value={linkedinUrl}
                              onChange={(event) => setLinkedinUrl(event.target.value)}
                              placeholder="https://linkedin.com/in/..."
                              className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
                            />
                          </label>
                        </ProfessionalRow>
                        <ProfessionalRow title="Skills & Expertise">
                          <div className="mb-2 flex flex-wrap gap-2">
                            {specialties
                              .split(",")
                              .map((skill) => skill.trim())
                              .filter(Boolean)
                              .map((skill, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm"
                                >
                                  {skill}
                                  <button
                                    type="button"
                                    aria-label={"Remove skill " + skill}
                                    onClick={() =>
                                      setSpecialties(
                                        specialties
                                          .split(",")
                                          .map((item) => item.trim())
                                          .filter(Boolean)
                                          .filter((_, current) => current !== index)
                                          .join(", "),
                                      )
                                    }
                                    className="rounded-full p-0.5 hover:bg-muted"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                          </div>
                          <label className="block text-sm">
                            <span className="sr-only">Skills &amp; Expertise</span>
                            <input
                              value={specialties}
                              onChange={(event) => setSpecialties(event.target.value)}
                              aria-invalid={wizardErrors.includes("Specialties")}
                              style={
                                wizardErrors.includes("Specialties")
                                  ? {
                                      borderColor: "var(--destructive)",
                                      boxShadow: "0 0 0 1px var(--destructive)",
                                    }
                                  : undefined
                              }
                              placeholder="Add skills, separated by commas"
                              className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
                            />
                          </label>
                        </ProfessionalRow>
                      </div>
                    </div>
                  </TabsContent>
                </>
              )}
            </Tabs>
            {profileTab !== "availability" && (err || profile.error) && (
              <p role="alert" className="text-sm text-destructive">
                {err || "Unable to load your profile. Please refresh before saving."}
              </p>
            )}
            {autosaveStatus && (
              <p role="status" className="text-xs text-muted-foreground">
                {autosaveStatus}
              </p>
            )}
            {wizardErrors.length > 0 && (
              <div role="alert" className="text-sm text-destructive">
                <p className="font-bold">Please complete the following required fields:</p>
                <ul className="list-disc pl-5">
                  {wizardErrors.map((name) => (
                    <li key={name}>Enter {name}.</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      />
    </section>
  );
}

function HostSettings() {
  const qc = useQueryClient();
  const settings = useQuery({
    queryKey: ["host-settings"],
    queryFn: async () => {
      const result = await supabase.rpc("get_my_host_settings");
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const [paused, setPaused] = useState(false);
  const [maxWeek, setMaxWeek] = useState("");
  const [maxMonth, setMaxMonth] = useState("");
  const [bufferDays, setBufferDays] = useState("");
  const [maxHours, setMaxHours] = useState("");
  const [autoAccept, setAutoAccept] = useState(true);
  const placements = useQuery({
    queryKey: ["mentor-placements"],
    queryFn: async () => {
      const result = await supabase.rpc("list_mentor_placements");
      if (result.error) throw result.error;
      return result.data as unknown as Placement[];
    },
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    const s = settings.data;
    setPaused(s.paused);
    setMaxWeek(s.max_shadows_per_week != null ? String(s.max_shadows_per_week) : "");
    setMaxMonth(s.max_shadows_per_month != null ? String(s.max_shadows_per_month) : "");
    setBufferDays(s.buffer_days != null ? String(s.buffer_days) : "");
    setMaxHours(s.max_consecutive_hours != null ? String(s.max_consecutive_hours) : "");
    setAutoAccept(s.auto_accept ?? true);
  }, [settings.data]);

  async function save() {
    setBusy(true);
    setErr(null);
    setSaved(false);
    const { error } = await supabase.rpc("update_my_host_settings", {
      _paused: paused,
      _max_shadows_per_week: maxWeek ? Number(maxWeek) : null,
      _max_shadows_per_month: maxMonth ? Number(maxMonth) : null,
      _buffer_days: bufferDays ? Number(bufferDays) : null,
      _blackout_dates: [],
      _max_consecutive_hours: maxHours ? Number(maxHours) : null,
      _auto_accept: autoAccept,
    } as never);
    setBusy(false);
    if (error) return setErr(error.message);
    setSaved(true);
    qc.invalidateQueries({ queryKey: ["host-settings"] });
  }

  return (
    <section className="w-full space-y-5">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={paused}
                onChange={(e) => setPaused(e.target.checked)}
              />
              Temporarily pause new booking requests
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              Your placements stay listed, but scholars can't book a new job shadow with you while
              this is on.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={autoAccept}
                onChange={(e) => setAutoAccept(e.target.checked)}
              />
              Automatically accept new booking requests
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              On: scholars can book and pay straight away. Off: you'll need to approve or decline
              each request first, before the scholar can pay.
            </p>
          </div>

          <div className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2">
            <label className="text-sm">
              Maximum shadows per week
              <input
                type="number"
                min={0}
                value={maxWeek}
                onChange={(e) => setMaxWeek(e.target.value)}
                placeholder="No limit"
                className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
              />
            </label>
            <label className="text-sm">
              Maximum shadows per month
              <input
                type="number"
                min={0}
                value={maxMonth}
                onChange={(e) => setMaxMonth(e.target.value)}
                placeholder="No limit"
                className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
              />
            </label>
            <label className="text-sm">
              Buffer between job shadows (days)
              <input
                type="number"
                min={0}
                value={bufferDays}
                onChange={(e) => setBufferDays(e.target.value)}
                placeholder="No buffer"
                className="mt-1 block w-full max-w-xs border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
              />
            </label>
            <label className="text-sm">
              Max consecutive hours per session
              <input
                type="number"
                min={0}
                value={maxHours}
                onChange={(e) => setMaxHours(e.target.value)}
                placeholder="No limit"
                className="mt-1 block w-full max-w-xs border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
              />
            </label>
          </div>

          {(err || settings.error) && (
            <p role="alert" className="text-sm text-destructive">
              {err || "Unable to load your settings. Please refresh before saving."}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Saving settings clears any previously saved personal blackout dates. Your placement
            calendars specify when you are available.
          </p>
          <button
            onClick={save}
            disabled={busy || settings.isPending || !!settings.error}
            className="rounded bg-primary px-5 py-2.5 text-sm font-bold uppercase text-primary-foreground disabled:opacity-50"
          >
            {saved ? "Saved" : "Save Booking Preferences"}
          </button>
        </div>
        <section className="min-w-0 space-y-4" aria-label="Available dates and times">
          <h2 className="text-xl font-semibold">Available Dates and Times</h2>
          <p className="text-sm text-muted-foreground">
            Select only the dates you can host, and set the start and end time for each placement.
          </p>
          {placements.isPending ? (
            <p>Loading placements…</p>
          ) : placements.error ? (
            <p role="alert" className="text-sm text-destructive">
              Unable to load your placements.
            </p>
          ) : !placements.data?.length ? (
            <p className="text-sm text-muted-foreground">
              No placements are linked to your account yet.
            </p>
          ) : (
            placements.data.map((placement) => (
              <PlacementCard key={placement.id} placement={placement} initialEditing />
            ))
          )}
        </section>
      </div>
    </section>
  );
}

function BookingCard({ booking }: { booking: MentorBooking }) {
  const qc = useQueryClient();
  const [preapproved, setPreapproved] = useState(booking.internship_preapproved);
  const [notes, setNotes] = useState(booking.internship_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [respondBusy, setRespondBusy] = useState(false);
  const [respondErr, setRespondErr] = useState<string | null>(null);
  const [reportingNoShow, setReportingNoShow] = useState(false);
  const [noShowReason, setNoShowReason] = useState("");
  const [noShowBusy, setNoShowBusy] = useState(false);
  const [noShowErr, setNoShowErr] = useState<string | null>(null);
  const [noShowSent, setNoShowSent] = useState(false);

  async function reportScholarNoShow() {
    if (!noShowReason.trim()) return setNoShowErr("Please provide a reason.");
    setNoShowBusy(true);
    setNoShowErr(null);
    const { error } = await supabase.rpc("report_scholar_no_show", {
      _booking: booking.id,
      _reason: noShowReason.trim(),
    });
    setNoShowBusy(false);
    if (error) return setNoShowErr(error.message);
    setNoShowSent(true);
    setReportingNoShow(false);
  }

  async function respond(approve: boolean) {
    if (!approve && !declineReason.trim()) {
      setDeclining(true);
      return;
    }
    setRespondBusy(true);
    setRespondErr(null);
    const { error } = await supabase.rpc("respond_to_booking_request", {
      _booking: booking.id,
      _approve: approve,
      ...(approve ? {} : { _decline_reason: declineReason.trim() }),
    });
    setRespondBusy(false);
    if (error) return setRespondErr(error.message);
    setDeclining(false);
    qc.invalidateQueries({ queryKey: ["mentor-bookings"] });
  }

  async function saveInternship() {
    setBusy(true);
    setSaved(false);
    setErr(null);
    const { error } = await supabase.rpc("set_internship_preapproval", {
      _booking: booking.id,
      _preapproved: preapproved,
      _notes: (notes || null) as string,
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setSaved(true);
    qc.invalidateQueries({ queryKey: ["mentor-bookings"] });
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">
            {booking.scholar_name ?? "Scholar"} · {booking.career}
          </p>
          <p className="text-sm text-muted-foreground">
            {booking.scholar_school ?? ""} · {booking.location} · {booking.shadow_date}
          </p>
        </div>
        <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          {STATUS[booking.status] ?? booking.status}
        </span>
      </div>
      <p className="mt-2 text-sm">
        Contact: {booking.scholar_contact ?? "—"} · Indemnity:{" "}
        {booking.indemnity_received ? "Received" : "Outstanding"}
      </p>
      {booking.status === "completed" && (
        <Link
          to="/evaluation/$bookingId"
          params={{ bookingId: booking.id }}
          className="mt-2 inline-block rounded bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground"
        >
          Evaluate this placement
        </Link>
      )}
      {["confirmed", "completed"].includes(booking.status) && !noShowSent && (
        <div className="mt-3 border-t border-foreground/10 pt-3">
          {!reportingNoShow ? (
            <button
              onClick={() => setReportingNoShow(true)}
              className="text-xs font-semibold text-destructive underline"
            >
              Scholar didn't show up?
            </button>
          ) : (
            <div className="space-y-2">
              <input
                value={noShowReason}
                onChange={(e) => setNoShowReason(e.target.value)}
                placeholder="Reason - admin will review this for a possible refund"
                className="w-full rounded border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void reportScholarNoShow()}
                  disabled={noShowBusy}
                  className="rounded bg-destructive px-3 py-1.5 text-xs font-bold uppercase text-destructive-foreground disabled:opacity-50"
                >
                  {noShowBusy ? "Sending…" : "Report to admin"}
                </button>
                <button
                  onClick={() => {
                    setReportingNoShow(false);
                    setNoShowErr(null);
                  }}
                  className="rounded border border-foreground/20 px-3 py-1.5 text-xs font-semibold uppercase"
                >
                  Cancel
                </button>
              </div>
              {noShowErr && (
                <p role="alert" className="text-xs text-destructive">
                  {noShowErr}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {noShowSent && (
        <p className="mt-2 text-xs text-muted-foreground">Reported to admin for review.</p>
      )}
      {booking.status === "pending_approval" && (
        <div className="mt-3 border-t border-foreground/10 pt-3">
          <p className="text-sm">This scholar is waiting on your approval before they can pay.</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={() => void respond(true)}
              disabled={respondBusy}
              className="rounded bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => void respond(false)}
              disabled={respondBusy}
              className="rounded border border-destructive px-3 py-1.5 text-xs font-bold uppercase text-destructive disabled:opacity-50"
            >
              Decline
            </button>
          </div>
          {declining && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Reason for declining (shown to the scholar)"
                className="min-w-64 flex-1 rounded border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
              />
              <button
                onClick={() => void respond(false)}
                disabled={respondBusy || !declineReason.trim()}
                className="rounded bg-destructive px-3 py-1.5 text-xs font-bold uppercase text-destructive-foreground disabled:opacity-50"
              >
                {respondBusy ? "Declining…" : "Confirm decline"}
              </button>
            </div>
          )}
          {respondErr && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {respondErr}
            </p>
          )}
        </div>
      )}
      {booking.status === "cancelled" && booking.decline_reason && (
        <p className="mt-2 text-xs text-muted-foreground">
          You declined this request: {booking.decline_reason}
        </p>
      )}
      <div className="mt-3 border-t border-foreground/10 pt-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={preapproved}
            onChange={(e) => setPreapproved(e.target.checked)}
          />
          Pre-approve this scholar for a future internship at your company
        </label>
        {preapproved && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for admin (e.g. preferred start date, role)"
            className="mt-2 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
          />
        )}
        <button
          onClick={saveInternship}
          disabled={busy}
          className="mt-2 rounded bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground disabled:opacity-50"
        >
          {saved ? "Saved" : "Save"}
        </button>
        {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
      </div>
    </div>
  );
}

function PlacementCard({
  placement,
  initialEditing = false,
}: {
  placement: Placement;
  initialEditing?: boolean;
}) {
  const syncHolidays = useServerFn(syncAutomaticHolidays);
  const country = useQuery({
    queryKey: ["placement-country", placement.id],
    queryFn: async () => {
      const r = await supabase.rpc("get_placement_country", { _id: placement.id });
      if (r.error) throw r.error;
      return typeof r.data === "string" ? r.data : "ZA";
    },
  });
  const [countryCode, setCountryCode] = useState("ZA");
  useEffect(() => {
    if (country.data) setCountryCode(country.data);
  }, [country.data]);
  const qc = useQueryClient();
  const [editing, setEditing] = useState(initialEditing);
  const [vals, setVals] = useState({
    dates: placement.dates ?? "",
    active: placement.active,
    max_applicants: placement.max_applicants != null ? String(placement.max_applicants) : "",
    arrival_time: placement.arrival_time ?? "",
    collection_time: placement.collection_time ?? "",
    description: placement.description ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dayTimes = useQuery({
    queryKey: ["placement-day-times", placement.id],
    queryFn: async () => {
      const r = await supabase.rpc("get_placement_day_times", { _id: placement.id });
      if (r.error) throw r.error;
      return r.data ?? [];
    },
  });
  const [timeEdits, setTimeEdits] = useState<Record<string, Partial<DaySlot>>>({});
  const [attempted, setAttempted] = useState(false);
  const slots = selectedDaySlots(
    vals.dates,
    dayTimes.data ?? [],
    timeEdits,
    vals.arrival_time,
    vals.collection_time,
  );
  async function save() {
    setAttempted(true);
    if (!dayTimes.isSuccess)
      return setErr("Could not load the saved times. Please retry before saving.");
    if (slots.some((slot) => !validDaySlot(slot)))
      return setErr("Choose From and To times for every date. To must be after From.");
    setBusy(true);
    setErr(null);
    if (countryCode !== (country.data ?? "ZA")) {
      try {
        await syncHolidays({ data: { companyId: placement.id, countryCode } });
      } catch (error) {
        setBusy(false);
        setErr(error instanceof Error ? error.message : "Could not update the host country.");
        return;
      }
    }
    const { error } = await supabase.rpc("save_placement_day_times", {
      _id: placement.id,
      _slots: slots,
      _active: vals.active,
      _max_applicants: vals.max_applicants ? Number(vals.max_applicants) : (null as unknown as number),
    });
    if (error) {
      setBusy(false);
      return setErr(error.message);
    }
    if (vals.description !== (placement.description ?? "")) {
      const descriptionSave = await supabase.rpc("update_mentor_placement", {
        _id: placement.id,
        _dates: slots
          .map((slot) => {
            const [y, m, d] = slot.day.split("-");
            return m + "/" + d + "/" + y;
          })
          .join(", "),
        _active: vals.active,
        _max_applicants: vals.max_applicants
          ? Number(vals.max_applicants)
          : (null as unknown as number),
        _arrival_time: slots[0]?.from_time ?? vals.arrival_time,
        _collection_time: slots[0]?.to_time ?? vals.collection_time,
        _description: vals.description,
      });
      if (descriptionSave.error) {
        setBusy(false);
        return setErr(
          "Dates and times were saved, but the description could not be saved. " +
            descriptionSave.error.message,
        );
      }
    }
    setBusy(false);
    setEditing(false);
    setTimeEdits({});
    qc.invalidateQueries({ queryKey: ["placement-day-times", placement.id] });
    qc.invalidateQueries({ queryKey: ["mentor-placements"] });
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">
            {placement.career} — {placement.company}
            {placement.mode ? ` (${placement.mode})` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {placement.sector} · {placement.location}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${placement.active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}
        >
          {placement.active ? "Active" : "Inactive"}
        </span>
      </div>

      {!editing ? (
        <div className="mt-3 space-y-1 text-sm">
          <p>Available Dates</p>
          {dayTimes.isSuccess ? (
            selectedDaySlots(
              placement.dates ?? "",
              dayTimes.data,
              {},
              placement.arrival_time ?? "",
              placement.collection_time ?? "",
            ).map((slot) => (
              <p key={slot.day}>
                {slot.day} · {displayTime(slot.from_time) || "TBC"} –{" "}
                {displayTime(slot.to_time) || "TBC"}
              </p>
            ))
          ) : (
            <p>{dayTimes.error ? "Could not load day times." : "Loading dates…"}</p>
          )}
          <p>Open Spots Per Session: {placement.max_applicants ?? "—"}</p>
          {placement.description && (
            <p className="text-muted-foreground">{placement.description}</p>
          )}
          <button
            onClick={() => setEditing(true)}
            className="mt-2 rounded bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground"
          >
            Edit
          </button>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <CountrySelect value={countryCode} onChange={setCountryCode} />
          <div className="sm:col-span-2">
            <p className="text-sm">Available dates</p>
            {!(placement.allow_weekends && placement.allow_off_season) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {!placement.allow_weekends && "Weekends are excluded for this placement. "}
                {!placement.allow_off_season && "Only February–October dates are allowed. "}
                Ask JobShadow admin to change this.
              </p>
            )}
            <div className="mt-2">
              <DatesPicker
                value={vals.dates}
                onChange={(v) => setVals({ ...vals, dates: v })}
                allowWeekends={placement.allow_weekends}
                allowOffSeason={placement.allow_off_season}
                countryCode={countryCode}
              >
                <div className="min-w-0 flex-1 space-y-2" aria-label="Times Per Available Day">
                  {dayTimes.isPending && <p className="text-sm">Loading saved times…</p>}
                  {dayTimes.error && (
                    <button
                      type="button"
                      className="text-sm text-destructive underline"
                      onClick={() => dayTimes.refetch()}
                    >
                      Could not load times. Retry
                    </button>
                  )}
                  {dayTimes.isSuccess &&
                    slots.map((slot) => (
                      <div
                        key={slot.day}
                        className="grid grid-cols-[minmax(6rem,1fr)_minmax(7rem,1fr)_minmax(7rem,1fr)] items-end gap-2 rounded border p-2"
                      >
                        <span className="pb-2 text-sm">{slot.day}</span>
                        {(["from_time", "to_time"] as const).map((field, i) => (
                          <div key={field} className="min-w-0">
                            <span className="text-xs">{i ? "To" : "From"}</span>
                            <TimePicker
                              label={slot.day + (i ? " To" : " From")}
                              value={slot[field]}
                              invalid={attempted && !validDaySlot(slot)}
                              onChange={(value) =>
                                setTimeEdits((prev) => ({
                                  ...prev,
                                  [slot.day]: { ...prev[slot.day], [field]: value },
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              </DatesPicker>
            </div>
          </div>
          <label className="text-sm">
            Open Spots Per Session
            <input
              type="number"
              value={vals.max_applicants}
              onChange={(e) => setVals({ ...vals, max_applicants: e.target.value })}
              className="mt-1 block w-full border-b border-foreground/30 bg-transparent px-1 py-1 text-sm outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={vals.active}
              onChange={(e) => setVals({ ...vals, active: e.target.checked })}
            />
            Active (visible for booking)
          </label>
          <label className="text-sm sm:col-span-2">
            Description
            <textarea
              value={vals.description}
              onChange={(event) => setVals({ ...vals, description: event.target.value })}
              rows={3}
              className="mt-1 block w-full rounded border border-input bg-transparent px-2 py-1 text-sm outline-none"
            />
          </label>
          {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button
              onClick={save}
              disabled={busy || !dayTimes.isSuccess}
              className="rounded bg-primary px-4 py-2 text-xs font-bold uppercase text-primary-foreground disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setTimeEdits({});
                setAttempted(false);
                setVals({
                  dates: placement.dates ?? "",
                  active: placement.active,
                  max_applicants:
                    placement.max_applicants != null ? String(placement.max_applicants) : "",
                  arrival_time: placement.arrival_time ?? "",
                  collection_time: placement.collection_time ?? "",
                  description: placement.description ?? "",
                });
              }}
              className="rounded bg-muted px-4 py-2 text-xs font-bold uppercase text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
