import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, GraduationCap, Users, Building2, UserPlus, User, Search, CalendarDays, ClipboardCheck, Handshake, Star, Calendar, FileEdit, CheckCircle2, Briefcase, Bell, ArrowRight } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { YouTube } from "@/components/YouTube";
import { VIDEOS } from "@/lib/content";

type Step = { icon: typeof User; label: string };

const STUDENT_STEPS: Step[] = [
  { icon: UserPlus, label: "Register\nas a student" },
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

const HOST_STEPS: Step[] = [
  { icon: UserPlus, label: "Register\nas a host" },
  { icon: User, label: "Create\nyour profile" },
  { icon: Calendar, label: "Set\navailability" },
  { icon: FileEdit, label: "Complete\nhost forms (indemnity & NDA)" },
  { icon: Users, label: "Receive\nbooking requests" },
  { icon: CheckCircle2, label: "Confirm\na booking" },
  { icon: Briefcase, label: "Host the\nexperience" },
  { icon: Bell, label: "Get feedback &\nbuild your profile" },
];

function StepRow({ title, icon: TitleIcon, steps }: { title: string; icon: typeof User; steps: Step[] }) {
  return (
    <div className="relative rounded-xl border border-border bg-background pt-10 pb-6">
      <div className="absolute -top-0.5 left-0 flex items-center gap-2 rounded-tl-xl bg-primary py-2 pl-4 pr-8 text-primary-foreground [clip-path:polygon(0_0,100%_0,calc(100%-1.25rem)_100%,0_100%)]">
        <TitleIcon className="h-5 w-5 shrink-0" />
        <span className="font-display text-lg uppercase">{title}</span>
      </div>
      <div className="mt-4 flex flex-wrap items-start justify-center gap-y-5 px-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start">
            <div className="flex w-[4.5rem] shrink-0 flex-col items-center text-center sm:w-20">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
              <step.icon className="mt-2 h-6 w-6 shrink-0 text-foreground" />
              <p className="mt-2 whitespace-pre-line text-[11px] font-semibold leading-tight">{step.label}</p>
            </div>
            {i < steps.length - 1 && <ArrowRight className="mx-1 mt-1.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.75} />}
          </div>
        ))}
      </div>
    </div>
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
  return (
    <SiteLayout>
      <div className="bg-cta text-cta-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <ChevronDown className="h-6 w-6" />
          <span className="font-display text-2xl uppercase">How To</span>
        </div>
      </div>
      <section className="bg-[#7CCCC8] px-5 py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <StepRow title="For Students" icon={GraduationCap} steps={STUDENT_STEPS} />
          <StepRow title="For Mentors" icon={Users} steps={MENTOR_STEPS} />
          <StepRow title="For Hosts" icon={Building2} steps={HOST_STEPS} />
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
