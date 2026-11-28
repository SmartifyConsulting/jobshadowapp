import { LegalFormBody } from "./LegalFormBody";

export function SignatureSpace({ signer }: { signer: "scholar" | "parent" | "mentor" }) {
  const title =
    signer === "scholar"
      ? "Scholar"
      : signer === "parent"
        ? "Parent / Legal Guardian"
        : "Mentor / Company Representative";
  return (
    <section className="space-y-2" aria-label={`${title} signature`}>
      <h4 className="font-bold">Digital Signature</h4>
      <input
        disabled
        aria-label={`${title} digital signature`}
        placeholder={`${title} Signature`}
        className={`h-24 w-full rounded border border-input bg-transparent px-3 text-3xl disabled:opacity-100 ${signer === "scholar" ? "scholar-signature-font" : "guardian-signature-font"}`}
      />
      <dl className="flex flex-wrap gap-x-8 gap-y-1 text-xs">
        <div>
          <dt className="inline font-semibold">Date &amp; Time: </dt>
          <dd className="inline">—</dd>
        </div>
        <div>
          <dt className="inline font-semibold">IP Address: </dt>
          <dd className="inline">—</dd>
        </div>
      </dl>
    </section>
  );
}

export function ScholarGuardianSignatureColumns() {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <h4 className="font-bold">Scholar</h4>
        <SignatureSpace signer="scholar" />
      </div>
      <div className="space-y-3">
        <h4 className="font-bold">Parent / Legal Guardian</h4>
        <SignatureSpace signer="parent" />
      </div>
    </div>
  );
}

export function FormAColumns({ body }: { body: string }) {
  const blocks = body
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  const scholar = blocks.filter((block) => /^Scholar Accuracy Declaration:/i.test(block));
  const guardian = blocks.filter((block) => /^Parent\s*\/\s*Legal Guardian Consent/i.test(block));
  const other = blocks.filter((block) => !scholar.includes(block) && !guardian.includes(block));
  return (
    <div className="space-y-5">
      {other.length > 0 && <LegalFormBody body={other.join("\n\n")} />}
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-6">
          <LegalFormBody body={scholar.join("\n\n")} />
          <div className="mt-auto">
            <SignatureSpace signer="scholar" />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <LegalFormBody body={guardian.join("\n\n")} />
          <div className="mt-auto">
            <SignatureSpace signer="parent" />
          </div>
        </div>
      </div>
    </div>
  );
}
