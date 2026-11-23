import { useHowToProgress } from "@/components/HowToProgress";
import { HOW_TO_DESTINATIONS } from "@/lib/journey-progress";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Users, UserPlus, User, Search, CalendarDays, ClipboardCheck, Handshake, Star, Calendar, FileEdit, CheckCircle2, Bell, ArrowRight } from "lucide-react";
import { SiteLayout, useSiteSession } from "@/components/SiteLayout";
import { YouTube } from "@/components/YouTube";
import { VIDEOS } from "@/lib/content";

type Step = { icon: typeof User; label: string };

const STUDENT_STEPS: Step[] = [
  { icon: UserPlus, label: "Register\nas a scholar" },
  { icon: User, label: "Create\nyour profile" },
  { icon: Search, label: "Explore\ncareers" },
  { icon: CalendarDays, label: "Request\na booking" },
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

function StepRow({ steps, links, complete = [] }: { steps: Step[]; links: string[]; complete?: boolean[] }) {
  return (
    <nav aria-label="How-to steps" className="relative rounded-xl border border-border bg-background py-4">
      <div className="flex flex-wrap items-start justify-center gap-y-2 px-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start">
            <a href={links[i]} aria-label={step.label.replace(/\n/g, " ") + (complete[i] ? " — completed" : "")} className="flex w-[4.5rem] shrink-0 flex-col items-center rounded-md p-1 text-center outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary sm:w-20">
              {complete[i] ? <CheckCircle2 className="h-5 w-5 rounded-full bg-cta text-cta-foreground" aria-hidden="true" /> : <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>}
              <step.icon className="h-8 w-8 shrink-0 text-foreground" />
              <p className="mt-1 whitespace-pre-line text-[11px] font-semibold leading-tight">{step.label}</p>
            </a>
            {i < steps.length - 1 && <ArrowRight className="mx-1 mt-1.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.75} />}
          </div>
        ))}
      </div>
    </nav>
  );
}

export const Route = createFileRoute("/how-to")({
  head: () => ({
    meta: [
      { title: "How To — Book, register and reschedule | Job Shadow" },
      { name: "description", content: "Short videos on how to register, book a Job Shadow online, and cancel or reschedule a booking." },
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
  const destination = (key: keyof typeof HOW_TO_DESTINATIONS) => session?.user ? HOW_TO_DESTINATIONS[key] : "/auth?go=" + key;
  const providerLinks = (type: "mentor" | "host") => ["/contact?type=" + type, destination("providerProfile"), destination("providerAvailability"), "/contact", destination("providerBookings"), destination("providerBookings"), destination("providerExperience"), destination("providerProfile")];
  const roles = session?.roles ?? [];
  const view: "mentor" | "school" | "scholar" = roles.includes("mentor") || roles.includes("hr_admin") ? "mentor" : roles.includes("school") ? "school" : "scholar";
  const content = {
    scholar: { steps: STUDENT_STEPS, complete: progress.data?.student ?? [], links: [session?.user ? destination("studentProfile") : "/register", ...(["studentProfile", "studentCareers", "studentRequest", "studentForms", "studentExperience", "studentFeedback"] as const).map(destination)] },
    mentor: { steps: MENTOR_STEPS, complete: progress.data?.mentor ?? [], links: providerLinks("mentor") },
    school: { steps: SCHOOL_STEPS, complete: [] as boolean[], links: ["/contact?type=school", ...Array(SCHOOL_STEPS.length - 1).fill("/contact")] },
  }[view];
  return (
    <SiteLayout>
      <div className="bg-cta text-cta-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <ChevronDown className="h-6 w-6" />
          <span className="font-display text-2xl uppercase">How To</span>
        </div>
      </div>
      <section className="flex min-h-[70vh] items-center bg-[#7CCCC8] px-5 py-16">
        <div className="mx-auto w-full max-w-7xl space-y-3">
          <p className="text-sm font-semibold">Click on each step to complete it.</p>
          <StepRow steps={content.steps} complete={content.complete} links={content.links} />
          {progress.error && <p role="status" className="text-sm">Saved progress could not be loaded. You can still open each step.</p>}
          <p className="text-xs">Green ticks show saved progress. Contact us for host indemnity and NDA forms; their completion is not tracked in the app yet.</p>
        </div>
      </section>
      <section className="bg-primary">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-14 md:grid-cols-3">
          {VIDEOS.map((v) => (
            <YouTube key={v.id} {...v} />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
