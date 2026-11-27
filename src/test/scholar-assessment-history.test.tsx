import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ order: vi.fn(), eq: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: db.eq }) }),
  },
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/assessment.functions", () => ({
  getAssessmentQuestions: vi.fn(),
  submitAssessment: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
import { ScholarAssessments } from "@/components/account/ScholarAssessments";

const rows = [
  {
    id: "latest",
    kind: "mini",
    created_at: "2026-11-28T10:00:00Z",
    realistic: 1,
    investigative: 9,
    artistic: 7,
    social: 5,
    enterprising: 2,
    conventional: 0,
    onet_careers: [],
  },
  {
    id: "older",
    kind: "full",
    created_at: "2026-11-20T10:00:00Z",
    realistic: 9,
    investigative: 2,
    artistic: 1,
    social: 3,
    enterprising: 8,
    conventional: 7,
    onet_careers: [],
  },
];
function mount(userId = "scholar-a") {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  cache.setQueryData(["me"], { id: userId });
  return render(
    <QueryClientProvider client={cache}>
      <ScholarAssessments />
    </QueryClientProvider>,
  );
}
afterEach(cleanup);
beforeEach(() => {
  db.eq.mockReset().mockReturnValue({ order: db.order });
  db.order.mockReset().mockResolvedValue({ data: rows, error: null });
});
describe("saved assessment results", () => {
  it("reopens full earlier results and loads them again on a later visit", async () => {
    const first = mount();
    expect(await screen.findByText("Your interest code: IAS")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /REC.*View Result/ }));
    expect(screen.getByText("Your interest code: REC")).toBeVisible();
    expect(screen.getByRole("button", { name: /REC.*View Result/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: /IAS.*View Result/ }));
    expect(screen.getByText("Your interest code: IAS")).toBeVisible();
    first.unmount();
    mount();
    expect(await screen.findByRole("button", { name: /REC.*View Result/ })).toBeVisible();
    expect(db.order).toHaveBeenCalledTimes(2);
  });
  it("filters saved history to the signed-in scholar", async () => {
    mount("scholar-b");
    await screen.findByText("Your interest code: IAS");
    expect(db.eq).toHaveBeenCalledWith("user_id", "scholar-b");
  });
  it("shows history errors and retries instead of silently hiding saved results", async () => {
    db.order.mockResolvedValueOnce({ data: null, error: new Error("Offline") });
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your saved results could not be loaded",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    expect(await screen.findByText("Your interest code: IAS")).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});
