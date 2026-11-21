import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";

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

/** "## Heading" lines become section headings; blank lines separate paragraphs. Lets admin edit
 * the raw text (Admin > Legal Content) without touching structured data. */
function renderBody(body: string) {
  const blocks = body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block, i) => {
    if (block.startsWith("## ")) return <h3 key={i} className="mt-6 font-semibold">{block.slice(3)}</h3>;
    return <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">{block}</p>;
  });
}

const DOCUMENT_KEYS = ["privacy_policy", "consent_forms", "platform_terms"] as const;

function LegalPage() {
  const notice = useQuery({
    queryKey: ["legal-document", "legal_review_notice"],
    queryFn: async () => (await supabase.from("legal_documents").select("body").eq("key", "legal_review_notice").maybeSingle()).data?.body ?? "",
  });
  const docs = useQuery({
    queryKey: ["legal-documents", DOCUMENT_KEYS],
    queryFn: async () => {
      const { data } = await supabase.from("legal_documents").select("key, title, body").in("key", DOCUMENT_KEYS);
      return DOCUMENT_KEYS.map((k) => (data ?? []).find((d) => d.key === k)).filter((d): d is { key: string; title: string; body: string } => !!d);
    },
  });

  return (
    <SiteLayout>
      <div className="bg-cta text-cta-foreground">
        <div className="mx-auto max-w-3xl px-5 py-4">
          <h1 className="font-display text-2xl uppercase">Legal, Privacy &amp; Consent</h1>
          <p className="mt-1 text-xs">Global Data Protection Policy, Digital Indemnity Agreements &amp; Terms of Service — v3.0, November 2026</p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-5 py-10">
        {notice.data && <p className="rounded-md border border-accent/40 bg-accent/10 p-4 text-sm">{notice.data}</p>}

        {docs.isLoading ? <p className="mt-10 text-sm text-muted-foreground">Loading…</p> : docs.data?.map((doc) => (
          <section key={doc.key} className="mt-10">
            <h2 className="font-display text-2xl uppercase">{doc.title}</h2>
            <div className="mt-4">{renderBody(doc.body)}</div>
          </section>
        ))}

        <p className="mt-10 text-xs text-muted-foreground">Questions about this policy? Contact our Information Officer at <a href="mailto:privacy@jobshadow.co.za" className="underline">privacy@jobshadow.co.za</a>.</p>
      </div>
    </SiteLayout>
  );
}
