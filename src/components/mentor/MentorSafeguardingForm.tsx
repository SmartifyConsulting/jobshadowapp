import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LegalFormBody } from "@/components/LegalFormBody";
import { SignatureSpace } from "@/components/FormSignatureLayout";

export function MentorSafeguardingForm() {
  const document = useQuery({
    queryKey: ["mentor-safeguarding-form"],
    queryFn: async () => {
      const result = await supabase
        .from("legal_documents")
        .select("body")
        .eq("key", "consent_forms")
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data?.body ?? "";
    },
  });
  if (document.isPending) return <p role="status">Loading the safeguarding form…</p>;
  if (document.isError)
    return (
      <p role="alert">
        The safeguarding form could not be loaded.{" "}
        <button type="button" className="underline" onClick={() => void document.refetch()}>
          Try Again
        </button>
      </p>
    );
  const section = document.data
    .split(/(?=^##\s+Form\s+[A-Z]\s*:)/im)
    .find((part) => /^##\s+Form\s+C\s*:/i.test(part.trim()))
    ?.trim();
  if (!section) return <p className="text-sm">The safeguarding form is not available yet.</p>;
  const heading = section.match(/^##\s+([^\r\n]+)\r?\n?/);
  return (
    <details className="rounded-lg border border-border bg-[#FFFDF5] p-4">
      <summary className="cursor-pointer font-bold">
        {heading?.[1] ?? "Mentor & Company Safeguarding Undertaking"}
      </summary>
      <div className="mt-5">
        <LegalFormBody body={heading ? section.slice(heading[0].length).trim() : section} />
      </div>
      <div className="mt-6">
        <SignatureSpace signer="mentor" />
      </div>
    </details>
  );
}
