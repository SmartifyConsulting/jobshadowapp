import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { BookingInvoice } from "@/components/account/BookingInvoice";
afterEach(cleanup);
it("shows a Paid stamp only when payment is confirmed", () => {
  const props = { career: "Accountant", date: "2026-12-07", location: "Johannesburg", amount: 350 };
  const view = render(<BookingInvoice {...props} paid={false} />);
  expect(screen.getByText("Awaiting Payment")).toBeVisible();
  expect(screen.queryByLabelText("Paid stamp")).toBeNull();
  view.rerender(<BookingInvoice {...props} paid />);
  expect(screen.getByLabelText("Paid stamp")).toBeVisible();
  expect(screen.queryByText("Test Only")).toBeNull();
  view.rerender(<BookingInvoice {...props} paid preview />);
  expect(screen.getByLabelText("Paid stamp — test only")).toBeVisible();
  expect(screen.getByText("Invoice Preview")).toBeVisible();
});
