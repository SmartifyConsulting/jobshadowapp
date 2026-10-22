import { createFileRoute } from "@tanstack/react-router";
import { Facebook, Instagram } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { CONTACT_EMAIL } from "@/lib/data";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact JobShadow — Sponsor, host or partner" },
      { name: "description", content: "Get in touch to sponsor a learner, host scholars or partner your school." },
      { property: "og:title", content: "Contact JobShadow" },
      { property: "og:description", content: "Sponsor, host or partner with JobShadow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Contact,
});

const BLOCKS = [
  { color: "bg-teal", text: <>If you are a school and want to include job shadow as <strong>part of your life orientation program</strong></> },
  { color: "bg-accent text-accent-foreground", text: <>if you are a company who would like to be <strong>a part of our hosting</strong> program</> },
  { color: "bg-cta", text: <>if you are a company who would like to <strong>sponsor learners</strong> as part of your CSI Initiatives</> },
];

function Contact() {
  return (
    <SiteLayout>
      <section className="grid bg-primary text-primary-foreground md:grid-cols-[1fr_1fr_1fr_1.1fr]">
        {BLOCKS.map((b, i) => (
          <div key={i} className={`${b.color} px-6 py-10 text-sm`}>{b.text}</div>
        ))}
        <div className="flex flex-col justify-center gap-4 px-6 py-10">
          <p className="text-right font-display text-lg">If You Just Want To Say Hi</p>
          <p className="text-right font-display text-2xl uppercase">Please Contact Us</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-right font-semibold text-cta hover:underline">{CONTACT_EMAIL}</a>
          <div className="mt-2 flex justify-end gap-2 border-t border-primary-foreground/20 pt-4">
            <a href="https://www.facebook.com/JobShadowBookings" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground text-primary"><Facebook className="h-4 w-4" /></a>
            <a href="https://www.instagram.com/jobshadowbookings" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground text-primary"><Instagram className="h-4 w-4" /></a>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
