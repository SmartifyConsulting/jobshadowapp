import { JourneyStepper, type JourneyStep } from "@/components/JourneyStepper";
import { ROLES } from "@/lib/data";
import { phoneWithCountryCode } from "@/components/PhoneInput";
import { PersonNameFields, joinPersonName } from "@/components/PersonNameFields";
import { PhoneInput } from "@/components/PhoneInput";
import { isPossiblePhoneNumber } from "libphonenumber-js/min";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, UserRound, Search, CalendarDays, FileText, BadgeCheck, Briefcase, Star } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const STATUS: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  indemnity_required: "Paid – indemnity needed",
  confirmed: "Confirmed",
  completed: "Completed",
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
  return useQuery({ queryKey: ["me"], queryFn: async () => (await supabase.auth.getUser()).data.user });
}

export function AccountPanel({ withBookings = false }: { withBookings?: boolean }) {
  const { data: user } = useUser();
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["scholar-profile", user?.id],
    enabled: !!user,
    queryFn: async () => { const result = await supabase.from("scholar_profiles").select("*").eq("user_id", user!.id).maybeSingle(); if (result.error) throw result.error; return result.data; },
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
  if (profile.error) return <p role="alert">Your profile could not be loaded. Please refresh before continuing.</p>;
  if (withBookings) return <StudentJourney userId={user.id} profile={profile.data as Record<string, unknown> | null} />;
  if (!profile.data || editing) return <ProfileForm userId={user.id} initialProfile={(profile.data as Record<string, unknown> | null) ?? undefined} onSaved={() => { setEditing(false); void qc.invalidateQueries({ queryKey: ["scholar-profile"] }); }} />;
  return (
    <div className="space-y-4">
      <ScholarDetails p={profile.data as Record<string, unknown>} />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => setEditing(true)}>Edit Profile</Button>
        {!confirmingDelete ? (
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmingDelete(true)}>Delete Profile</Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Delete your profile? This can&apos;t be undone.</span>
            <Button variant="destructive" disabled={deleting} onClick={deleteProfile}>{deleting ? "Deleting…" : "Yes, delete"}</Button>
            <Button variant="outline" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
          </div>
        )}
      </div>
      {deleteErr && <p role="alert" className="text-sm text-destructive">{deleteErr}</p>}
    </div>
  );
}

function ScholarDetails({ p }: { p: Record<string, unknown> }) {
  const rows: [string, string][] = [["Scholar name","full_name"],["Contact number","contact_no"],["ID / passport","id_number"],["School","school"],["School type","school_type"],["Career interests","career_interests"],["Dietary needs","dietary"],["Parent / guardian","guardian_name"],["Guardian contact","guardian_contact"],["Guardian email","guardian_email"]];
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {rows.map(([l, k]) => (
        <div key={k} className="rounded-lg border bg-card p-3 text-card-foreground">
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{l}</dt>
          <dd className="mt-1 text-sm">{(p[k] as string) || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

const profileSchema = z.object({
  first_name: z.string().trim().min(1, "Enter the first name").max(100),
  last_name: z.string().trim().min(1, "Enter the last name").max(100),
  guardian_first_name: z.string().trim().min(1, "Enter the guardian first name").max(100),
  guardian_last_name: z.string().trim().min(1, "Enter the guardian last name").max(100),
  full_name: z.string().trim().min(2, "Enter the scholar's name"),
  contact_no: z.string().trim().refine(isPossiblePhoneNumber, "Enter a valid number with its country code"),
  id_number: z.string().trim().regex(/^[A-Za-z0-9]{6,13}$/, "Enter an ID or passport number"),
  school: z.string().trim().min(2, "Enter the current school"),
  school_type: z.enum(["Public School", "Private School", "Home School"]),
  career_interests: z.string().trim().max(200).optional(),
  dietary: z.string().trim().max(200).optional(),
  guardian_name: z.string().trim().min(2, "Enter parent/guardian name"),
  guardian_contact: z.string().trim().refine(isPossiblePhoneNumber, "Enter a valid guardian number with its country code"),
  guardian_email: z.string().trim().email("Enter a valid email"),
  guardian_id: z.string().trim().optional(),
  tc_accepted: z.literal(true, { errorMap: () => ({ message: "Please accept the Terms & Conditions" }) }),
  popi_accepted: z.literal(true, { errorMap: () => ({ message: "Please provide POPI consent to continue" }) }),
  info_accurate: z.literal(true, { errorMap: () => ({ message: "Please confirm the information supplied is accurate" }) }),
  population_group: z.string().trim().max(50).optional(),
  gender: z.string().trim().max(50).optional(),
  disability: z.string().trim().max(50).optional(),
  citizenship: z.string().trim().max(50).optional(),
});

function ProfileForm({ userId, initialProfile, onSaved }: { userId: string; initialProfile?: Record<string, unknown> | undefined; onSaved?: (() => void) | undefined }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Record<string, string | boolean>>(() => ({ school_type: "Public School", tc_accepted: false, popi_accepted: false, ...Object.fromEntries(Object.entries(initialProfile ?? {}).filter(([, value]) => typeof value === "string" || typeof value === "boolean")), info_accurate: true, contact_no: initialProfile?.["contact_no"] ? phoneWithCountryCode(String(initialProfile["contact_no"]), "ZA") : "", guardian_contact: initialProfile?.["guardian_contact"] ? phoneWithCountryCode(String(initialProfile["guardian_contact"]), "ZA") : "" }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<{ id?: File | undefined; photo?: File | undefined }>({});

  const field = (k: string, label: string, placeholder?: string) => (
    <div className="min-w-0">
      <Label htmlFor={k}>{label}</Label>
      {["contact_no", "guardian_contact"].includes(k) ? <PhoneInput id={k} label={label} value={String(f[k] ?? "")} onChange={(value) => setF({ ...f, [k]: value })} /> : <Input id={k} placeholder={placeholder} value={(f[k] as string) ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />}
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = profileSchema.safeParse(f);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    if (!files.id && !initialProfile?.["id_file_path"]) return setErrors({ form: "Please upload a scan of the scholar's ID." });
    setBusy(true);
    const upload = async (file: File | undefined, kind: string) => {
      if (!file) return null;
      const path = `${userId}/${kind}-${Date.now()}-${file.name}`;
      const res = await supabase.storage.from("scholar-docs").upload(path, file, { upsert: true });
      if (res.error) throw new Error(res.error.message);
      return path;
    };
    let id_file_path: string | null = typeof initialProfile?.["id_file_path"] === "string" ? initialProfile["id_file_path"] : null;
    let photo_path: string | null = typeof initialProfile?.["photo_path"] === "string" ? initialProfile["photo_path"] : null;
    try {
      if (files.id) id_file_path = await upload(files.id, "id");
      if (files.photo) photo_path = await upload(files.photo, "photo");
    } catch (ex) {
      setBusy(false);
      return setErrors({ form: (ex as Error).message });
    }
    const patch = { ...r.data, career_interests: r.data.career_interests ?? null, dietary: r.data.dietary ?? null, guardian_id: r.data.guardian_id ?? null, population_group: r.data.population_group || null, gender: r.data.gender || null, disability: r.data.disability || null, citizenship: r.data.citizenship || null, user_id: userId, id_file_path, photo_path, ...(!initialProfile || initialProfile["tc_accepted"] !== true ? { tc_accepted_at: new Date().toISOString() } : {}), ...(!initialProfile || initialProfile["popi_accepted"] !== true ? { popi_accepted_at: new Date().toISOString() } : {}) };
    const { error } = initialProfile ? await supabase.from("scholar_profiles").update(patch).eq("user_id", userId) : await supabase.from("scholar_profiles").insert(patch);
    setBusy(false);
    if (error) return setErrors({ form: error.message });
    await supabase.from("profiles").upsert({ user_id: userId, first_name: r.data.first_name, last_name: r.data.last_name, display_name: `${r.data.first_name} ${r.data.last_name}`.trim(), updated_at: new Date().toISOString() });
    await qc.invalidateQueries({ queryKey: ["scholar-profile"] });
    await qc.invalidateQueries({ queryKey: ["profile"] });
    await qc.invalidateQueries({ queryKey: ["site-session"] });
    onSaved?.();
  }
  return (
    <form onSubmit={save} className="min-w-0 w-full space-y-5">
      <div>
        <h1 className="font-display text-4xl">Personal Details</h1>
        <h5 className="mt-1 font-semibold">NOTE: no more than one scholar per registration.</h5>
      </div>
      <h5 className="font-semibold">The Job Shadow-ers Details</h5>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><PersonNameFields id="learner-name" label="Name" originalName={String(initialProfile?.["full_name"] ?? "")} required firstName={String(f["first_name"] ?? "")} lastName={String(f["last_name"] ?? "")} onChange={(first, last, full) => setF({ ...f, first_name: first, last_name: last, full_name: full })} />{(errors["first_name"] || errors["last_name"]) && <p className="text-xs text-destructive">{errors["first_name"] || errors["last_name"]}</p>}</div>
        {field("contact_no", "Tel No", "Tel no")}
        {field("id_number", "ID / passport number", "Id no")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h5 className="font-semibold">The Job Shadow-ers Scan of ID</h5>
          <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFiles({ ...files, id: e.target.files?.[0] })} />
        </div>
        <div>
          <h5 className="font-semibold">The Job Shadow-ers Profile Photo</h5>
          <Input type="file" accept="image/*" onChange={(e) => setFiles({ ...files, photo: e.target.files?.[0] })} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {field("school", "Current School", "Current school")}
        <div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-7 text-sm">
            {["Public School", "Private School", "Home School"].map((t) => (
              <label key={t} className="flex items-center gap-1">
                <input type="radio" name="school_type" checked={f["school_type"] === t} onChange={() => setF({ ...f, school_type: t })} /> {t}
              </label>
            ))}
          </div>
        </div>
        {field("career_interests", "Career interests")}
        {field("dietary", "Dietary requirements/allergies")}
      </div>
      <fieldset className="min-w-0 rounded-md border border-current/20 p-4">
        <legend className="px-2 font-semibold">Optional: Diversity Information</legend>
        <p className="text-xs text-muted-foreground">Entirely optional and self-declared. Host companies use this only in aggregate to report their Job Shadow hosting toward their B-BBEE Skills Development / CSI scorecard - it's never shown to anyone individually or used to screen applicants.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">Population group
            <select value={String(f["population_group"] ?? "")} onChange={(e) => setF({ ...f, population_group: e.target.value })} className="mt-1 w-full rounded border border-input bg-background px-2 py-2">
              <option value="">Prefer not to say</option>
              <option>African</option><option>Coloured</option><option>Indian</option><option>White</option><option>Other</option>
            </select>
          </label>
          <label className="block text-sm">Gender
            <select value={String(f["gender"] ?? "")} onChange={(e) => setF({ ...f, gender: e.target.value })} className="mt-1 w-full rounded border border-input bg-background px-2 py-2">
              <option value="">Prefer not to say</option>
              <option>Female</option><option>Male</option><option>Other</option>
            </select>
          </label>
          <label className="block text-sm">Disability status
            <select value={String(f["disability"] ?? "")} onChange={(e) => setF({ ...f, disability: e.target.value })} className="mt-1 w-full rounded border border-input bg-background px-2 py-2">
              <option value="">Prefer not to say</option>
              <option>None</option><option>Disabled</option>
            </select>
          </label>
          <label className="block text-sm">Citizenship
            <select value={String(f["citizenship"] ?? "")} onChange={(e) => setF({ ...f, citizenship: e.target.value })} className="mt-1 w-full rounded border border-input bg-background px-2 py-2">
              <option value="">Prefer not to say</option>
              <option>South African</option><option>Other</option>
            </select>
          </label>
        </div>
      </fieldset>
      <fieldset className="min-w-0 rounded-md border border-current/20 p-4">
        <legend className="px-2 font-semibold">Parent / Guardian</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><PersonNameFields id="guardian-name" originalName={String(initialProfile?.["guardian_name"] ?? "")} required firstName={String(f["guardian_first_name"] ?? "")} lastName={String(f["guardian_last_name"] ?? "")} onChange={(first, last, full) => setF({ ...f, guardian_first_name: first, guardian_last_name: last, guardian_name: full })} />{(errors["guardian_first_name"] || errors["guardian_last_name"]) && <p className="text-xs text-destructive">{errors["guardian_first_name"] || errors["guardian_last_name"]}</p>}</div>
          {field("guardian_contact", "Contact Number", "Contact number")}
          {field("guardian_email", "Email Address", "name@example.com")}
          {field("guardian_id", "ID / Passport Number", "ID or passport number")}
        </div>
      </fieldset>
      <div className="min-w-0 w-full space-y-1 rounded-md bg-cta px-4 py-3 text-cta-foreground">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!f["tc_accepted"]} onChange={(e) => setF({ ...f, tc_accepted: e.target.checked })} />
          I agree with the <Link to="/legal" target="_blank" className="font-bold underline">Terms &amp; Conditions</Link>
        </label>
        {typeof initialProfile?.["tc_accepted_at"] === "string" && <p className="pl-6 text-xs opacity-80">Agreed {formatAcceptedAt(initialProfile["tc_accepted_at"])}</p>}
      </div>
      {errors["tc_accepted"] && <p className="text-xs text-destructive">{errors["tc_accepted"]}</p>}
      <div className="min-w-0 w-full space-y-1 rounded-md bg-cta px-4 py-3 text-cta-foreground">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!f["popi_accepted"]} onChange={(e) => setF({ ...f, popi_accepted: e.target.checked })} />
          As parent/guardian, I give <Link to="/legal" target="_blank" className="font-bold underline">POPI consent</Link> to process this information
        </label>
        {typeof initialProfile?.["popi_accepted_at"] === "string" && <p className="pl-6 text-xs opacity-80">Agreed {formatAcceptedAt(initialProfile["popi_accepted_at"])}</p>}
      </div>
      {errors["popi_accepted"] && <p className="text-xs text-destructive">{errors["popi_accepted"]}</p>}
      {errors["form"] && <p className="text-sm text-destructive">{errors["form"]}</p>}
      <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground">{initialProfile ? "Save Profile" : "Complete Profile & Continue"}</Button>
    </form>
  );
}

export function Bookings({ selectedId }: { selectedId?: string | undefined } = {}) {
  const { data: user } = useUser();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["bookings", user?.id], enabled: !!user,
    queryFn: async () => { const result = await supabase.from("bookings").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }); if (result.error) throw result.error; return result.data ?? []; },
  });
  const [err, setErr] = useState<string | null>(null);
  async function act(fn: "confirm_test_payment", id: string) {
    setErr(null);
    const { error } = await supabase.rpc(fn, { _booking: id });
    if (error) setErr(error.message);
    qc.invalidateQueries({ queryKey: ["bookings"] });
    qc.invalidateQueries({ queryKey: ["emails"] });
  }
  return (
    <div className="space-y-3">
      <h2 className="font-display text-3xl text-teal-foreground">My bookings</h2>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {q.data?.length === 0 && <p className="text-muted-foreground">No bookings yet. Book your first Job Shadow below.</p>}
      {q.data?.filter((b) => !selectedId || b.id === selectedId).map((b) => (
        <div key={b.id} className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{b.career} · {b.company}{b.mode ? ` (${b.mode})` : ""}</p>
              <p className="text-sm text-muted-foreground">{b.sector} · {b.location} · {b.shadow_date}</p>
            </div>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">{STATUS[b.status] ?? b.status}</span>
          </div>
          <p className="mt-2 text-sm">Amount: R{Number(b.amount_due).toFixed(0)}{b.voucher_code ? ` (voucher ${b.voucher_code}, -${b.discount}%)` : ""}</p>
          <div className="mt-3 flex gap-2">
            {b.status === "awaiting_payment" && (
              <Button size="sm" onClick={() => act("confirm_test_payment", b.id)}>Pay R{Number(b.amount_due).toFixed(0)} (test payment)</Button>
            )}
            {b.status === "indemnity_required" && (
              <div className="flex flex-col gap-1">
                <Link to="/indemnity/$bookingId" params={{ bookingId: b.id }} target="_blank" className="rounded bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground">View indemnity form</Link>
                <p className="text-xs text-muted-foreground">Your parent/guardian must sign this from their own account before the booking is confirmed.</p>
              </div>
            )}
            {b.status === "completed" && (
              <Link to="/evaluation/$bookingId" params={{ bookingId: b.id }} className="rounded bg-primary px-3 py-1.5 text-xs font-bold uppercase text-primary-foreground">Evaluate this job shadow</Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StudentJourney({ userId, profile }: { userId: string; profile: Record<string, unknown> | null }) {
  const [active, setActive] = useState("profile");
  const [editingProfile, setEditingProfile] = useState(false);
  const [career, setCareer] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const bookings = useQuery({ queryKey: ["bookings", userId], queryFn: async () => {
    const result = await supabase.from("bookings").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (result.error) throw result.error; return result.data ?? [];
  } });
  const current = selectedId ? bookings.data?.find((booking) => booking.id === selectedId) : bookings.data?.find((booking) => booking.status !== "cancelled");
  const feedback = useQuery({ queryKey: ["student-journey-feedback", current?.id], enabled: current?.status === "completed", queryFn: async () => {
    const result = await supabase.rpc("get_evaluation_context", { _booking: current!.id }); if (result.error) throw result.error; return result.data?.[0];
  } });
  const confirmed = current?.status === "confirmed" || current?.status === "completed";
  const steps: JourneyStep[] = [
    { id: "profile", title: "Complete Profile", icon: UserRound, complete: !!profile },
    { id: "careers", title: "Explore Careers", icon: Search, complete: !!current, locked: !profile },
    { id: "request", title: "Request a Booking", icon: CalendarDays, complete: !!current, locked: !profile },
    { id: "forms", title: "Payment & Forms", icon: FileText, complete: confirmed, locked: !current },
    { id: "confirmation", title: "Check Confirmation", icon: BadgeCheck, complete: confirmed, locked: !current },
    { id: "experience", title: "Do Your Job Shadow", icon: Briefcase, complete: current?.status === "completed", locked: !confirmed },
    { id: "feedback", title: "Share Feedback", icon: Star, complete: feedback.data?.already_submitted === true, locked: current?.status !== "completed" },
  ];
  const selectedCareer = ROLES.find((role) => role.title === career);
  return <section className="min-w-0 space-y-5" aria-label="Student step wizard">
    <JourneyStepper title="Your Job Shadow Journey" steps={steps} active={active} onChange={setActive} />
    <div className="min-w-0 rounded-lg border border-border bg-ivory p-4 text-foreground sm:p-6">
      {active === "profile" && (!profile || editingProfile ? <ProfileForm userId={userId} initialProfile={profile ?? undefined} onSaved={() => { setEditingProfile(false); setActive("careers"); }} /> : <div className="space-y-4"><h2 className="font-display text-2xl">Step 1: Complete Profile</h2><p className="text-sm">Your profile is saved. Review your details before choosing a career and host.</p><ScholarDetails p={profile} /><div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => setEditingProfile(true)}>Edit Profile</Button><Button onClick={() => setActive("careers")}>Continue to Explore Careers</Button></div></div>)}
      {active === "careers" && <div className="space-y-4"><h2 className="font-display text-2xl">Step 2: Explore Careers</h2><p className="text-sm">Choose a career that interests you, then find a host offering that experience.</p><label className="block text-sm">Career<select value={career} onChange={(event) => setCareer(event.target.value)} className="mt-1 block w-full rounded border border-input bg-background p-2"><option value="">Choose a career</option>{[...new Set(ROLES.map((role) => role.title))].sort().map((title) => <option key={title}>{title}</option>)}</select></label>{selectedCareer?.idealFor && <p className="text-sm"><strong>Ideal for:</strong> {selectedCareer.idealFor}</p>}<div className="flex flex-wrap items-center gap-4"><Link to="/roles" className="text-sm text-primary underline">Browse all career descriptions</Link><Button onClick={() => setActive("request")}>Continue to Find a Host</Button></div></div>}
      {active === "request" && <NewBooking initialCareer={career} onBooked={(id) => { setSelectedId(id); setActive("forms"); }} />}
      {["forms", "confirmation", "experience", "feedback"].includes(active) && <div className="space-y-4">
        <label className="block text-sm">Your application<select value={current?.id ?? ""} onChange={(event) => setSelectedId(event.target.value)} className="mt-1 block w-full rounded border border-input bg-background p-2"><option value="" disabled>Choose an application</option>{bookings.data?.map((booking) => <option key={booking.id} value={booking.id}>{booking.career} — {booking.company} — {booking.shadow_date}</option>)}</select></label>
        {!current ? <p className="text-sm">{bookings.isFetching ? "Loading your application…" : "Choose an application to continue."}</p> : <>
          {active === "forms" && <><h2 className="font-display text-2xl">Step 4: Payment & Forms</h2><p className="text-sm">Check payment and complete the required indemnity and consent documents for this booking.</p><Bookings selectedId={current.id} /><Button variant="outline" onClick={() => setActive("confirmation")}>Check Confirmation</Button></>}
          {active === "confirmation" && <><h2 className="font-display text-2xl">Step 5: Check Confirmation</h2><p className="text-sm">{confirmed ? "Your booking is confirmed. Check the date, location and arrangements before your visit." : current.status === "cancelled" ? "This application has been cancelled. You can request another booking." : "Your booking is not confirmed yet. Complete any outstanding payment or forms and check back here."}</p><Bookings selectedId={current.id} />{confirmed && <Button onClick={() => setActive("experience")}>Continue to Your Job Shadow</Button>}</>}
          {active === "experience" && <><h2 className="font-display text-2xl">Step 6: Do Your Job Shadow</h2><p className="text-sm">{current.career} at {current.company} · {current.shadow_date}</p><p className="text-sm">Check your booking instructions, arrival time and what to bring. Feedback becomes available when the experience is recorded as completed.</p><Bookings selectedId={current.id} />{current.status === "completed" && <Button onClick={() => setActive("feedback")}>Continue to Feedback</Button>}</>}
          {active === "feedback" && <><h2 className="font-display text-2xl">Step 7: Share Feedback</h2>{feedback.data?.already_submitted ? <p className="text-sm">Thank you—your feedback has been submitted.</p> : <><p className="text-sm">Tell us about your experience and what you learned.</p><Link to="/evaluation/$bookingId" params={{ bookingId: current.id }} className="inline-block rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Complete Your Evaluation</Link></>}</>}
        </>}
      </div>}
      {bookings.error && <p role="alert" className="mt-3 text-sm text-destructive">Your applications could not be loaded. Please refresh and try again.</p>}
    </div>
  </section>;
}

type Placement = { id: number; company: string; sector: string; career: string; location: string; availability: string; amount: number; days_per_shadow: number | null; arrival_time: string | null; collection_time: string | null; description: string | null; mode: string | null };

function HostProfileCard({ companyId }: { companyId: number }) {
  const profile = useQuery({
    queryKey: ["host-profile-for-placement", companyId],
    queryFn: async () => { const { data, error } = await supabase.rpc("get_host_profile_for_placement", { _company_id: companyId }); if (error) throw error; return data?.[0] ?? null; },
  });
  if (profile.isPending || !profile.data || (!profile.data.bio && !profile.data.certifications && !(profile.data.specialties ?? []).length)) return null;
  return (
    <div className="mt-4 rounded border border-current/20 bg-primary-foreground/10 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">About your host</p>
      {profile.data.bio && <p className="mt-1 text-sm">{profile.data.bio}</p>}
      {!!(profile.data.specialties ?? []).length && (
        <div className="mt-2 flex flex-wrap gap-1.5">{profile.data.specialties.map((s) => <span key={s} className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs">{s}</span>)}</div>
      )}
      {profile.data.certifications && <p className="mt-2 text-xs opacity-90">{profile.data.certifications}</p>}
    </div>
  );
}

export function NewBooking({ initialCareer = "", onBooked }: { initialCareer?: string; onBooked?: ((id: string) => void) | undefined } = {}) {
  const { data: user } = useUser();
  const qc = useQueryClient();
  const placements = useQuery({
    queryKey: ["placements"],
    queryFn: async () => ((await supabase.rpc("list_placements")).data ?? []) as Placement[],
  });
  const myBookings = useQuery({
    queryKey: ["bookings", user?.id], enabled: !!user,
    queryFn: async () => { const result = await supabase.from("bookings").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }); if (result.error) throw result.error; return result.data ?? []; },
  });
  const noAvailabilityMessage = useQuery({
    queryKey: ["no-availability-message"],
    queryFn: async () => (await supabase.rpc("get_no_availability_message")).data,
  });
  const [sector, setSector] = useState("");
  const [career, setCareer] = useState("");
  const [step, setStep] = useState(1);
  const [pid, setPid] = useState<number | null>(null);
  useEffect(() => { const match = placements.data?.find((item) => item.career.trim().toLowerCase() === initialCareer.trim().toLowerCase()); if (initialCareer && match) { setSector(match.sector); setCareer(match.career); setStep(3); } }, [initialCareer, placements.data]);
  const [date, setDate] = useState("");
  const [code, setCode] = useState("");
  const [voucher, setVoucher] = useState<{ code: string; discount: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDupe, setConfirmDupe] = useState(false);
  const [requestingDate, setRequestingDate] = useState(false);
  const [requestedDate, setRequestedDate] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const today = new Date();
  const sectors = useMemo(() => [...new Set((placements.data ?? []).map((p) => p.sector))].sort(), [placements.data]);
  const options = (placements.data ?? []).filter((p) => p.sector === sector);
  const chosen = options.find((p) => p.id === pid);
  const dates = (chosen?.availability ?? "")
    .split(",").map((d) => d.trim()).filter(Boolean)
    .filter((d) => { const [m, dd, y] = d.split("/").map(Number); return new Date(y!, m! - 1, dd!) >= today; });
  const base = Number(chosen?.amount ?? 0);
  const due = voucher ? Math.max(0, base - (base * Number(voucher.discount)) / 100) : base;
  const duplicate = (myBookings.data ?? []).find((b) => chosen && (b.shadow_date === date || (b.company_id === chosen.id && b.career === chosen.career)));

  async function applyVoucher() {
    setMsg(null);
    const { data } = await supabase.rpc("check_voucher", { _code: code });
    const v = data?.[0];
    if (!v) { setVoucher(null); return setMsg("That promo code isn't valid right now."); }
    setVoucher({ code: v.code, discount: Number(v.discount) });
    setMsg(`Promo code applied: ${v.discount}% off.`);
  }
  async function book() {
    const effectiveDate = requestingDate ? requestedDate : date;
    if (!chosen || !effectiveDate) return setMsg("Choose a career and a date.");
    if (duplicate && !confirmDupe) return;
    const { data: created, error } = await supabase.from("bookings").insert({
      company_id: chosen.id, company: chosen.company, sector: chosen.sector, career: chosen.career, location: chosen.location, mode: chosen.mode,
      shadow_date: effectiveDate, base_amount: base, voucher_code: voucher?.code ?? null, discount: voucher?.discount ?? 0, amount_due: due,
      ad_hoc_requested: requestingDate, ad_hoc_note: requestingDate ? (requestNote || null) : null,
    }).select("id").single();
    if (error) return setMsg(error.message);
    setRequestingDate(false); setRequestedDate(""); setRequestNote("");
    setPid(null); setDate(""); setVoucher(null); setCode(""); setConfirmDupe(false);
    setMsg("Booking created – continue to payment and forms.");
    if (created?.id) onBooked?.(created.id);
    qc.invalidateQueries({ queryKey: ["bookings"] });
  }

  const careers = [...new Set(options.map((p) => p.career))].sort();
  const hosts = options.filter((p) => p.career === career);
  const sel = "block w-full max-w-md border-b border-current/50 bg-transparent p-2 text-teal-foreground outline-none [&>option]:text-foreground";
  const titles = ["Sector", "Career", "Host", "Placement Details", "Date & Pay"];
  const hostLabel = (p: Placement, i: number) => {
    const sameLocation = hosts.filter((h) => h.location === p.location);
    const base = sameLocation.length > 1 ? `${p.location} (Option ${sameLocation.indexOf(p) + 1})` : p.location || `Host ${i + 1}`;
    return p.mode ? `${base} — ${p.mode}` : base;
  };
  const STEP_BG = ["bg-teal text-teal-foreground", "bg-cta text-cta-foreground", "bg-teal text-teal-foreground", "bg-cta text-cta-foreground", "bg-teal text-teal-foreground"];
  const canContinue = (step === 1 && !!sector) || (step === 2 && !!career) || (step === 3 && !!chosen) || step === 4;

  if (!placements.isLoading && sectors.length === 0) {
    return (
      <div className="bg-accent px-6 py-8 text-center text-accent-foreground">
        <h2 className="font-display text-2xl">Book a Job Shadow</h2>
        <p className="mt-3">{noAvailabilityMessage.data ?? "Our mentors are not available right now. Please check back closer to the time to see availability."}</p>
      </div>
    );
  }

  return (
    <div className="-mx-6">
      <div className={`${STEP_BG[step - 1]} px-6 py-5`}>
        <div className="flex items-center gap-3">
          <ChevronDown className="h-6 w-6 shrink-0" />
          <h2 className="font-display text-2xl">Step {step}: {titles[step - 1]}</h2>
        </div>
        <div className="mt-5">
          {step === 1 && (
            <select className={sel} value={sector} onChange={(e) => { setSector(e.target.value); setCareer(""); setPid(null); setDate(""); }}>
              <option value="">Select a sector</option>
              {sectors.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          {step === 2 && (
            <>
              <select className={sel} value={career} onChange={(e) => { setCareer(e.target.value); setPid(null); setDate(""); }}>
                <option value="">Select a career</option>
                {careers.map((c) => <option key={c}>{c}</option>)}
              </select>
              {career && <p className="mt-3 text-sm">{options.find((p) => p.career === career)?.description || ""}</p>}
            </>
          )}
          {step === 3 && (
            <select className={sel} value={pid ?? ""} onChange={(e) => { setPid(Number(e.target.value) || null); setDate(""); setConfirmDupe(false); }}>
              <option value="">Select a host</option>
              {hosts.map((p, i) => <option key={p.id} value={p.id}>{hostLabel(p, i)}</option>)}
            </select>
          )}
          {step === 4 && chosen && (
            <>
              <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <div><dt className="font-semibold">Type</dt><dd>{chosen.mode || "TBC"}</dd></div>
                <div><dt className="font-semibold">Location</dt><dd>{chosen.location}</dd></div>
                <div><dt className="font-semibold">Days per shadow</dt><dd>{chosen.days_per_shadow ?? 1}</dd></div>
                <div><dt className="font-semibold">Arrival time</dt><dd>{chosen.arrival_time || "TBC"}</dd></div>
                <div><dt className="font-semibold">Collection time</dt><dd>{chosen.collection_time || "TBC"}</dd></div>
                <div><dt className="font-semibold">Fee</dt><dd>R{base.toFixed(0)}</dd></div>
              </dl>
              <HostProfileCard companyId={chosen.id} />
            </>
          )}
          {step === 5 && chosen && (
            <div className="space-y-3">
              <p className="text-sm">{dates.length ? "Please select from the available dates below" : "There are no available dates for this placement."}</p>
              <div className="flex flex-wrap gap-2">
                {dates.map((d) => (
                  <button key={d} type="button" onClick={() => { setDate(d); setConfirmDupe(false); setRequestingDate(false); }} className={`border px-3 py-1 text-sm ${!requestingDate && date === d ? "bg-primary text-primary-foreground" : "border-current/60"}`}>{d}</button>
                ))}
              </div>
              {!requestingDate ? (
                <button type="button" onClick={() => { setRequestingDate(true); setDate(""); setConfirmDupe(false); }} className="text-sm underline">
                  None of these dates work? Request a different date
                </button>
              ) : (
                <div className="space-y-2 rounded border border-current/40 bg-primary-foreground/10 p-3">
                  <label className="block text-sm">
                    Requested date
                    <input type="date" value={requestedDate ? toIsoDate(requestedDate) : ""} onChange={(e) => setRequestedDate(fromIsoDate(e.target.value))} className="mt-1 block w-full max-w-xs border-b border-current/50 bg-transparent px-1 py-1 outline-none" />
                  </label>
                  <label className="block text-sm">
                    Note for the mentor (optional)
                    <textarea value={requestNote} onChange={(e) => setRequestNote(e.target.value)} className="mt-1 block w-full border-b border-current/50 bg-transparent px-1 py-1 outline-none" />
                  </label>
                  <p className="text-xs text-current/70">This date isn't pre-confirmed by the host — we'll check availability and follow up before it's finalised.</p>
                  <button type="button" onClick={() => { setRequestingDate(false); setRequestedDate(""); setRequestNote(""); }} className="text-xs underline">Use a listed date instead</button>
                </div>
              )}
              <div>
                <label className="text-sm font-semibold">Voucher code</label>
                <div className="mt-1 flex gap-2">
                  <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full max-w-xs border-b border-current/50 bg-transparent px-1 py-1 outline-none" />
                  <button type="button" onClick={applyVoucher} disabled={!code} className="border border-current/60 px-4 py-1.5 text-sm font-semibold uppercase disabled:opacity-50">Apply</button>
                </div>
              </div>
              <p className="text-sm">Total: <strong>R{due.toFixed(0)}</strong>{voucher && ` (was R${base.toFixed(0)})`}</p>
              {duplicate && (
                <div className="rounded border border-current/40 bg-primary-foreground/10 p-3 text-sm">
                  <p>
                    {duplicate.shadow_date === date
                      ? "You already have a booking on this date."
                      : `You already have a booking for ${duplicate.career} at ${duplicate.company}.`}
                  </p>
                  <label className="mt-2 flex items-center gap-2">
                    <input type="checkbox" checked={confirmDupe} onChange={(e) => setConfirmDupe(e.target.checked)} />
                    Book anyway
                  </label>
                </div>
              )}
            </div>
          )}
          {msg && <p aria-live="polite" className="mt-3 text-sm font-semibold">{msg}</p>}
        </div>
      </div>
      <div className="flex gap-2 bg-primary px-6 py-5">
        {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="bg-primary-foreground/20 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground">Back to Step {step - 1}</button>}
        {step < 5 ? (
          <button type="button" onClick={() => setStep(step + 1)} disabled={!canContinue} className="rounded-full bg-cta px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-cta-foreground disabled:opacity-50">Continue to Step {step + 1}</button>
        ) : (
          <button type="button" onClick={async () => { await book(); setStep(1); setSector(""); setCareer(""); }} disabled={!chosen || !(requestingDate ? requestedDate : date) || (!!duplicate && !confirmDupe)} className="rounded-full bg-cta px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-cta-foreground disabled:opacity-50">{requestingDate ? "Submit date request" : "Pay with PayFast"}</button>
        )}
      </div>
    </div>
  );
}

export function Emails() {
  const q = useQuery({
    queryKey: ["emails"],
    queryFn: async () => (await supabase.from("email_outbox").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="space-y-3">
      <h2 className="font-display text-3xl text-teal-foreground">Email notifications</h2>
      <p className="text-sm text-muted-foreground">Emails this booking triggers. They are recorded here and not sent yet.</p>
      {q.data?.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
      {q.data?.map((m) => (
        <details key={m.id} className="rounded-lg border bg-card p-4">
          <summary className="cursor-pointer text-sm"><strong>{m.subject}</strong> → {m.recipient || "(no address on file)"}</summary>
          <p className="mt-2 text-sm">{m.body}</p>
          <p className="mt-1 text-xs text-muted-foreground">{m.template} · {new Date(m.created_at).toLocaleString()}</p>
        </details>
      ))}
    </div>
  );
}
