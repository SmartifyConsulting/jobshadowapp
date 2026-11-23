import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { PartnerApplication } from "@/lib/partner-applications";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), update: vi.fn(), single: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from },
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, search }: { children: ReactNode; search: { contact: string } }) => (
    <a href={"/auth?contact=" + search.contact}>{children}</a>
  ),
}));
import { PartnerApplicationForm } from "@/components/PartnerApplicationForm";
import { PartnerApplicationsList } from "@/components/PartnerApplicationsList";

function mount(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
  return client;
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({ data: "application-reference", error: null });
  mocks.single.mockResolvedValue({ data: { id: "mentor-request" }, error: null });
  mocks.from.mockReturnValue({ update: mocks.update });
  mocks.update.mockReturnValue({ eq: () => ({ select: () => ({ single: mocks.single }) }) });
});
afterEach(cleanup);

describe("In-app partner applications", () => {
  it("requires sign-in and retains the requested application kind", () => {
    const client = mount(<PartnerApplicationForm type="host" userId={null} email={null} />);
    expect(screen.getByRole("link", { name: "Sign In To Apply" })).toHaveAttribute(
      "href",
      "/auth?contact=host",
    );
    expect(screen.queryByRole("button", { name: "Submit Application" })).not.toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
    client.clear();
  });
  it("submits only application fields and displays the saved pending receipt", async () => {
    const client = mount(
      <PartnerApplicationForm type="mentor" userId="current-user" email="person@example.com" />,
    );
    fireEvent.change(screen.getByLabelText("Company Name"), { target: { value: "Test Company" } });
    fireEvent.change(screen.getByLabelText("First Name"), { target: { value: "Anne Marie" } });
    fireEvent.change(screen.getByLabelText("Last Name"), { target: { value: "van der Merwe" } });
    fireEvent.change(screen.getByLabelText("Mobile Number", { exact: true }), {
      target: { value: "0821234567" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Application" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("pending review"));
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("submit_partner_application", {
      _applicant_type: "mentor",
      _company: "Test Company",
      _first_name: "Anne Marie",
      _last_name: "van der Merwe",
      _phone: "+27821234567",
      _message: "",
    });
    expect(mocks.from).not.toHaveBeenCalled();
    client.clear();
  });
  it("combines mentor and host applications and saves only the selected review status", async () => {
    const mentor: PartnerApplication = {
      id: "mentor-request",
      user_id: "applicant",
      applicant_type: "mentor",
      company: "Mentor Company",
      first_name: "Mentor",
      last_name: "Applicant",
      email: "mentor@example.com",
      phone: "+27821234567",
      message: "Please consider me.",
      status: "pending",
      created_at: "2026-11-22T08:00:00Z",
      reviewed_at: null,
    };
    const host = {
      ...mentor,
      id: "host-request",
      applicant_type: "host" as const,
      first_name: "Host",
      company: "Host Company",
    };
    const client = mount(
      <PartnerApplicationsList
        kind="mentor"
        records={[mentor, host]}
        loading={false}
        error={undefined}
        onRefresh={() => {}}
      />,
    );
    expect(screen.getByText("Mentor Company")).toBeVisible();
    expect(screen.getByText("Host Company")).toBeVisible();
    fireEvent.click(screen.getAllByRole("button", { name: "View / review" })[0]!);
    expect(screen.getByText("Please consider me.")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Review Status"), { target: { value: "accepted" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Review" }));
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({
        status: "accepted",
        reviewed_at: expect.any(String),
      }),
    );
    expect(mocks.from).toHaveBeenCalledExactlyOnceWith("partner_applications");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    client.clear();
  });
});
