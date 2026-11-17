import { Fragment } from "react";

/** Renders plain text where **phrase** becomes bold; everything else is escaped by React. */
export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split("\n").map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
            part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
          )}
        </Fragment>
      ))}
    </span>
  );
}
