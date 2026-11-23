import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
const upsert = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(() => ({ upsert })) },
}));
import { AccountProfile } from "@/components/account/AccountProfile";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("keeps unsaved own names across profile tabs and saves only the signed-in account", async () => {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  cache.setQueryData(["me"], { id: "self", email: "self@example.com" });
  cache.setQueryData(["profile", "self"], { first_name: "Alex", last_name: "Example" });
  render(
    <QueryClientProvider client={cache}>
      <AccountProfile />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText("First Name"), { target: { value: "Edited" } });
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Secondary Information" }), {
    button: 0,
    ctrlKey: false,
  });
  expect(screen.getByRole("tab", { name: "Secondary Information" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByText("Last Sign-In")).toBeVisible();
  expect(screen.getAllByText("Unknown").length).toBe(2);
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Personal Details" }), {
    button: 0,
    ctrlKey: false,
  });
  expect(screen.getByLabelText("First Name")).toHaveValue("Edited");
  fireEvent.click(screen.getByRole("button", { name: "Save Personal Details" }));
  await waitFor(() =>
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "self", first_name: "Edited", last_name: "Example" }),
    ),
  );
  cache.clear();
});
