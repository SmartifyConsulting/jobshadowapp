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
} from "lucide-react";
import { SiteLayout, useSiteSession } from "@/components/SiteLayout";
import { YouTube } from "@/components/YouTube";
import { VIDEOS } from "@/lib/content";
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

const SCHOOL_STEPS: Step[] = [
  { icon: UserPlus, label: "Register\nas a school" },
  { icon: User, label: "Create\nyour profile" },
  { icon: Search, label: "Confirm\npartnership details" },
  { icon: CalendarDays, label: "Submit bookings\nfor your scholars" },
  { icon: ClipboardCheck, label: "Track booking\nrequests" },
  { icon: Handshake, label: "Support the\njob shadow day" },
  { icon: Bell, label: "Get feedback\n& reports" },
];

function StepRow({
  steps,
  links,
  complete = [],
}: {
  steps: Step[];
  links: string[];
  complete?: boolean[];
}) {
  const next = steps.findIndex((_, index) => !complete[index]);
  return (
    <nav aria-label="How-to steps" className="overflow-x-auto py-5">
      <ol className="flex min-w-[590px] items-start">
        {steps.map((step, index) => (
          <li key={index} className="relative min-w-0 flex-1 text-center">
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={
                  "absolute left-1/2 top-3.5 h-1 w-full " +
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
                  {index + 1}
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
      { title: "How To — Book, register and reschedule | Job Shadow" },
      {
        name: "description",
        content:
          "Short videos on how to register, book a Job Shadow online, and cancel or reschedule a booking.",
      },
      { property: "og:title", content: "How To — Job Shadow" },
      { property: "og:description", content: "Video guides for booking a Job Shadow." },
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
    view: "mentor" | "host" | "school" | "scholar";
  } | null>(null);
  const isAdmin = session?.isAdmin || roles.includes("admin");
  const guides = isAdmin
    ? ([
        ["scholar", "Scholars"],
        ["mentor", "Mentors"],
        ["host", "Hosts"],
        ["school", "Schools"],
      ] as const)
    : ([
        ["scholar", "Scholars"],
        ["mentor", "Mentors / Hosts"],
      ] as const);
  const defaultView = scholar
    ? "scholar"
    : provider
      ? "mentor"
      : roles.includes("school")
        ? "school"
        : "scholar";
  const view =
    selectedView?.userId === session?.user?.id && selectedView ? selectedView.view : defaultView;
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
      steps: MENTOR_STEPS,
      complete: progress.data?.mentor ?? [],
      links: providerLinks("mentor"),
    },
    host: {
      steps: MENTOR_STEPS.map((step, index) =>
        index === 0 ? { ...step, label: "Register\nas a host" } : step,
      ),
      complete: progress.data?.host ?? [],
      links: providerLinks("host"),
    },
    school: {
      steps: SCHOOL_STEPS,
      complete: [] as boolean[],
      links: ["/contact?type=school", ...Array(SCHOOL_STEPS.length - 1).fill("/contact")],
    },
  }[view];
  const nextStep = content.steps.findIndex((_, index) => !content.complete[index]);
  const descriptions =
    view === "school"
      ? [
          "Register your school with JobShadow.",
          "Add your school contact details.",
          "Discuss your school’s needs with JobShadow.",
          "Arrange visits for your scholars with JobShadow.",
          "Check the progress of your school’s requests.",
          "Help your scholars prepare for their visits.",
          "Review feedback with JobShadow.",
        ]
      : view === "scholar"
        ? [
            "Create an account to start your job shadow journey.",
            "Add your details so we can arrange your visit.",
            "Explore careers and find a host near you.",
            "Choose a host and request a date that suits you.",
            "Make payment once your booking is ready.",
            "Complete the required forms with your parent or guardian.",
            "Check your arrangements and enjoy your job shadow.",
            "Tell us what you learned from your visit.",
          ]
        : [
            "Apply to become a mentor or host.",
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
                : progress.data
                  ? "✓ Progress saved"
                  : session?.user
                    ? "Loading progress…"
                    : "Sign in to save progress"}
            </span>
          </div>
          <p className="sr-only">Click on each step to complete it.</p>
          <StepRow steps={content.steps} complete={content.complete} links={content.links} />
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
              : "Green ticks show your own saved progress."}
            {(view === "mentor" || view === "host") &&
              " Contact us for host indemnity and NDA forms; their completion is not tracked in the app yet."}
          </p>
        </div>
      </section>
      <section className="bg-primary">
        <div className="mx-auto grid max-w-5xl gap-3 px-5 py-6 md:grid-cols-3 md:py-[calc(min(4.6875vw,3rem)+15px)]">
          {VIDEOS.map((v) => (
            <YouTube key={v.id} {...v} />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
