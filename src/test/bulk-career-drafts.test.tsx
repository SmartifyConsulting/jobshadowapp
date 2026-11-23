import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ generate: vi.fn(), confirm: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/career-ai.functions", () => ({ draftCareerDescription: mock.generate }));
vi.mock("@/lib/dialogs", () => ({ confirmAction: mock.confirm }));
import { BulkCareerDrafts, type CareerBatchDrafts } from "@/components/BulkCareerDrafts";
import { CAREER_DRAFT_FIELDS } from "@/lib/career-draft";
const existing = {
  id: 2,
  name: "Complete test role",
  ...Object.fromEntries(
    CAREER_DRAFT_FIELDS.map((key) => [
      key,
      key === "ai_exposure_level"
        ? "low"
        : ["description", "ideal_for", "future_outlook", "ai_exposure_note"].includes(key)
          ? "Saved content"
          : ["Saved content"],
    ]),
  ),
};
function Batch({
  records = [
    { id: 1, name: "Accountant", description: "Existing overview" },
    existing,
    { id: 3, name: "New test career" },
  ],
}: {
  records?: Record<string, unknown>[];
}) {
  const [drafts, setDrafts] = useState<CareerBatchDrafts>({});
  return (
    <BulkCareerDrafts
      records={records}
      drafts={drafts}
      onDraft={(id, draft) => setDrafts((current) => ({ ...current, [id]: draft }))}
      onReview={vi.fn()}
    />
  );
}
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mock.confirm.mockResolvedValue(true);
  mock.generate.mockResolvedValue({
    description: "Do not overwrite",
    interpersonal_skills: ["Teamwork"],
  });
});
describe("catalogue-wide missing career drafts", () => {
  it("generates only for incomplete records and never changes saved content automatically", async () => {
    render(<Batch />);
    fireEvent.click(screen.getByRole("button", { name: "AI: Fill missing across all careers" }));
    await screen.findByRole("button", { name: "Review AI drafts (2)" });
    expect(mock.generate).toHaveBeenCalledTimes(2);
    expect(mock.generate.mock.calls[0]![0].data.career).toBe("Accountant");
    expect(mock.generate.mock.calls[0]![0].data.fields).not.toContain("description");
    expect(mock.generate.mock.calls[0]![0].data.fields).not.toContain("school_skills");
    expect(screen.getByRole("status")).toHaveTextContent("Existing records have not been changed");
    fireEvent.click(screen.getByRole("button", { name: "Review AI drafts (2)" }));
    expect(screen.getByRole("button", { name: "Review Accountant" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Review Complete test role" })).toBeNull();
  });
  it("does not run generation until the admin confirms", async () => {
    mock.confirm.mockResolvedValue(false);
    render(<Batch />);
    fireEvent.click(screen.getByRole("button", { name: "AI: Fill missing across all careers" }));
    await waitFor(() => expect(mock.confirm).toHaveBeenCalledOnce());
    expect(mock.generate).not.toHaveBeenCalled();
  });
  it("continues after a failed career and keeps successful drafts for review", async () => {
    mock.generate.mockRejectedValueOnce(new Error("Invalid response"));
    render(<Batch />);
    fireEvent.click(screen.getByRole("button", { name: "AI: Fill missing across all careers" }));
    await screen.findByRole("button", { name: "Review AI drafts (1)" });
    expect(mock.generate).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("1 career could not be drafted");
  });
  it("stops after the in-flight request without starting another career", async () => {
    let finish!: (value: unknown) => void;
    mock.generate.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<Batch />);
    fireEvent.click(screen.getByRole("button", { name: "AI: Fill missing across all careers" }));
    await screen.findByRole("button", { name: "Stop" });
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    finish({ interpersonal_skills: ["Teamwork"] });
    await screen.findByRole("button", { name: "Review AI drafts (1)" });
    expect(mock.generate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Stopped");
  });
  it("stops additional AI calls when the admin leaves the screen", async () => {
    let finish!: (value: unknown) => void;
    mock.generate.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const view = render(<Batch />);
    fireEvent.click(screen.getByRole("button", { name: "AI: Fill missing across all careers" }));
    await screen.findByRole("button", { name: "Stop" });
    view.unmount();
    await act(async()=>{finish({ interpersonal_skills: ["Teamwork"] });});
    await waitFor(() => expect(mock.generate).toHaveBeenCalledTimes(1));
  });
});
