import { Fragment, type ReactNode } from "react";

/** Small safe Markdown subset: React escapes raw HTML; links reject executable schemes. */
export function insightInline(text: string): ReactNode {
  const tokens = text.split(/(\[[^\[\]]+\]\([^\s)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return tokens.map((token, i) => {
    const link = /^\[([^\[\]]+)\]\(([^\s)]+)\)$/.exec(token);
    if (link) {
      const href = link[2]!;
      if (/^https?:\/\//i.test(href) || /^\/(?!\/)/.test(href) || href.startsWith("#")) {
        return (
          <a
            key={i}
            href={href}
            className="text-primary underline"
            {...(/^https?:/i.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {link[1]}
          </a>
        );
      }
      return <Fragment key={i}>{link[1]}</Fragment>;
    }
    if (token.startsWith("**") && token.endsWith("**"))
      return <strong key={i}>{token.slice(2, -2)}</strong>;
    if (token.startsWith("*") && token.endsWith("*")) return <em key={i}>{token.slice(1, -1)}</em>;
    return <Fragment key={i}>{token}</Fragment>;
  });
}
export function InsightContent({ body }: { body: string }) {
  return (
    <div className="space-y-5 text-[15px] leading-relaxed">
      {body
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((block, i) => {
          const value = block.trim();
          if (/^#{1,3}\s/.test(value))
            return (
              <h2 key={i} className="text-lg font-bold">
                {insightInline(value.replace(/^#{1,3}\s+/, ""))}
              </h2>
            );
          const lines = value.split("\n");
          if (lines.every((line) => /^[-*]\s/.test(line)))
            return (
              <ul key={i} className="list-disc space-y-2 pl-5">
                {lines.map((line, n) => (
                  <li key={n}>{insightInline(line.replace(/^[-*]\s+/, ""))}</li>
                ))}
              </ul>
            );
          if (lines.every((line) => /^\d+\.\s/.test(line)))
            return (
              <ol key={i} className="list-decimal space-y-2 pl-5">
                {lines.map((line, n) => (
                  <li key={n}>{insightInline(line.replace(/^\d+\.\s+/, ""))}</li>
                ))}
              </ol>
            );
          return (
            <p key={i} className="whitespace-pre-line">
              {insightInline(value)}
            </p>
          );
        })}
    </div>
  );
}
