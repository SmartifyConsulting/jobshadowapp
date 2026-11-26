import { useHowToProgress } from "@/components/HowToProgress";
import { HOW_TO_DESTINATIONS } from "@/lib/journey-progress";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  Users,
  UserPlus,
  User,
  Search,
  CalendarDays,
  ClipboardCheck,
  Handshake,
  Star,
  Calendar,
  FileEdit,
  CheckCircle2,
  Bell,
  ArrowRight,
  CreditCard,
  ShieldCheck,
  ContactRound,
  BookOpen,
  Building2,
  Award,
} from "lucide-react";
import { SiteLayout, useSiteSession } from "@/components/SiteLayout";
import { useState } from "react";

type Step = { icon: typeof User; label: string };

const STUDENT_STEPS: Step[] = [
  { icon: UserPlus, label: "Register\nas a scholar" },
  { icon: User, label: "Create\nyour profile" },
  { icon: Search, label: "Explore\ncareers" },
  { icon: CalendarDays, label: "Request\na booking" },
  { icon: CreditCard, label: "Make\npayment" },
  { icon: ClipboardCheck, label: "Complete\nforms (indemnity & consent)" },
  { icon: Handshake, label: "Do your\njob shadow" },
  { icon: Star, label: "Share\nfeedback" },
];

const MENTOR_STEPS: Step[] = [
  { icon: UserPlus, label: "Register\nas a mentor" },
  { icon: User, label: "Create\nyour profile" },
  { icon: Calendar, label: "Set\navailability" },
  { icon: FileEdit, label: "Complete\nforms (indemnity & NDA)" },
  { icon: Users, label: "Receive\nbooking requests" },
  { icon: CheckCircle2, label: "Confirm\na booking" },
  { icon: Handshake, label: "Do the\njob shadow" },
  { icon: Bell, label: "Get feedback &\nbuild your profile" },
];

const MENTOR_ONBOARDING_STEPS: Step[] = [
  { icon: UserPlus, label: "Register\nas a mentor" },
  { icon: User, label: "Create & verify\nyour profile" },
  { icon: ShieldCheck, label: "Verify\nIdentity" },
  { icon: ContactRound, label: "Reference\nchecks" },
  { icon: BookOpen, label: "Safeguarding\ntraining" },
  { icon: Building2, label: "Employer\nsign-off" },
  { icon: Award, label: "Verified &\nactive" },
];

const SCHOOL_STEPS: Step[] = [
  { icon: UserPlus, label: "Register\nas a school" },
  { icon: User, label: "Create\nyour profile" },
  { icon: Search, label: "Confirm\npartnership details" },
  { icon: CalendarDays, label: "Submit bookings\nfor your scholars" },
  { icon: ClipboardCheck, label: "Track booking\nrequests" },
  { icon: Handshake, label: "Support the\njob shadow day" },
  { icon: Bell, label: "Get feedback\n& reports" },
];

const COMPANY_STEPS: Step[] = [
  { icon: Building2, label: "Register\nyour company" },
  { icon: ShieldCheck, label: "Verify your\nbusiness (KYB)" },
  { icon: Users, label: "Enlist\nemployees" },
  { icon: ClipboardCheck, label: "Employees complete\nmentor verification" },
  { icon: Handshake, label: "Active mentors\nwelcome scholars" },
  { icon: BookOpen, label: "Report mentoring\nhours for CSI" },
];

const COMPANY_DESCRIPTIONS = [
  "Register your company and add the details of the person coordinating your job-shadow programme.",
  "Complete Know Your Business (KYB) verification so Job Shadow can verify your company. Contact Job Shadow to arrange this step.",
  "Enlist the employees your company nominates to mentor scholars. Manage your nominated employees in your company’s Mentors list.",
  "Each enlisted employee follows the Mentor process: complete their profile, verify their identity, provide references, complete safeguarding training and obtain employer sign-off. They must be verified and active before mentoring scholars.",
  "Verified, active employees offer mentor sessions, set available dates and times, and welcome scholars for their job-shadow experience.",
  "Job shadowing completed with your enlisted employees contributes mentoring hours to your company’s CSI reporting. Record completed sessions and their actual duration so those hours can be reported accurately.",
];

function StepRow({
  steps,
  links,
  complete = [],
  label = "How-to steps",
  startNumber = 1,
  showCurrent = true,
  fitColumns,
}: {
  steps: Step[];
  links: string[];
  complete?: boolean[];
  label?: string;
  startNumber?: number;
  showCurrent?: boolean;
  fitColumns?: 3 | 4;
}) {
  const next = showCurrent ? steps.findIndex((_, index) => !complete[index]) : -1;
  return (
    <nav aria-label={label} className={fitColumns ? "py-3" : "overflow-x-auto py-5"}>
      <ol
        className={
          fitColumns
            ? "grid grid-cols-2 items-start gap-y-4 " +
              (fitColumns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4")
            : "flex min-w-[590px] items-start"
        }
      >
        {steps.map((step, index) => (
          <li key={index} className="relative min-w-0 flex-1 text-center">
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={
                  "absolute left-1/2 top-3.5 h-1 w-full " +
                  (fitColumns
                    ? (index % 2 === 1 ? "hidden sm:block " : "") +
                      (index % fitColumns === fitColumns - 1 ? "sm:hidden " : "")
                    : "") +
                  (complete[index] && complete[index + 1] ? "bg-green-700" : "bg-border")
                }
              />
            )}
            <a
              href={links[index]}
              aria-current={index === next ? "step" : undefined}
              aria-label={step.label.replace(/\n/g, " ") + (complete[index] ? " — completed" : "")}
              className={
                "relative flex flex-col items-center gap-1 rounded p-1 text-center outline-none focus-visible:ring-2 focus-visible:ring-primary " +
                (complete[index]
                  ? "text-green-700"
                  : index === next
                    ? "text-foreground"
                    : "text-muted-foreground")
              }
            >
              {complete[index] ? (
                <CheckCircle2
                  className="h-6 w-6 rounded-full bg-green-700 text-white"
                  aria-hidden
                />
              ) : (
                <span
                  className={
                    "grid h-6 w-6 place-items-center rounded-full text-xs font-bold " +
                    (index === next
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/15"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {index + startNumber}
                </span>
              )}
              <step.icon className="h-7 w-7" aria-hidden />
              <span className="whitespace-pre-line text-[11px] font-semibold leading-tight">
                {step.label}
              </span>
              {index === next && (
                <span className="mt-1 rounded-full bg-green-700 px-3 py-1 text-xs font-semibold text-white">
                  You Are Here
                </span>
              )}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export const Route = createFileRoute("/how-to")({
  head: () => ({
    meta: [
      { title: "How To — Your Job Shadow journey" },
      {
        name: "description",
        content:
          "Step-by-step guides for scholars, mentors, companies and schools using Job Shadow.",
      },
      { property: "og:title", content: "How To — Job Shadow" },
      { property: "og:description", content: "Follow your step-by-step Job Shadow guide." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HowTo,
});

function HowTo() {
  const { data: session } = useSiteSession();
  const progress = useHowToProgress(session?.user?.id, session?.roles ?? []);
  const destination = (key: keyof typeof HOW_TO_DESTINATIONS) =>
    session?.user ? HOW_TO_DESTINATIONS[key] : "/auth?go=" + key;
  const providerLinks = (type: "mentor" | "host") => [
    "/contact?type=" + type,
    destination("providerProfile"),
    destination("providerAvailability"),
    "/contact",
    destination("providerBookings"),
    destination("providerBookings"),
    destination("providerExperience"),
    destination("providerProfile"),
  ];
  const roles = session?.roles ?? [];
  const scholar =
    roles.includes("learner") || roles.includes("scholar") || progress.data?.student[1] === true;
  const provider = roles.includes("mentor") || roles.includes("hr_admin");
  const [selectedView, setSelectedView] = useState<{
    userId?: string | undefined;
    view: "mentor" | "company" | "school" | "scholar";
  } | null>(null);
  const isAdmin = session?.isAdmin || roles.includes("admin");
  const guides = isAdmin
    ? ([
        ["scholar", "Scholars"],
        ["mentor", "Mentors"],
        ["company", "Companies"],
        ["school", "Schools"],
      ] as const)
    : provider
      ? roles.includes("hr_admin")
        ? ([
            ["company", "Companies"],
            ["mentor", "Mentors"],
          ] as const)
        : roles.includes("mentor")
          ? ([["mentor", "Mentors"]] as const)
          : ([["company", "Companies"]] as const)
      : roles.includes("school")
        ? ([["school", "Schools"]] as const)
        : ([
            ["scholar", "Scholars"],
            ["mentor", "Mentors"],
            ["company", "Companies"],
          ] as const);
  const defaultView =
    isAdmin && scholar
      ? "scholar"
      : provider
        ? roles.includes("hr_admin")
          ? "company"
          : "mentor"
        : roles.includes("school")
          ? "school"
          : "scholar";
  const view =
    selectedView?.userId === session?.user?.id &&
    selectedView &&
    guides.some(([key]) => key === selectedView.view)
      ? selectedView.view
      : defaultView;
  const onboarding = progress.data?.mentorOnboarding
    ? progress.data.mentorOnboarding
        .map((done, index) => (index === 2 ? false : done))
        .filter((_, index) => index !== 3)
    : [!!progress.data?.mentor[0], !!progress.data?.mentor[1], false, false, false, false, false];
  const onboardingLinks = [
    "profile",
    "profile",
    "email",
    "references",
    "training",
    "employer",
    "review",
  ].map((step) =>
    session?.user
      ? "/mentor?entry=onboarding&step=" + step
      : step === "profile"
        ? "/register"
        : "/auth?go=providerProfile",
  );
  const content = {
    scholar: {
      steps: STUDENT_STEPS,
      complete: progress.data?.student ?? [],
      links: [
        session?.user ? destination("studentProfile") : "/register",
        ...(
          [
            "studentProfile",
            "studentCareers",
            "studentRequest",
            "studentPayment",
            "studentForms",
            "studentExperience",
            "studentFeedback",
          ] as const
        ).map(destination),
      ],
    },
    mentor: {
      steps: [...MENTOR_ONBOARDING_STEPS, ...MENTOR_STEPS.slice(2)],
      complete: [...onboarding, ...(progress.data?.mentor ?? []).slice(2)],
      links: [...onboardingLinks, ...providerLinks("mentor").slice(2)],
    },
    company: {
      steps: COMPANY_STEPS,
      complete: [roles.includes("hr_admin"), false, false, false, false, false],
      links: [
        session?.user && roles.includes("hr_admin")
          ? "/company-report?section=profile"
          : "/register",
        "#company-step-2",
        "/company-report?section=mentors",
        "#company-step-4",
        "/company-report?section=mentors",
        "/company-report?section=csi",
      ],
    },
    school: {
      steps: SCHOOL_STEPS,
      complete: [] as boolean[],
      links: ["/contact?type=school", ...Array(SCHOOL_STEPS.length - 1).fill("/contact")],
    },
  }[view];
  const nextStep = content.steps.findIndex((_, index) => !content.complete[index]);
  const descriptions =
    view === "company"
      ? COMPANY_DESCRIPTIONS
      : view === "school"
        ? [
            "Register your school with JobShadow.",
            "Add your school contact details.",
            "Discuss your school’s needs with JobShadow.",
            "Arrange visits for your scholars with JobShadow.",
            "Check the progress of your school’s requests.",
            "Help your scholars prepare for their visits.",
            "Review feedback with JobShadow.",
          ]
        : view === "mentor"
          ? [
              "Register to begin mentoring.",
              "Add your professional experience and CV.",
              "Verify your identity through KYC. The verification provider is not connected yet.",
              "Arrange your reference checks with Job Shadow.",
              "Arrange safeguarding training with Job Shadow.",
              "Coordinate employer sign-off with Job Shadow where needed.",
              "Contact Job Shadow to confirm your vetting outcome.",
              "Choose the days and times you can host.",
              "Complete your hosting forms with Job Shadow.",
              "Review incoming student bookings.",
              "Confirm your booking arrangements.",
              "Welcome your scholar and host the session.",
              "Read feedback and keep your profile up to date.",
            ]
          : view === "scholar"
            ? [
                "Create an account to start your job shadow journey.",
                "Add your details so we can arrange your visit.",
                "Explore careers and find a mentor near you.",
                "Choose a mentor and request a date that suits you.",
                "Make payment once your booking is ready.",
                "Complete the required forms with your parent or guardian.",
                "Check your arrangements and enjoy your job shadow.",
                "Tell us what you learned from your visit.",
              ]
            : [
                "Apply to become a mentor.",
                "Introduce yourself and your experience.",
                "Choose the dates and times you can host.",
                "Complete the forms needed for hosting.",
                "Review the scholars who have requested a visit.",
                "Confirm the booking details.",
                "Welcome your scholar and host the experience.",
                "Read feedback and keep your profile up to date.",
              ];
  return (
    <SiteLayout className="lg:[&>footer>div:first-child]:py-3">
      <div className="bg-cta text-cta-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <ChevronDown className="h-6 w-6" />
          <span className="font-display text-2xl uppercase">How To</span>
        </div>
      </div>
      <section className="flex flex-1 items-center bg-[#7CCCC8] px-5 py-4">
        <div className="mx-auto w-full max-w-7xl rounded-xl border border-border bg-background p-5 shadow-warm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              role="group"
              aria-label="Choose your How To guide"
              className="flex flex-wrap gap-1 rounded-full border border-border p-0.5"
            >
              {guides.map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  aria-pressed={view === key}
                  onClick={() => setSelectedView({ userId: session?.user?.id, view: key })}
                  className={`rounded-full px-3 py-1 text-xs ${view === key ? "bg-primary text-primary-foreground" : "text-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground">
              {view === "school"
                ? "School guide"
                : view === "company"
                  ? "Company guide"
                  : progress.data
                    ? "✓ Progress saved"
                    : session?.user
                      ? "Loading progress…"
                      : "Sign in to save progress"}
            </span>
          </div>
          <p className="sr-only">Click on each step to complete it.</p>
          {view === "mentor" ? (
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <fieldset className="min-w-0 rounded border border-charcoal/25 p-3">
                <legend className="px-1 text-sm font-bold">Onboarding</legend>
                <StepRow
                  fitColumns={4}
                  label="Vetting and onboarding steps"
                  steps={MENTOR_ONBOARDING_STEPS}
                  complete={onboarding}
                  links={onboardingLinks}
                />
              </fieldset>
              <fieldset className="min-w-0 rounded border border-charcoal/25 p-3">
                <legend className="px-1 text-sm font-bold">Step 2: Hosting &amp; Feedback</legend>
                <StepRow
                  fitColumns={3}
                  label="Hosting and feedback steps"
                  steps={MENTOR_STEPS.slice(2)}
                  complete={(progress.data?.mentor ?? []).slice(2)}
                  links={providerLinks("mentor").slice(2)}
                  showCurrent={onboarding.every(Boolean)}
                />
              </fieldset>
            </div>
          ) : (
            <StepRow steps={content.steps} complete={content.complete} links={content.links} />
          )}
          {view === "company" && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {COMPANY_STEPS.map((step, index) => (
                <section
                  key={step.label}
                  id={`company-step-${index + 1}`}
                  className="scroll-mt-5 rounded border border-border p-3"
                >
                  <h3 className="text-sm font-bold">
                    {index + 1}. {step.label.replace(/\n/g, " ")}
                  </h3>
                  <p className="mt-1 text-sm">{COMPANY_DESCRIPTIONS[index]}</p>
                  {index === 3 && (
                    <button
                      type="button"
                      className="mt-2 text-sm font-semibold text-primary underline"
                      onClick={() => setSelectedView({ userId: session?.user?.id, view: "mentor" })}
                    >
                      View the Mentor process
                    </button>
                  )}
                </section>
              ))}
            </div>
          )}
          {nextStep >= 0 ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted/50 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold">
                  NEXT STEP: {content.steps[nextStep]!.label.replace(/\n/g, " ")}
                </h2>
                <p className="mt-1 text-sm">{descriptions[nextStep]}</p>
              </div>
              <a
                href={content.links[nextStep]}
                className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                {view === "scholar" && nextStep === 2 ? "Explore Now" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <p className="mt-2 rounded-lg bg-muted/50 px-5 py-4 text-sm">
              All saved steps are complete. Select a step above to review it.
            </p>
          )}
          {progress.error && (
            <p role="status" className="text-sm">
              Saved progress could not be loaded. You can still open each step.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {view === "school"
              ? "School arrangements are managed with JobShadow; completion is not tracked here yet."
              : view === "company"
                ? "Company registration is shown when your company account is linked. KYB, employee verification and CSI hours are not marked complete automatically."
                : "Green ticks show your own saved progress."}
            {view === "mentor" &&
              " Contact Job Shadow to complete vetting, training and hosting forms."}
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
