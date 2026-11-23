import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const signUp = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signUp } } }));
vi.mock("@/lib/development-email", () => ({
  EMAIL_DELIVERY_PAUSED: false,
  EMAIL_PAUSED_MESSAGE: "Paused",
}));
vi.mock("@/components/Turnstile", () => ({
  Turnstile: ({ onVerify }: { onVerify: (token: string) => void }) => (
    <button type="button" onClick={() => onVerify("mock-only")}>
      Mock Verify
    </button>
  ),
}));
import { RegisterForm } from "@/components/RegisterForm";
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("asks mentors their type and stores the choice without assigning privileges (mock auth only)", async () => {
  render(<RegisterForm compact />);
  expect(screen.queryByLabelText("How Are You Mentoring?")).toBeNull();
  fireEvent.change(screen.getByLabelText("I am signing up as"), { target: { value: "host" } });
  fireEvent.change(screen.getByLabelText("How Are You Mentoring?"), {
    target: { value: "company" },
  });
  fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Synthetic" } });
  fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Mentor" } });
  fireEvent.change(screen.getByPlaceholderText("Email address"), {
    target: { value: "synthetic@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: "Test-only-123!" },
  });
  fireEvent.change(screen.getByPlaceholderText("Repeat password"), {
    target: { value: "Test-only-123!" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Mock Verify" }));
  fireEvent.submit(screen.getByRole("button", { name: "Register" }).closest("form")!);
  await waitFor(() => expect(signUp).toHaveBeenCalledOnce());
  const data = signUp.mock.calls[0]![0].options.data;
  expect(data).toMatchObject({ account_type: "host", mentoring_type: "company" });
  expect(data.role).toBeUndefined();
});
