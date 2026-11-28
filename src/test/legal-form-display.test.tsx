import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LegalFormBody } from "@/components/LegalFormBody";
import { MentorSafeguardingForm } from "@/components/mentor/MentorSafeguardingForm";
import { FormAColumns, ScholarGuardianSignatureColumns } from "@/components/FormSignatureLayout";

afterEach(cleanup);
it("keeps each Form A declaration with its own signature space and distinct role font", () => {
  render(
    <FormAColumns
      body={
        "Scholar Accuracy Declaration: I confirm my information.\n\nParent / Legal Guardian Consent (Competent Person): I give consent."
      }
    />,
  );
  expect(screen.getByRole("heading", { name: "Scholar Accuracy Declaration" })).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Parent / Legal Guardian Consent (Competent Person)" }),
  ).toBeVisible();
  const scholar = screen.getByRole("textbox", { name: "Scholar digital signature" });
  const parent = screen.getByRole("textbox", { name: "Parent / Legal Guardian digital signature" });
  expect(scholar).toHaveClass("scholar-signature-font");
  expect(parent).toHaveClass("guardian-signature-font");
  expect(scholar).toBeDisabled();
  expect(parent).toBeDisabled();
});
it("provides scholar and guardian signature columns at the end of Form B", () => {
  render(<ScholarGuardianSignatureColumns />);
  expect(screen.getByRole("textbox", { name: "Scholar digital signature" })).toBeVisible();
  expect(
    screen.getByRole("textbox", { name: "Parent / Legal Guardian digital signature" }),
  ).toBeVisible();
});
it("removes internal instructions while keeping the agreement below its clause heading", () => {
  render(
    <LegalFormBody
      body={
        "Must be digitally signed by both the High School Scholar and the linked Parent/Guardian before any booking request can be confirmed.\n\nScholar Accuracy Declaration: I confirm that the information is accurate.\n\nParent Consent: I consent to participation."
      }
    />,
  );
  expect(screen.queryByText(/Must be digitally signed/)).toBeNull();
  expect(screen.getByRole("heading", { name: "Scholar Accuracy Declaration" })).toHaveClass(
    "font-bold",
  );
  expect(screen.getByText("I confirm that the information is accurate.")).toBeVisible();
  expect(screen.getByRole("heading", { name: "Parent Consent" })).toBeVisible();
  expect(screen.getByText("I consent to participation.")).toBeVisible();
});
it("shows only Form C in the mentor form frame", () => {
  const cache = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  cache.setQueryData(
    ["mentor-safeguarding-form"],
    "## Form A: Scholar Consent\n\nScholar-only text.\n\n## Form B: Scholar Indemnity\n\nAnother scholar clause.\n\n## Form C: Mentor Safeguarding\n\nExecuted digitally by Individual Mentors and Host Company HR Representatives during Step 2 of their onboarding wizard.\n\nChild Safeguarding & Supervision: I agree to provide a safe environment.",
  );
  render(
    <QueryClientProvider client={cache}>
      <MentorSafeguardingForm />
    </QueryClientProvider>,
  );
  expect(screen.getByText("Form C: Mentor Safeguarding")).toBeVisible();
  fireEvent.click(screen.getByText("Form C: Mentor Safeguarding"));
  expect(screen.getByRole("heading", { name: "Child Safeguarding & Supervision" })).toBeVisible();
  expect(screen.getByText("I agree to provide a safe environment.")).toBeVisible();
  expect(screen.queryByText(/Scholar-only text/)).toBeNull();
  expect(screen.queryByText(/Another scholar clause/)).toBeNull();
  expect(screen.queryByText(/Executed digitally/)).toBeNull();
});
