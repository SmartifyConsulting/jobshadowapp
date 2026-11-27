import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ rpc: vi.fn(), read: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: db.rpc,
    from: () => ({ select: () => ({ eq: () => ({ order: db.read }) }) }),
  },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
import { Bookings } from "@/components/account/AccountSections";
const booking = {
  id: "booking-one",
  user_id: "payer",
  career: "Accountant",
  company: "Example",
  shadow_date: "12/07/2026",
  status: "awaiting_payment",
  amount_due: 350,
  paid_at: null,
};
function mount() {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  cache.setQueryData(["me"], { id: "payer" });
  cache.setQueryData(["bookings", "payer"], [booking]);
  const next = vi.fn();
  render(
    <QueryClientProvider client={cache}>
      <Bookings selectedId={booking.id} onCompleteForms={next} />
    </QueryClientProvider>,
  );
  return next;
}
beforeEach(() => {
  db.rpc.mockReset().mockResolvedValue({ error: null });
  db.read
    .mockReset()
    .mockResolvedValue({
      data: [{ ...booking, status: "indemnity_required", paid_at: "2026-11-28T12:00:00Z" }],
      error: null,
    });
});
afterEach(cleanup);
describe("payment success feedback", () => {
  it("shows confirmed payment success and continues with the same booking's forms", async () => {
    const next = mount();
    fireEvent.click(screen.getByRole("button", { name: "Pay R350 (test payment)" }));
    const popup = await screen.findByRole("dialog", { name: "Payment Successful" });
    expect(
      within(popup).getByText(/Your test payment has been recorded successfully/),
    ).toBeVisible();
    fireEvent.click(within(popup).getByRole("button", { name: "Complete Forms" }));
    expect(next).toHaveBeenCalledWith("booking-one");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("never shows success or advances when payment fails", async () => {
    db.rpc.mockResolvedValueOnce({ error: { message: "Payment declined" } });
    const next = mount();
    fireEvent.click(screen.getByRole("button", { name: "Pay R350 (test payment)" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Payment declined");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(next).not.toHaveBeenCalled();
    expect(db.read).not.toHaveBeenCalled();
  });
  it("waits for a paid record instead of treating a silent server response as success", async () => {
    db.read.mockResolvedValueOnce({ data: [booking], error: null });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Pay R350 (test payment)" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your payment has not been confirmed yet",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
