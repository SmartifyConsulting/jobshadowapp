import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  UserRound,
  Mail,
  Linkedin,
  ContactRound,
  BookOpen,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { JourneyStepper } from "@/components/JourneyStepper";
import { PhoneInput } from "@/components/PhoneInput";
import { useOwnIdentity } from "@/components/account/AccountProfile";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Database } from "@/integrations/supabase/types";
import {
  emptyReferee,
  isMentorStep,
  mentorSteps,
  onboardingData,
  REVIEW_LABELS,
  validateMentorStep,
  type MentorOnboardingStep,
  type MentorOnboardingData,
  type WizardError,
  type ReviewStatus,
} from "@/lib/mentor-onboarding";
import { useMentorOnboarding, openMentorEvidence } from "./OnboardingData";

const details = {
  profile: { title: "Complete Profile", icon: UserRound },
  email: { title: "Verify Email", icon: Mail },
  linkedin: { title: "LinkedIn", icon: Linkedin },
  references: { title: "References", icon: ContactRound },
  training: { title: "Safeguarding Training", icon: BookOpen },
  employer: { title: "Employer Sign-Off", icon: Building2 },
  review: { title: "Review", icon: ShieldCheck },
};
type HostProfile = Database["public"]["Tables"]["host_profiles"]["Row"];
export function MentorOnboardingWizard({
  userId,
  hostProfile,
  initialStep,
  renderProfile,
}: {
  userId: string;
  hostProfile: HostProfile;
  initialStep?: MentorOnboardingStep | undefined;
  renderProfile: (onDone: () => void) => ReactNode;
}) {
  const saved = useMentorOnboarding(userId),
    identity = useOwnIdentity(),
    client = useQueryClient();
  const [step, setStep] = useState<MentorOnboardingStep>(initialStep ?? "profile"),
    [data, setData] = useState(() => onboardingData(null)),
    [linkedin, setLinkedin] = useState(hostProfile.linkedin_url ?? ""),
    [busy, setBusy] = useState(false),
    [errors, setErrors] = useState<WizardError[]>([]),
    [failure, setFailure] = useState(""),
    [savedNote, setSavedNote] = useState("");
  const linkedinTouched = useRef(false);
  useEffect(() => {
    if (!linkedinTouched.current) setLinkedin(hostProfile.linkedin_url ?? "");
  }, [hostProfile.linkedin_url]);
  const initialized = useRef(false),
    steps = mentorSteps(hostProfile.via_company),
    review = saved.data?.review;
  useEffect(() => {
    if (!saved.isSuccess || initialized.current) return;
    initialized.current = true;
    setData(onboardingData(saved.data?.draft?.data));
    const wanted = initialStep ?? saved.data?.draft?.current_step;
    if (isMentorStep(wanted))
      setStep(wanted === "employer" && !hostProfile.via_company ? "review" : wanted);
  }, [saved.isSuccess, saved.data, initialStep, hostProfile.via_company]);
  function change(next: MentorOnboardingData) {
    setData(next);
    setSavedNote("");
  }
  async function persist(target: MentorOnboardingStep, nextData = data) {
    const result = await supabase.from("mentor_onboarding_drafts").upsert({
      user_id: userId,
      current_step: target,
      data: JSON.parse(JSON.stringify(nextData)) as Json,
    });
    if (result.error) throw result.error;
    await client.invalidateQueries({ queryKey: ["mentor-onboarding", userId] });
    void client.invalidateQueries({ queryKey: ["how-to-progress", userId] });
  }
  async function go(target: MentorOnboardingStep, validate = false) {
    if (busy) return;
    const profileReady =
      !!identity.profile.data?.first_name?.trim() &&
      !!identity.profile.data?.last_name?.trim() &&
      !!hostProfile.bio?.trim() &&
      !!hostProfile.specialties.length;
    const problems: WizardError[] =
      validate && step === "profile" && !profileReady
        ? [
            {
              field: "profile-step",
              message: "Complete and save your Personal and Professional Details first.",
            },
          ]
        : validate
          ? validateMentorStep(step, data, {
              company: hostProfile.via_company,
              emailVerified: !!identity.user.data?.email_confirmed_at,
              linkedin,
            })
          : [];
    if (validate) {
      const requiredBefore = steps.slice(0, steps.indexOf(target)).filter((id) => id !== step);
      const unmet = requiredBefore.find((id) =>
        id === "profile"
          ? !profileReady
          : id === "email"
            ? !identity.user.data?.email_confirmed_at
            : id === "linkedin"
              ? !hostProfile.linkedin_url && !data.linkedin_unavailable
              : id === "references"
                ? !data.references_submitted
                : id === "training"
                  ? !data.training_submitted
                  : id === "employer"
                    ? !data.employer_submitted
                    : false,
      );
      if (unmet)
        problems.push({
          field: "profile-step",
          message: "Complete " + details[unmet].title + " before continuing to this step.",
        });
    }
    setErrors(problems);
    setFailure("");
    if (problems.length) return;
    setBusy(true);
    try {
      if (validate && step === "linkedin") {
        const h = hostProfile;
        const result = await supabase.rpc("update_my_host_profile", {
          _bio: h.bio,
          _specialties: h.specialties,
          _certifications: h.certifications,
          _linkedin_url: data.linkedin_unavailable ? hostProfile.linkedin_url : linkedin.trim(),
          _cv_path: h.cv_path,
          _via_company: h.via_company,
          _has_hr_admin: h.has_hr_admin,
          _hr_first_name: h.hr_first_name,
          _hr_last_name: h.hr_last_name,
          _hr_email: h.hr_email,
          _preferred_contact: h.preferred_contact,
          _contact_hours_note: h.contact_hours_note,
          _avoid_weekends: h.avoid_weekends,
          _engagement_notes: h.engagement_notes,
        } as never);
        if (result.error) throw result.error;
        await client.invalidateQueries({ queryKey: ["host-profile"] });
      }
      const nextData = {
        ...data,
        ...(validate && step === "references" ? { references_submitted: true } : {}),
        ...(validate && step === "training" ? { training_submitted: true } : {}),
        ...(validate && step === "employer" ? { employer_submitted: true } : {}),
      };
      await persist(target, nextData);
      setData(nextData);
      setStep(target);
      setSavedNote("Progress saved.");
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "Your progress could not be saved. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(kind: "training" | "employer", file: File) {
    setFailure("");
    setBusy(true);
    try {
      if (
        file.size > 10 * 1024 * 1024 ||
        !file.name.toLowerCase().endsWith(".pdf") ||
        (await file.slice(0, 5).text()) !== "%PDF-"
      )
        throw new Error("Upload a valid PDF smaller than 10 MB.");
      const email = identity.user.data?.email;
      if (!email) throw new Error("Please sign in again.");
      const path = email + "/onboarding-" + kind + "-" + crypto.randomUUID() + ".pdf";
      const uploaded = await supabase.storage
        .from("host-docs")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (uploaded.error) throw uploaded.error;
      const next = {
        ...data,
        [kind]: { ...data[kind], evidence_path: path },
        [kind + "_submitted"]: false,
      };
      await persist(step, next);
      change(next);
      setSavedNote("Private evidence saved.");
    } catch (error) {
      setFailure(error instanceof Error ? error.message : "The document could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }
  const invalid = (field: string) => errors.some((error) => error.field === field);
  const inputClass = (field: string) =>
    "mt-1 block w-full rounded border bg-transparent px-2 py-1.5 text-sm font-normal outline-none " +
    (invalid(field) ? "border-destructive ring-1 ring-destructive" : "border-input");
  function field(
    label: string,
    id: string,
    value: string,
    onChange: (value: string) => void,
    type = "text",
  ) {
    return (
      <label className="block min-w-0 text-xs font-medium" key={id}>
        {label}
        <input
          id={id}
          type={type}
          disabled={busy}
          value={value}
          maxLength={2000}
          aria-invalid={invalid(id)}
          className={inputClass(id)}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }
  function evidence(kind: "training" | "employer") {
    return (
      <div className="space-y-2 sm:col-span-2">
        {field(
          "Evidence Link (HTTPS)",
          kind + "-link",
          data[kind].link,
          (value) =>
            change({
              ...data,
              [kind]: { ...data[kind], link: value },
              [kind + "_submitted"]: false,
            }),
          "url",
        )}
        <label className="inline-block rounded border px-3 py-2 text-xs font-medium">
          Upload Private PDF
          <input
            type="file"
            accept="application/pdf,.pdf"
            aria-label={"Upload " + kind + " evidence"}
            className="ml-2 max-w-full"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(kind, file);
            }}
          />
        </label>
        {data[kind].evidence_path && (
          <button
            type="button"
            className="ml-2 text-xs underline"
            onClick={() =>
              openMentorEvidence(data[kind].evidence_path, identity.user.data?.email ?? "").catch(
                (error) => setFailure(error.message),
              )
            }
          >
            View Uploaded Evidence
          </button>
        )}
      </div>
    );
  }
  const statuses: Record<string, boolean> = {
    profile:
      !!identity.profile.data?.first_name?.trim() &&
      !!identity.profile.data?.last_name?.trim() &&
      !!hostProfile.bio?.trim() &&
      !!hostProfile.specialties.length,
    email: !!identity.user.data?.email_confirmed_at,
    linkedin: !!hostProfile.linkedin_url || data.linkedin_unavailable,
    references: review?.references_status === "approved",
    training: review?.training_status === "approved",
    employer: review?.employer_status === "approved",
    review: review?.final_status === "approved",
  };
  const position = steps.indexOf(step),
    next = steps[position + 1];
  if (saved.isPending) return <p role="status">Loading your saved onboarding…</p>;
  if (saved.error)
    return (
      <div role="alert">
        Your onboarding could not be loaded.{" "}
        <button className="underline" onClick={() => saved.refetch()}>
          Retry
        </button>
      </div>
    );
  return (
    <section className="space-y-4 bg-ivory p-3">
      <a href="/mentor?section=profile" className="text-xs underline">
        Back to Profile
      </a>
      <JourneyStepper
        title="Mentor Onboarding"
        steps={steps.map((id) => ({
          id,
          title: details[id].title,
          icon: details[id].icon,
          complete: !!statuses[id],
        }))}
        active={step}
        onChange={(id) => {
          if (isMentorStep(id)) void go(id, steps.indexOf(id) > position);
        }}
      />
      <p className="text-sm">Phase 1: Vetting &amp; Onboarding</p>
      {step === "profile" ? (
        renderProfile(() => {
          void go("email");
        })
      ) : (
        <fieldset className="min-w-0 rounded border border-charcoal/25 p-3">
          <legend className="px-1 text-sm font-bold">{details[step].title}</legend>
          {step === "email" && (
            <div
              id="email-verification"
              className={
                invalid("email-verification")
                  ? "rounded border border-destructive p-3"
                  : "space-y-2"
              }
            >
              <p className="text-sm">{identity.user.data?.email}</p>
              <p className="text-sm">
                {identity.user.data?.email_confirmed_at
                  ? "Your email address is verified."
                  : "Email verification is paused during testing. No verification email will be sent."}
              </p>
            </div>
          )}
          {step === "linkedin" && (
            <div className="space-y-3">
              {field(
                "LinkedIn Profile URL",
                "linkedin",
                linkedin,
                (value) => {
                  linkedinTouched.current = true;
                  setLinkedin(value);
                },
                "url",
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data.linkedin_unavailable}
                  onChange={(e) => change({ ...data, linkedin_unavailable: e.target.checked })}
                />
                I Do Not Have a LinkedIn Profile
              </label>
            </div>
          )}
          {step === "references" && (
            <div className="space-y-4">
              <p className="text-sm">
                Provide professional referees for Job Shadow to review. Nobody is contacted
                automatically.
              </p>
              {data.references.map((r, i) => (
                <fieldset key={i} className="grid gap-3 rounded border p-3 sm:grid-cols-2">
                  <legend className="px-1 text-xs font-bold">Referee {i + 1}</legend>
                  {(
                    [
                      ["First Name", "first_name"],
                      ["Last Name", "last_name"],
                      ["Role", "role"],
                      ["Email Address", "email"],
                    ] as const
                  ).map(([label, key]) =>
                    field(
                      label,
                      `ref-${i}-${key}`,
                      r[key],
                      (value) =>
                        change({
                          ...data,
                          references: data.references.map((ref, n) =>
                            n === i ? { ...ref, [key]: value } : ref,
                          ),
                          references_submitted: false,
                        }),
                      key === "email" ? "email" : "text",
                    ),
                  )}
                  <div className="text-xs">
                    <span>Mobile Number</span>
                    <PhoneInput
                      id={`ref-${i}-phone`}
                      label={`Referee ${i + 1} Mobile Number`}
                      value={r.phone}
                      onChange={(phone) =>
                        change({
                          ...data,
                          references: data.references.map((ref, n) =>
                            n === i ? { ...ref, phone } : ref,
                          ),
                          references_submitted: false,
                        })
                      }
                    />
                  </div>
                  {i > 0 && (
                    <button
                      type="button"
                      className="text-xs underline"
                      onClick={() =>
                        change({
                          ...data,
                          references: data.references.filter((_, n) => n !== i),
                          references_submitted: false,
                        })
                      }
                    >
                      Remove Referee
                    </button>
                  )}
                </fieldset>
              ))}
              {data.references.length < 2 && (
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() =>
                    change({
                      ...data,
                      references: [...data.references, emptyReferee()],
                      references_submitted: false,
                    })
                  }
                >
                  Add Another Referee
                </button>
              )}
            </div>
          )}
          {step === "training" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {field("Training Name", "training-name", data.training.name, (name) =>
                change({
                  ...data,
                  training: { ...data.training, name },
                  training_submitted: false,
                }),
              )}
              {field("Training Provider", "training-provider", data.training.provider, (provider) =>
                change({
                  ...data,
                  training: { ...data.training, provider },
                  training_submitted: false,
                }),
              )}
              {field(
                "Completion Date",
                "training-completed",
                data.training.completed_on,
                (completed_on) =>
                  change({
                    ...data,
                    training: { ...data.training, completed_on },
                    training_submitted: false,
                  }),
                "date",
              )}
              {evidence("training")}
            </div>
          )}
          {step === "employer" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["First Name", "first_name"],
                  ["Last Name", "last_name"],
                  ["Role", "role"],
                  ["Email Address", "email"],
                  ["Company Name", "company"],
                ] as const
              ).map(([label, key]) =>
                field(
                  label,
                  "employer-" + key,
                  data.employer[key],
                  (value) =>
                    change({
                      ...data,
                      employer: { ...data.employer, [key]: value },
                      employer_submitted: false,
                    }),
                  key === "email" ? "email" : "text",
                ),
              )}
              {evidence("employer")}
            </div>
          )}
          {step === "review" && (
            <div className="space-y-4">
              <p className="text-sm">
                Job Shadow reviews your submissions. Green ticks show approved vetting steps.
              </p>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {(
                  [
                    ["References", "references_status", data.references_submitted],
                    ["Safeguarding Training", "training_status", data.training_submitted],
                    ...(hostProfile.via_company
                      ? [["Employer Sign-Off", "employer_status", data.employer_submitted] as const]
                      : []),
                    ["Final Review", "final_status", true],
                  ] as const
                ).map(([label, key, submitted]) => (
                  <div key={key}>
                    <dt className="font-medium">{label}</dt>
                    <dd>
                      {submitted
                        ? REVIEW_LABELS[(review?.[key] ?? "pending") as ReviewStatus]
                        : "Not Submitted"}
                    </dd>
                    {review?.notes &&
                      typeof review.notes === "object" &&
                      !Array.isArray(review.notes) &&
                      typeof review.notes[key] === "string" && (
                        <p className="text-xs">{review.notes[key]}</p>
                      )}
                  </div>
                ))}
              </dl>
              <details className="text-sm">
                <summary>Review My Submissions</summary>
                <div className="mt-2 space-y-2">
                  {data.references.map((r, i) => (
                    <p key={i}>
                      {r.first_name} {r.last_name} · {r.role} · {r.email || r.phone}
                    </p>
                  ))}
                  <p>
                    {data.training.name} · {data.training.provider}
                  </p>
                  {hostProfile.via_company && (
                    <p>
                      {data.employer.company} · {data.employer.first_name} {data.employer.last_name}
                    </p>
                  )}
                </div>
              </details>
              <div className="flex flex-wrap gap-3">
                <a
                  className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
                  href="/mentor?section=settings"
                >
                  Phase 2: Preferences &amp; Availability
                </a>
                <a className="rounded border px-4 py-2 text-sm" href="/mentor?section=shadows">
                  Bookings
                </a>
              </div>
            </div>
          )}
        </fieldset>
      )}
      <div className="flex items-center justify-between gap-3">
        {position > 0 ? (
          <button
            disabled={busy}
            type="button"
            className="rounded border px-4 py-2 text-sm"
            onClick={() => go(steps[position - 1]!)}
          >
            Back
          </button>
        ) : (
          <span />
        )}
        {step !== "profile" && (
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              disabled={busy}
              className="rounded border px-4 py-2 text-sm"
              onClick={async () => {
                setBusy(true);
                setFailure("");
                try {
                  await persist(step);
                  setSavedNote("Draft saved.");
                } catch (error) {
                  setFailure(error instanceof Error ? error.message : "Could not save.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Save Draft
            </button>
            {next && (
              <button
                disabled={busy}
                type="button"
                className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
                onClick={() => go(next, true)}
              >
                {busy
                  ? "Saving…"
                  : ["references", "training", "employer"].includes(step)
                    ? "Submit & Next"
                    : "Next"}
              </button>
            )}
          </div>
        )}
      </div>
      {errors.length > 0 && (
        <div role="alert" className="text-sm text-destructive">
          <p className="font-bold">Please complete the following required fields:</p>
          <ul className="list-disc pl-5">
            {errors.map((error) => (
              <li key={error.field}>
                <a href={"#" + error.field} className="underline">
                  {error.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {failure && (
        <p role="alert" className="text-sm text-destructive">
          {failure}
        </p>
      )}
      {savedNote && (
        <p role="status" className="text-xs">
          {savedNote}
        </p>
      )}
    </section>
  );
}
