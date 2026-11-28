import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { IndemnityDraftPreview } from "@/components/account/IndemnityDraftPreview";
afterEach(cleanup);
it("lets Elena preview Form D without replacing other forms or offering a signing action", () => {
  const cache = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  cache.setQueryData(["me"], { id: "ea29d396-45d1-430c-88d7-29d4504d9725", email: "elena@moi.co.za" });
  render(<QueryClientProvider client={cache}><IndemnityDraftPreview /></QueryClientProvider>);
  fireEvent.click(screen.getByText("Indemnity Form"));
  expect(screen.getByText("Draft for client review.")).toBeVisible();
  expect(screen.getByText("Parent / Guardian Signature Where Required")).toBeVisible();
  const scholar = within(screen.getByRole("region", { name: "Scholar form" }));
  const parent = within(screen.getByRole("region", { name: "Parent or guardian form" }));
  expect(scholar.getByRole("heading", { name: "Code of Conduct and Confidentiality" })).toBeVisible();
  expect(scholar.queryByRole("heading", { name: "Parent or Guardian Health and Emergency Consent" })).toBeNull();
  expect(parent.getByRole("heading", { name: "Parent or Guardian Health and Emergency Consent" })).toBeVisible();
  expect(parent.getByText("Parent / Guardian Signature Where Required")).toBeVisible();
  expect(screen.queryByRole("button")).toBeNull(); expect(screen.queryByRole("textbox")).toBeNull();
});
it("does not show the unapproved draft to ordinary users", () => {
  const cache = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  cache.setQueryData(["me"], { id: "ordinary-scholar", email: "scholar@example.com" });
  render(<QueryClientProvider client={cache}><IndemnityDraftPreview /></QueryClientProvider>);
  expect(screen.queryByText("Indemnity Form")).toBeNull();
});
