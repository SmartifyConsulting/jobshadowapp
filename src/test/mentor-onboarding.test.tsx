import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useState } from "react";
import { onboardingData, mentorSteps, validateMentorStep } from "@/lib/mentor-onboarding";
const state = vi.hoisted(() => ({
  draft: null as any,
  review: null as any,
  fail: false,
  save: vi.fn(),
  rpc: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@/components/account/AccountProfile", () => ({
  useOwnIdentity: () => ({
    user: { data: { id: "self", email: "self@example.com", email_confirmed_at: "2026-01-01" } },
    profile: { data: { first_name: "Test", last_name: "Mentor" } },
  }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: state.rpc,
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: async () => ({
          data:
            table === "mentor_onboarding_drafts"
              ? state.draft
              : table === "mentor_onboarding_reviews"
                ? state.review
                : { via_company: false },
          error: null,
        }),
        upsert: async (row: unknown) => {
          state.save(row);
          if (state.fail) return { error: { message: "Save failed" } };
          state.draft = { ...(row as any), updated_at: "new-version" };
          return { error: null };
        },
      };
      return chain;
    },
  },
}));
import { MentorOnboardingWizard } from "@/components/mentor/MentorOnboardingWizard";
import { MentorOnboardingReview } from "@/components/mentor/MentorOnboardingReview";
const host: any = {
  bio: "I am a developer.",
  specialties: ["Software"],
  linkedin_url: "https://linkedin.com/in/test",
  via_company: false,
};
function mount(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const view = render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
  return { client, ...view };
}
function wizard(company = false) {
  return (
    <MentorOnboardingWizard
      userId="self"
      hostProfile={{ ...host, via_company: company }}
      renderProfile={(done) => <button onClick={done}>Save Profile Test Fixture</button>}
    />
  );
}
beforeEach(() => {
  state.fail = false;
  state.draft = {
    user_id: "self",
    current_step: "references",
    data: onboardingData(null),
    updated_at: "v1",
  };
  state.review = null;
  vi.clearAllMocks();
});
afterEach(cleanup);
it("keeps onboarding inside the profile and returns to profile editing without navigation", async () => {
  function UnifiedProfile() {
    const [active, setActive] = useState<
      "profile" | "email" | "linkedin" | "references" | "training" | "employer" | "review"
    >("profile");
    return (
      <>
        <button onClick={() => setActive("profile")}>Edit Profile</button>
        <MentorOnboardingWizard
          userId="self"
          hostProfile={host}
          initialStep="profile"
          activeStep={active}
          onStepChange={setActive}
          embedded
          renderProfile={() => <p>My profile fields</p>}
        />
      </>
    );
  }
  mount(<UnifiedProfile />);
  await screen.findByText("My profile fields");
  expect(screen.queryByRole("link", { name: "Back to Profile" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /^Next$/ }));
  expect(await screen.findByText(/Identity verification \(KYC\) is pending/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /Review/ }));
  expect(await screen.findByRole("alert")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Edit Profile" }));
  expect(await screen.findByText("My profile fields")).toBeVisible();
  expect(screen.queryByRole("alert")).toBeNull();
});
it("saves profile edits before advancing and remains on the page when saving fails", async () => {
  const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  mount(
    <MentorOnboardingWizard
      userId="self"
      hostProfile={{ ...host, bio: "", specialties: [] }}
      initialStep="profile"
      embedded
      beforeProfileNext={save}
      renderProfile={() => <p>Editable profile</p>}
    />,
  );
  await screen.findByText("Editable profile");
  fireEvent.click(screen.getByRole("button", { name: /^Next$/ }));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  expect(state.save).not.toHaveBeenCalled();
  expect(screen.getByText("Editable profile")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: /^Next$/ }));
  await screen.findByText(/Identity verification \(KYC\) is pending/);
  expect(save).toHaveBeenCalledTimes(2);
  expect(state.save).toHaveBeenCalledWith(expect.objectContaining({ current_step: "email" }));
});
it("resumes legacy LinkedIn drafts on the profile without showing a separate LinkedIn step", async () => {
  state.draft.current_step = "linkedin";
  mount(wizard());
  expect(await screen.findByRole("button", { name: "Save Profile Test Fixture" })).toBeVisible();
  expect(screen.queryByRole("button", { name: /LinkedIn/ })).toBeNull();
  expect(screen.getByRole("button", { name: /References/ })).toHaveTextContent("3");
});
it("resumes, validates required fields in red and submits before advancing", async () => {
  const { client, unmount } = mount(wizard());
  await screen.findByText(
    "Provide professional referees for Job Shadow to review. Nobody is contacted automatically.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Submit & Next" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("First Name");
  expect(screen.getByLabelText("First Name")).toHaveAttribute("aria-invalid", "true");
  expect(state.save).not.toHaveBeenCalled();
  for (const [label, value] of [
    ["First Name", "Synthetic"],
    ["Last Name", "Referee"],
    ["Role", "Manager"],
    ["Email Address", "referee@example.com"],
  ])
    fireEvent.change(screen.getByLabelText(label!), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Submit & Next" }));
  await screen.findByLabelText("Training Name");
  expect(state.draft.current_step).toBe("training");
  expect(state.draft.data.references_submitted).toBe(true);
  expect(
    screen.getByRole("button", { name: /References/ }).querySelector('[aria-label="Completed"]'),
  ).toBeNull();
  unmount();
  mount(wizard());
  expect(await screen.findByLabelText("Training Name")).toBeVisible();
  client.clear();
});
it("preserves data and position on failed save, and supports retry", async () => {
  state.draft.data.references = [
    {
      first_name: "Test",
      last_name: "Referee",
      role: "Manager",
      email: "referee@example.com",
      phone: "",
    },
  ];
  state.fail = true;
  mount(wizard());
  await screen.findByLabelText("First Name");
  fireEvent.click(screen.getByRole("button", { name: "Submit & Next" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("could not be saved");
  expect(screen.getByLabelText("First Name")).toHaveValue("Test");
  expect(state.draft.current_step).toBe("references");
  state.fail = false;
  fireEvent.click(screen.getByRole("button", { name: "Submit & Next" }));
  expect(await screen.findByLabelText("Training Name")).toBeVisible();
});
it("skips employer sign-off for independent mentors and retains it for company mentors", () => {
  expect(mentorSteps(false)).not.toContain("employer");
  expect(mentorSteps(true)).toContain("employer");
  expect(mentorSteps(false)).not.toContain("linkedin");
  expect(mentorSteps(true)).not.toContain("linkedin");
  expect(
    validateMentorStep("training", onboardingData(null), {
      company: false,
      emailVerified: true,
      linkedin: "",
    }).map((e) => e.field),
  ).toContain("training-link");
  expect(
    validateMentorStep("email", onboardingData(null), {
      company: false,
      emailVerified: false,
      linkedin: "",
    })[0]?.message,
  ).toContain("paused");
});
it("does not let a forward stepper jump bypass incomplete submissions", async () => {
  mount(wizard());
  await screen.findByLabelText("First Name");
  fireEvent.click(screen.getByRole("button", { name: /Review/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent("referee’s First Name");
  expect(state.save).not.toHaveBeenCalled();
});
it("requires reviewers to reload changed submissions before saving", async () => {
  state.draft.data.references_submitted = true;
  const { client } = mount(<MentorOnboardingReview userId="self" email="self@example.com" />);
  const button = await screen.findByRole("button", { name: "Save Review" });
  await waitFor(() => expect(button).toBeEnabled());
  client.setQueryData(["mentor-onboarding", "self"], {
    draft: { ...state.draft, updated_at: "v2" },
    review: null,
  });
  await waitFor(() => expect(button).toBeDisabled());
  fireEvent.click(screen.getByRole("button", { name: "Reload Review" }));
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  await waitFor(() =>
    expect(state.rpc).toHaveBeenCalledWith(
      "review_mentor_onboarding",
      expect.objectContaining({ _user_id: "self", _expected_updated_at: "v2" }),
    ),
  );
});
it("submits training, skips the independent employer step and allows returning to edit", async () => {
  state.draft.current_step = "training";
  state.draft.data.references_submitted = true;
  state.draft.data.references = [
    {
      first_name: "Test",
      last_name: "Referee",
      role: "Manager",
      email: "referee@example.com",
      phone: "",
    },
  ];
  mount(wizard());
  await screen.findByLabelText("Training Name");
  for (const [label, value] of [
    ["Training Name", "Synthetic safeguarding"],
    ["Training Provider", "Test provider"],
    ["Evidence Link (HTTPS)", "https://example.com/synthetic-evidence"],
  ])
    fireEvent.change(screen.getByLabelText(label!), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Submit & Next" }));
  await screen.findByText(
    "Job Shadow reviews your submissions. Green ticks show approved vetting steps.",
  );
  expect(state.draft.current_step).toBe("review");
  expect(state.draft.data.training_submitted).toBe(true);
  expect(screen.queryByRole("button", { name: /Employer Sign-Off/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(await screen.findByLabelText("Training Name")).toHaveValue("Synthetic safeguarding");
});
