export const MENTOR_ONBOARDING_STEPS = [
  "profile",
  "email",
  "linkedin",
  "references",
  "training",
  "employer",
  "review",
] as const;
export type MentorOnboardingStep = (typeof MENTOR_ONBOARDING_STEPS)[number];
export type ReviewStatus = "pending" | "approved" | "changes_requested";
export type Referee = {
  first_name: string;
  last_name: string;
  role: string;
  email: string;
  phone: string;
};
export type Evidence = {
  name: string;
  provider: string;
  completed_on: string;
  link: string;
  evidence_path: string;
};
export type Employer = {
  first_name: string;
  last_name: string;
  role: string;
  email: string;
  company: string;
  link: string;
  evidence_path: string;
};
export type MentorOnboardingData = {
  linkedin_unavailable: boolean;
  references: Referee[];
  training: Evidence;
  employer: Employer;
  references_submitted: boolean;
  training_submitted: boolean;
  employer_submitted: boolean;
};
export const emptyReferee = (): Referee => ({
  first_name: "",
  last_name: "",
  role: "",
  email: "",
  phone: "",
});
const text = (v: unknown) => (typeof v === "string" ? v : "");
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
export function onboardingData(raw: unknown): MentorOnboardingData {
  const source = object(raw),
    training = object(source["training"]),
    employer = object(source["employer"]);
  const references = Array.isArray(source["references"])
    ? source["references"].slice(0, 2).map((v) => {
        const r = object(v);
        return {
          first_name: text(r["first_name"]),
          last_name: text(r["last_name"]),
          role: text(r["role"]),
          email: text(r["email"]),
          phone: text(r["phone"]),
        };
      })
    : [];
  return {
    linkedin_unavailable: source["linkedin_unavailable"] === true,
    references: references.length ? references : [emptyReferee()],
    training: {
      name: text(training["name"]),
      provider: text(training["provider"]),
      completed_on: text(training["completed_on"]),
      link: text(training["link"]),
      evidence_path: text(training["evidence_path"]),
    },
    employer: {
      first_name: text(employer["first_name"]),
      last_name: text(employer["last_name"]),
      role: text(employer["role"]),
      email: text(employer["email"]),
      company: text(employer["company"]),
      link: text(employer["link"]),
      evidence_path: text(employer["evidence_path"]),
    },
    references_submitted: source["references_submitted"] === true,
    training_submitted: source["training_submitted"] === true,
    employer_submitted: source["employer_submitted"] === true,
  };
}
export function mentorSteps(company: boolean) {
  return MENTOR_ONBOARDING_STEPS.filter((step) => company || step !== "employer");
}
export function isMentorStep(value: unknown): value is MentorOnboardingStep {
  return (
    typeof value === "string" && MENTOR_ONBOARDING_STEPS.includes(value as MentorOnboardingStep)
  );
}
export function safeWebLink(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
export function validLinkedin(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && /^(www\.)?linkedin\.com$/.test(u.hostname);
  } catch {
    return false;
  }
}
export type WizardError = { field: string; message: string };
export function validateMentorStep(
  step: MentorOnboardingStep,
  data: MentorOnboardingData,
  context: { emailVerified: boolean; linkedin: string; company: boolean },
): WizardError[] {
  const errors: WizardError[] = [];
  const required = (value: string, field: string, label: string) => {
    if (!value.trim()) errors.push({ field, message: "Enter " + label + "." });
  };
  if (step === "email" && !context.emailVerified)
    errors.push({
      field: "email-verification",
      message: "Email verification is required. Verification emails are paused during testing.",
    });
  if (step === "linkedin" && !data.linkedin_unavailable && !validLinkedin(context.linkedin))
    errors.push({
      field: "linkedin",
      message: "Enter a valid HTTPS LinkedIn profile URL, or choose that you do not have LinkedIn.",
    });
  if (step === "references")
    data.references.forEach((r, i) => {
      required(r.first_name, `ref-${i}-first_name`, "the referee’s First Name");
      required(r.last_name, `ref-${i}-last_name`, "the referee’s Last Name");
      required(r.role, `ref-${i}-role`, "the referee’s Role");
      if (!r.email.trim() && !r.phone.trim())
        errors.push({
          field: `ref-${i}-email`,
          message: "Enter the referee’s Email Address or Mobile Number.",
        });
      if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))
        errors.push({ field: `ref-${i}-email`, message: "Enter a valid referee Email Address." });
    });
  if (step === "training") {
    required(data.training.name, "training-name", "the Training Name");
    required(data.training.provider, "training-provider", "the Training Provider");
    if (!data.training.evidence_path && !safeWebLink(data.training.link))
      errors.push({
        field: "training-link",
        message: "Upload training evidence or enter an HTTPS evidence link.",
      });
  }
  if (step === "employer" && context.company) {
    const e = data.employer;
    required(e.first_name, "employer-first_name", "the employer contact’s First Name");
    required(e.last_name, "employer-last_name", "the employer contact’s Last Name");
    required(e.company, "employer-company", "the Company Name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.email))
      errors.push({ field: "employer-email", message: "Enter a valid employer Email Address." });
    if (!e.evidence_path && !safeWebLink(e.link))
      errors.push({
        field: "employer-link",
        message: "Upload employer sign-off or enter an HTTPS evidence link.",
      });
  }
  return errors;
}
export const REVIEW_LABELS: Record<ReviewStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  changes_requested: "Changes Requested",
};
