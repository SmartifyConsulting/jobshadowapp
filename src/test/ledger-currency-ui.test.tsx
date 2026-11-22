import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { AdminLedgerReport } from "@/components/AdminLedgerReport";
afterEach(cleanup);

it("hides Provider and converts reported costs separately from estimates", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["admin", "report-ledger", "ai_token_ledger"], [
    { id: "actual", provider: "hidden-provider", cost_usd: 0.2, cost_source: "provider" },
    { id: "estimate", provider: "hidden-provider", cost_usd: 0.1, cost_source: "estimated" },
    { id: "unknown", cost_usd: null, cost_source: "unavailable" },
  ]);
  client.setQueryData(["ledger-exchange-rate", "ZAR"], { base: "USD", quote: "ZAR", rate: 18, date: "2026-11-20" });
  render(<QueryClientProvider client={client}><AdminLedgerReport table="ai_token_ledger" /></QueryClientProvider>);
  fireEvent.change(screen.getByLabelText("Country"), { target: { value: "ZA" } });
  await waitFor(() => expect(screen.getByRole("columnheader", { name: "Actual cost (ZAR)" })).toBeVisible());
  expect(screen.queryByRole("columnheader", { name: "Provider" })).not.toBeInTheDocument();
  expect(screen.queryByText("hidden-provider")).not.toBeInTheDocument();
  expect(screen.getByRole("cell", { name: /ZAR\s+3.60/ })).toBeVisible();
  expect(screen.getByRole("cell", { name: /ZAR\s+1.80/ })).toBeVisible();
  expect(screen.getByText(/1 unpriced requests/)).toBeVisible();
  client.clear();
});
