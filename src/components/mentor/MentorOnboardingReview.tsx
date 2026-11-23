import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  onboardingData,
  REVIEW_LABELS,
  type ReviewStatus,
  safeWebLink,
} from "@/lib/mentor-onboarding";
import { openMentorEvidence, useMentorOnboarding } from "./OnboardingData";
const keys = ["references_status", "training_status", "employer_status", "final_status"] as const;
type Key = (typeof keys)[number];
const labels: Record<Key, string> = {
  references_status: "References",
  training_status: "Safeguarding Training",
  employer_status: "Employer Sign-Off",
  final_status: "Final Review",
};
export function MentorOnboardingReview({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const saved = useMentorOnboarding(userId),
    client = useQueryClient();
  const host = useQuery({
    queryKey: ["mentor-review-profile", userId],
    enabled: !!email,
    queryFn: async () => {
      const result = await supabase
        .from("host_profiles")
        .select("via_company,linkedin_url")
        .eq("mentor_email", email!)
        .maybeSingle();
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const [decisions, setDecisions] = useState<Record<Key, ReviewStatus>>({
      references_status: "pending",
      training_status: "pending",
      employer_status: "pending",
      final_status: "pending",
    }),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    const review = saved.data?.review;
    if (review) {
      setDecisions({
        references_status: review.references_status as ReviewStatus,
        training_status: review.training_status as ReviewStatus,
        employer_status: review.employer_status as ReviewStatus,
        final_status: review.final_status as ReviewStatus,
      });
      const source = review.notes;
      setNotes(
        source && typeof source === "object" && !Array.isArray(source)
          ? Object.fromEntries(
              Object.entries(source).filter(
                (entry): entry is [string, string] => typeof entry[1] === "string",
              ),
            )
          : {},
      );
    }
  }, [saved.data?.review]);
  const [reviewedVersion, setReviewedVersion] = useState<string | null>(null);
  useEffect(() => {
    if (!reviewedVersion && saved.data?.draft) setReviewedVersion(saved.data.draft.updated_at);
  }, [saved.data?.draft, reviewedVersion]);
  const changed = !!reviewedVersion && reviewedVersion !== saved.data?.draft?.updated_at;
  const data = onboardingData(saved.data?.draft?.data);
  async function save() {
    if (!saved.data?.draft) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await supabase.rpc("review_mentor_onboarding", {
        _user_id: userId,
        _references_status: decisions.references_status,
        _training_status: decisions.training_status,
        _employer_status: decisions.employer_status,
        _final_status: decisions.final_status,
        _notes: notes as Json,
        _expected_updated_at: saved.data.draft.updated_at,
      });
      if (result.error) throw result.error;
      await client.invalidateQueries({ queryKey: ["mentor-onboarding", userId] });
      void client.invalidateQueries({ queryKey: ["how-to-progress", userId] });
      setMessage("Review saved. No messages or emails were sent.");
    } catch (error) {
      await client.invalidateQueries({ queryKey: ["mentor-onboarding", userId] });
      setError(
        error &&
          typeof error === "object" &&
          "message" in error &&
          typeof error.message === "string"
          ? error.message
          : "Could not save the review.",
      );
    } finally {
      setBusy(false);
    }
  }
  function evidence(path: string, link: string) {
    return (
      <div className="flex flex-wrap gap-2">
        {path && (
          <button
            className="text-xs underline"
            type="button"
            onClick={() =>
              openMentorEvidence(path, email ?? "").catch((error) => setError(error.message))
            }
          >
            View Private PDF
          </button>
        )}
        {safeWebLink(link) && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs underline">
            View Evidence Link
          </a>
        )}
      </div>
    );
  }
  return (
    <section className="mt-4 space-y-3 border-t pt-4" aria-label="Mentor onboarding review">
      <h3 className="text-sm font-bold">Mentor Onboarding</h3>
      {saved.isPending ? (
        <p className="text-xs">Loading submissions…</p>
      ) : saved.error || host.error ? (
        <p role="alert" className="text-xs text-destructive">
          Could not load this mentor’s submissions.{" "}
          <button
            className="underline"
            onClick={() => {
              void saved.refetch();
              void host.refetch();
            }}
          >
            Retry
          </button>
        </p>
      ) : !saved.data?.draft ? (
        <p className="text-xs text-muted-foreground">
          This mentor has not saved an onboarding submission yet.
        </p>
      ) : (
        <>
          <div className="space-y-3 text-xs">
            <div>
              <h4 className="font-bold">LinkedIn</h4>
              {data.linkedin_unavailable
                ? "No LinkedIn profile declared."
                : host.data?.linkedin_url || "Not provided"}
            </div>
            <div>
              <h4 className="font-bold">
                References — {data.references_submitted ? "Submitted" : "Draft"}
              </h4>
              {data.references.map((r, i) => (
                <p key={i} className="mt-1 break-words">
                  {r.first_name} {r.last_name}
                  <br />
                  {r.role}
                  <br />
                  {r.email}
                  {r.phone && <> · {r.phone}</>}
                </p>
              ))}
            </div>
            <div>
              <h4 className="font-bold">
                Safeguarding Training — {data.training_submitted ? "Submitted" : "Draft"}
              </h4>
              <p>
                {data.training.name} · {data.training.provider}
              </p>
              {data.training.completed_on && <p>{data.training.completed_on}</p>}
              {evidence(data.training.evidence_path, data.training.link)}
            </div>
            {host.data?.via_company && (
              <div>
                <h4 className="font-bold">
                  Employer Sign-Off — {data.employer_submitted ? "Submitted" : "Draft"}
                </h4>
                <p>
                  {data.employer.company}
                  <br />
                  {data.employer.first_name} {data.employer.last_name}
                  <br />
                  {data.employer.email}
                </p>
                {evidence(data.employer.evidence_path, data.employer.link)}
              </div>
            )}
          </div>
          {keys
            .filter((key) => key !== "employer_status" || host.data?.via_company)
            .map((key) => (
              <fieldset key={key} className="rounded border p-2">
                <legend className="px-1 text-xs font-bold">{labels[key]}</legend>
                <label className="block text-xs">
                  Decision
                  <select
                    aria-label={labels[key] + " Decision"}
                    value={decisions[key]}
                    disabled={busy}
                    className="mt-1 block w-full rounded border bg-ivory p-1"
                    onChange={(e) =>
                      setDecisions({ ...decisions, [key]: e.target.value as ReviewStatus })
                    }
                  >
                    {Object.entries(REVIEW_LABELS).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-2 block text-xs">
                  Feedback to Mentor
                  <textarea
                    value={notes[key] ?? ""}
                    maxLength={2000}
                    rows={2}
                    disabled={busy}
                    className="mt-1 w-full rounded border bg-transparent p-1 font-normal"
                    onChange={(e) => setNotes({ ...notes, [key]: e.target.value })}
                  />
                </label>
              </fieldset>
            ))}
          <button
            type="button"
            disabled={busy || host.isPending || changed}
            onClick={save}
            className="rounded bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save Review"}
          </button>
        </>
      )}
      {changed && (
        <p role="alert" className="text-xs text-destructive">
          This submission changed. Review the latest details, then{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setReviewedVersion(saved.data?.draft?.updated_at ?? null)}
          >
            Reload Review
          </button>
          .
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-xs">
          {message}
        </p>
      )}
    </section>
  );
}
