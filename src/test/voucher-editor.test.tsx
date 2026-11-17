import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ update: vi.fn(), insert: vi.fn(), eq: vi.fn(), latest: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({
  update: (patch: unknown) => { db.update(patch); return { eq: db.eq }; },
  insert: db.insert,
  select: () => ({ order: () => ({ limit: () => ({ maybeSingle: db.latest }) }) }),
}) } }));
import { VoucherEditor } from "@/components/VoucherEditor";
beforeEach(() => { vi.clearAllMocks(); db.eq.mockResolvedValue({ error: null }); db.insert.mockResolvedValue({ error: null }); db.latest.mockResolvedValue({ data: { id: 10 }, error: null }); });
afterEach(cleanup);
describe("Voucher management", () => {
  it("updates only editable fields on the selected voucher", async () => {
    const done = vi.fn();
    render(<VoucherEditor voucher={{ id: 3, name: "School", code: "SCHOOL", discount: 20, bookings: 17 }} known={[]} onDone={done} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText("Discount"), { target: { value: "35" } });
    fireEvent.click(screen.getByRole("button", { name: "Save voucher" }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(db.eq).toHaveBeenCalledWith("id", 3);
    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ discount: 35, code: "SCHOOL" }));
    expect(db.update.mock.calls[0]?.[0]).not.toHaveProperty("bookings");
  });
  it("creates a new record without overwriting the last ID", async () => {
    const done = vi.fn(); render(<VoucherEditor voucher={{}} known={[]} onDone={done} onCancel={() => {}} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "New" } });
    fireEvent.change(screen.getByLabelText("Code"), { target: { value: "NEW" } });
    fireEvent.click(screen.getByRole("button", { name: "Save voucher" }));
    await waitFor(() => expect(done).toHaveBeenCalled());
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ id: 11, name: "New", code: "NEW" }));
    expect(db.update).not.toHaveBeenCalled();
  });
  it("rejects duplicate codes before writing", async () => {
    render(<VoucherEditor voucher={{ name: "New", code: " school " }} known={[{ id: 3, code: "SCHOOL" }]} onDone={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Save voucher" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already in use");
    expect(db.insert).not.toHaveBeenCalled(); expect(db.update).not.toHaveBeenCalled();
  });
});
