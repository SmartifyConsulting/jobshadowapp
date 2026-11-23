import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const db = vi.hoisted(() => ({
  draft: null as null | { data: Record<string, string | boolean>; step: string },
  draftSave: vi.fn(),
  profileSave: vi.fn(),
  accountSave: vi.fn(),
  removeDraft: vi.fn(),
  upload: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: table === "scholar_profile_drafts" ? db.draft : null,
            error: null,
          }),
        }),
      }),
      upsert:
        table === "scholar_profile_drafts"
          ? db.draftSave
          : table === "scholar_profiles"
            ? db.profileSave
            : db.accountSave,
      delete: () => ({ eq: db.removeDraft }),
    }),
    storage: { from: () => ({ upload: db.upload }) },
  },
}));
import { ProfileForm } from "@/components/account/AccountSections";

const personal = {
  first_name: "Test",
  last_name: "Scholar",
  full_name: "Test Scholar",
  contact_no: "+27821234567",
  id_number: "1234567890123",
  id_file_path: "student/id.pdf",
  school_type: "Public School",
  tc_accepted: true,
  popi_accepted: true,
  info_accurate: true,
  tc_accepted_at: "2026-11-22T12:00:00.000Z",
  popi_accepted_at: "2026-11-22T12:00:00.000Z",
};
function mount(initialProfile?: Record<string, unknown>, onSaved = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={client}>
      <ProfileForm userId="student" initialProfile={initialProfile} onSaved={onSaved} />
    </QueryClientProvider>,
  );
  return { ...result, onSaved };
}
async function ready() {
  await waitFor(() => expect(screen.getByRole("button", { name: "Next" })).toBeEnabled());
}
beforeEach(() => {
  db.draft = null;
  for (const mock of [db.draftSave, db.profileSave, db.accountSave, db.removeDraft, db.upload])
    mock.mockReset().mockResolvedValue({ error: null });
});
afterEach(cleanup);

describe("student profile step saving", () => {
  it("lists every missing first-step field below Next, with red invalid fields and no later-tab errors", async () => {
    mount();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const summary = await screen.findByRole("alert");
    expect(within(summary).getByText("Enter the first name")).toBeVisible();
    expect(within(summary).getByText(/upload a scan/)).toBeVisible();
    expect(within(summary).getByText(/accept the Terms/)).toBeVisible();
    expect(summary.textContent).not.toMatch(/guardian first|current school/);
    expect(screen.getByLabelText("First Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Scan of ID")).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByRole("button", { name: "Next" }).compareDocumentPosition(summary) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(db.draftSave).not.toHaveBeenCalled();
  });
  it("saves personal details before advancing and shows consent only on the first tab", async () => {
    mount(personal);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByLabelText("Contact Number");
    expect(db.draftSave).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "student",
        step: "guardian",
        data: expect.objectContaining({
          first_name: "Test",
          tc_accepted: true,
          tc_accepted_at: personal.tc_accepted_at,
        }),
      }),
    );
    expect(db.profileSave).not.toHaveBeenCalled();
    expect(screen.queryByText(/I agree with/)).not.toBeInTheDocument();
    expect(screen.queryByText(/As parent\/guardian, I give/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter the parent/guardian first name",
    );
    expect(db.draftSave).toHaveBeenCalledTimes(1);
  });
  it("stays on the current step and shows the save error if draft saving fails", async () => {
    db.draftSave.mockResolvedValue({ error: { message: "Unable to save progress" } });
    mount(personal);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to save progress");
    expect(screen.getByRole("tab", { name: "Personal Details" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(db.profileSave).not.toHaveBeenCalled();
  });
  it("restores saved progress and resumes at the next step", async () => {
    db.draft = { data: { ...personal, school: "Saved school" }, step: "school" };
    mount();
    await ready();
    expect(screen.getByLabelText("Current School")).toHaveValue("Saved school");
    expect(screen.queryByText(/I agree with/)).not.toBeInTheDocument();
  });
  it("saves the completed profile at the final step, preserves consent timestamps and removes the draft", async () => {
    db.draft = {
      data: {
        ...personal,
        school: "Test school",
        guardian_first_name: "Test",
        guardian_last_name: "Parent",
        guardian_name: "Test Parent",
        guardian_contact: "+27821234568",
        guardian_email: "parent@example.test",
      },
      step: "school",
    };
    const { onSaved } = mount();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(db.profileSave).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Test Scholar",
        guardian_name: "Test Parent",
        tc_accepted_at: personal.tc_accepted_at,
      }),
      { onConflict: "user_id" },
    );
    expect(db.removeDraft).toHaveBeenCalledWith("user_id", "student");
  });
  it("does not complete or discard progress when saving the final profile fails", async () => {
    db.draft = {
      data: {
        ...personal,
        school: "Test school",
        guardian_first_name: "Test",
        guardian_last_name: "Parent",
        guardian_name: "Test Parent",
        guardian_contact: "+27821234568",
        guardian_email: "parent@example.test",
      },
      step: "school",
    };
    db.profileSave.mockResolvedValue({ error: { message: "Profile save failed" } });
    const { onSaved } = mount();
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Profile save failed");
    expect(db.removeDraft).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe("profile editing", () => {
  const complete = {
    ...personal,
    school: "Existing school",
    guardian_name: "Elena Nicolettis",
    guardian_contact: "+27821234568",
    guardian_email: "parent@example.test",
    career_interests: "Fashion Design, Marketing",
  };
  function edit(profile: Record<string, unknown> = complete) {
    const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onSaved = vi.fn(),
      onCancel = vi.fn();
    render(
      <QueryClientProvider client={cache}>
        <ProfileForm
          userId="student"
          initialProfile={profile}
          editing
          onSaved={onSaved}
          onCancel={onCancel}
        />
      </QueryClientProvider>,
    );
    return { onSaved, onCancel };
  }
  it("keeps three tabs in order and preserves existing parent names when editing", () => {
    edit();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Personal Details",
      "Parent / Guardian",
      "Secondary Information",
    ]);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Parent / Guardian" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(screen.getByLabelText("First Name")).toHaveValue("Elena");
    expect(screen.getByLabelText("Last Name")).toHaveValue("Nicolettis");
    expect(screen.getByRole("button", { name: "Save" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
  });
  it("does not invent a missing surname and uses parent/guardian in validation messages", async () => {
    edit({ ...complete, guardian_name: "Elena" });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Enter the parent/guardian last name");
    expect(summary).not.toHaveTextContent("Enter the parent/guardian first name");
    expect(screen.getByLabelText("First Name")).toHaveValue("Elena");
  });
  it("saves edited names and preserves hidden career interests, without emailing or changing consent", async () => {
    const { onSaved } = edit();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Parent / Guardian" }), {
      button: 0,
      ctrlKey: false,
    });
    fireEvent.change(screen.getByLabelText("Last Name"), { target: { value: "Updated" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(db.profileSave).toHaveBeenCalledWith(
      expect.objectContaining({
        guardian_first_name: "Elena",
        guardian_last_name: "Updated",
        guardian_name: "Elena Updated",
        career_interests: "Fashion Design, Marketing",
        tc_accepted_at: personal.tc_accepted_at,
      }),
      { onConflict: "user_id" },
    );
    expect(db.draftSave).not.toHaveBeenCalled();
  });
  it("cancels local edits without saving profile or draft changes", () => {
    const { onCancel } = edit();
    fireEvent.change(screen.getByLabelText("First Name"), { target: { value: "Changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(db.profileSave).not.toHaveBeenCalled();
    expect(db.draftSave).not.toHaveBeenCalled();
  });
});
