import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, GraduationCap, Users, UserPlus, User, Search, CalendarDays, ClipboardCheck, Handshake, Star, Calendar, FileEdit, CheckCircle2, Briefcase, Bell } from "lucide-react";
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
  { icon: FileEdit, label: "Complete\nmentor forms (indemnity & NDA)" },
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
      <div className="mt-4 flex gap-6 overflow-x-auto px-6 pb-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center">
            <div className="flex w-28 shrink-0 flex-col items-center text-center">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
              <step.icon className="mt-3 h-8 w-8 shrink-0 text-foreground" />
              <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-tight">{step.label}</p>
            </div>
            {i < steps.length - 1 && <div className="mt-[-2.75rem] h-px w-6 shrink-0 bg-border" />}
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
