import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
const upsert = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
const updateUser = vi.hoisted(() =>
  vi
    .fn()
    .mockImplementation(async ({ data }) => ({
      error: null,
      data: { user: { id: "self", email: "self@example.com", user_metadata: data } },
    })),
);
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(() => ({ upsert })), auth: { updateUser } },
}));
import { AccountProfile, AccountPersonalDetails } from "@/components/account/AccountProfile";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("keeps unsaved own names across profile tabs and saves only the signed-in account", async () => {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  cache.setQueryData(["me"], {
    id: "self",
    email: "self@example.com",
    user_metadata: { country_code: "ZA", city: "Johannesburg", suburb: "Sandton" },
  });
  cache.setQueryData(["profile", "self"], { first_name: "Alex", last_name: "Example" });
  render(
    <QueryClientProvider client={cache}>
      <AccountProfile />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText("First Name"), { target: { value: "Edited" } });
  expect(screen.getByLabelText("Country")).toHaveValue("ZA");
  expect(screen.getByLabelText("City")).toHaveValue("Johannesburg");
  fireEvent.change(screen.getByLabelText("Suburb"), { target: { value: "Rosebank" } });
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
  await waitFor(() =>
    expect(updateUser).toHaveBeenCalledWith({
      data: {
        country_code: "ZA",
        city: "Johannesburg",
        suburb: "Rosebank",
        location: "Rosebank, Johannesburg, South Africa",
      },
    }),
  );
  cache.clear();
});

it("requires saved first and last names before the mentor wizard advances", async () => {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  cache.setQueryData(["me"], { id: "self", email: "self@example.com" });
  cache.setQueryData(["profile", "self"], {});
  const next = vi.fn();
  render(
    <QueryClientProvider client={cache}>
      <AccountPersonalDetails onSaved={next} />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByLabelText("First Name")).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByLabelText("Last Name")).toHaveAttribute("aria-invalid", "true");
  expect(next).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("First Name"), { target: { value: "Synthetic" } });
  fireEvent.change(screen.getByLabelText("Last Name"), { target: { value: "Mentor" } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(next).toHaveBeenCalledOnce());
  expect(upsert).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: "self", first_name: "Synthetic", last_name: "Mentor" }),
  );
  cache.clear();
});


it("shows an Admin account profile without scholar fields, tabs or workflow", () => {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  cache.setQueryData(["me"], { id: "self", email: "self@example.com" });
  cache.setQueryData(["profile", "self"], { first_name: "Alex", last_name: "Admin" });
  render(
    <QueryClientProvider client={cache}>
      <AccountProfile admin />
    </QueryClientProvider>,
  );
  expect(screen.getByLabelText("First Name")).toHaveValue("Alex");
  expect(screen.getByLabelText("Country")).toBeInTheDocument();
  expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  expect(screen.queryByText("School Country")).not.toBeInTheDocument();
  expect(screen.queryByText("Current School")).not.toBeInTheDocument();
  expect(screen.queryByText("Parent / Guardian")).not.toBeInTheDocument();
  expect(screen.queryByText("Secondary Information")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  cache.clear();
});
