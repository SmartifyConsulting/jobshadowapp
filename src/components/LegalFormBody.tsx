export function LegalFormBody({ body }: { body: string }) {
  const internalNote =
    /^(?:Displayed during the Shared Scholar-Parent Onboarding Wizard\b|Must be digitally signed by both the High School Scholar and the linked Parent\/Guardian\b|Executed digitally by Individual Mentors and Host Company HR Representatives during\b|Digitally signed by both the High School Scholar\b|Digitally executed with the Individual Mentor's or Host Company HR Representative's name\b)/i;
  return (
    <div className="space-y-5 text-sm leading-relaxed">
      {body
        .split(/\r?\n\s*\r?\n/)
        .map((block) => block.trim())
        .filter((block) => block && !internalNote.test(block))
        .map((block, index) => {
          const heading = block.match(/^([^:\n]{1,100}):\s+([\s\S]+)$/);
          return heading ? (
            <section key={index} className="space-y-2">
              <h4 className="font-bold">{/^Scholar Accuracy Declaration$/i.test(heading[1] ?? "") ? "Information Accuracy Declaration" : heading[1]}</h4>
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
