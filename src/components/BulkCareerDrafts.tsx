import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { draftCareerDescription } from "@/lib/career-ai.functions";
import { careerDraftPatch, missingCareerFields, type CareerDraft } from "@/lib/career-draft";
import { careerContentForAI, careersMissingContent } from "@/lib/career-batch";
import { confirmAction } from "@/lib/dialogs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
export type CareerBatchDrafts = Record<string, Partial<CareerDraft>>;
export function BulkCareerDrafts({
  records,
  drafts,
  onDraft,
  onReview,
  disabled = false,
}: {
  records: Record<string, unknown>[];
  drafts: CareerBatchDrafts;
  onDraft: (id: string, draft: Partial<CareerDraft>) => void;
  onReview: (id: string) => void;
  disabled?: boolean;
}) {
  const generate = useServerFn(draftCareerDescription);
  const [busy, setBusy] = useState(false),
    [review, setReview] = useState(false),
    [status, setStatus] = useState("");
  const [failures, setFailures] = useState<{ name: string; message: string }[]>([]);
  const stopped = useRef(false);
  const running = useRef(false);
  const candidates = careersMissingContent(records).filter((row) => !drafts[String(row["id"])]);
  const ready = records.filter((row) => !!drafts[String(row["id"])]);
  async function run() {
    if (running.current || busy || !candidates.length) return;
    running.current = true;
    if (
      !(await confirmAction(
        `Generate missing-field drafts for ${candidates.length} careers across the full catalogue? Existing content will be preserved. This uses the configured AI service and may incur AI usage charges. Review each draft before clicking Update.`,
        { title: "Generate missing career content", confirmLabel: "Generate drafts" },
      ))
    ) {
      running.current = false;
      return;
    }
    setBusy(true);
    stopped.current = false;
    setFailures([]);
    let count = 0,
      failed = 0;
    try {
      for (const row of candidates) {
        if (stopped.current) break;
        setStatus(
          `Generating ${count + failed + 1} of ${candidates.length}: ${String(row["name"])}`,
        );
        const content = careerContentForAI(row);
        const fields = missingCareerFields(content);
        try {
          const result = await generate({ data: { career: String(row["name"]), fields } });
          const patch = careerDraftPatch(
            content,
            Object.fromEntries(
              Object.entries(result).filter(([key]) =>
                fields.includes(key as (typeof fields)[number]),
              ),
            ) as Partial<CareerDraft>,
          );
          if (!Object.keys(patch).length)
            throw new Error("No missing fields were returned. Please retry this career.");
          onDraft(String(row["id"]), patch);
          count++;
        } catch (error) {
          failed++;
          setFailures((list) => [
            ...list,
            {
              name: String(row["name"]),
              message: error instanceof Error ? error.message : "Could not generate a draft.",
            },
          ]);
        }
      }
      setStatus(
        `${stopped.current ? "Stopped. " : ""}${count} drafts ready for review${failed ? `; ${failed} ${failed === 1 ? "career" : "careers"} could not be drafted` : ""}. Existing records have not been changed.`,
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="outline"
        onClick={() => void run()}
        disabled={disabled || busy || !candidates.length}
        title="Generate only missing content across the complete career catalogue"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {busy ? "Generating drafts…" : "AI: Fill missing across all careers"}
      </Button>
      {busy && (
        <Button
          variant="outline"
          onClick={() => {
            stopped.current = true;
            setStatus("Stopping after the current career…");
          }}
        >
          Stop
        </Button>
      )}
      {ready.length > 0 && (
        <Button variant="outline" disabled={busy} onClick={() => setReview(true)}>
          Review AI drafts ({ready.length})
        </Button>
      )}
      {(status || failures.length > 0) && (
        <div className="basis-full text-sm">
          <p role="status">{status}</p>
          {failures.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer">Careers to retry ({failures.length})</summary>
              <ul className="mt-1 space-y-1">
                {failures.map((failure) => (
                  <li key={failure.name}>
                    <strong>{failure.name}:</strong> {failure.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      <Dialog open={review} onOpenChange={setReview}>
        <DialogContent className="max-h-[80vh] overflow-y-auto bg-ivory sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Review career drafts</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Open a career to review its draft, then click Update to save it. Existing fields stay
            unchanged. Unsaved drafts are kept until you leave this screen.
          </p>
          <ul className="divide-y divide-border">
            {ready.map((row) => (
              <li key={String(row["id"])} className="flex items-center justify-between gap-3 py-3">
                <span className="text-sm">
                  {String(row["name"])}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {Object.keys(drafts[String(row["id"])] ?? {}).length} fields
                  </span>
                </span>
                <Button
                  variant="outline"
                  onClick={() => {
                    setReview(false);
                    onReview(String(row["id"]));
                  }}
                >
                  Review {String(row["name"])}
                </Button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
