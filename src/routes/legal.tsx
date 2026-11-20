import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";
import { LEGAL_REVIEW_NOTICE, PRIVACY_POLICY, CONSENT_FORMS, PLATFORM_TERMS, type LegalSection } from "@/lib/legal-content";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Legal, Privacy & Consent | Job Shadow" },
      { name: "description", content: "Job Shadow's data protection policy, digital indemnity agreements and terms of service." },
      { property: "og:title", content: "Legal, Privacy & Consent | Job Shadow" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LegalPage,
});

function SectionBlock({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl uppercase">{title}</h2>
      <div className="mt-4 space-y-6">
        {sections.map((s) => (
          <div key={s.heading}>
            <h3 className="font-semibold">{s.heading}</h3>
            {s.paragraphs.map((p, i) => <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">{p}</p>)}
          </div>
        ))}
      </div>
    </section>
  );
}

function LegalPage() {
  return (
    <SiteLayout>
      <div className="bg-cta text-cta-foreground">
        <div className="mx-auto max-w-3xl px-5 py-4">
          <h1 className="font-display text-2xl uppercase">Legal, Privacy &amp; Consent</h1>
          <p className="mt-1 text-xs">Global Data Protection Policy, Digital Indemnity Agreements &amp; Terms of Service — v2.0, November 2026</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <p className="rounded-md border border-accent/40 bg-accent/10 p-4 text-sm">{LEGAL_REVIEW_NOTICE}</p>

        <SectionBlock title="Part 1: Global Data Protection & Privacy Policy" sections={PRIVACY_POLICY} />
        <SectionBlock title="Part 2: In-App Digital Consent, Indemnity & Safeguarding Agreements" sections={CONSENT_FORMS} />
        <SectionBlock title="Part 3: Platform Terms & Conditions of Service" sections={PLATFORM_TERMS} />

        <p className="mt-10 text-xs text-muted-foreground">Questions about this policy? Contact our Information Officer at <a href="mailto:privacy@jobshadow.co.za" className="underline">privacy@jobshadow.co.za</a>.</p>
      </div>
    </SiteLayout>
  );
}
