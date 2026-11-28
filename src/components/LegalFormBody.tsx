import { legalBlocks } from "@/lib/guardian-contract";
export function LegalFormBody({ body }: { body: string }) {
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      {legalBlocks(body).map((block, index) => {
        const heading = block.match(/^([^:\n]{1,100}):\s+([\s\S]+)$/);
        return heading ? (
          <section key={index} className="space-y-2">
            <h4 className="font-bold">{heading[1]}</h4>
            <p className="whitespace-pre-wrap">{heading[2]}</p>
          </section>
        ) : /^#{1,4}\s/.test(block) ? (
          <h4 key={index} className="font-bold">
            {block.replace(/^#{1,4}\s+/, "")}
          </h4>
        ) : (
          <p key={index} className="whitespace-pre-wrap">
            {block}
          </p>
        );
      })}
    </div>
  );
}
