import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ProfilePreview } from "@/components/account/ProfilePreview";
afterEach(cleanup);
it("opens a private read-only preview with supplied profile details", () => {
  render(<ProfilePreview name="Test Mentor" sections={[{ title: "Qualifications", fields: [{label: "Skills & Expertise", value: ["Planning", "Coaching"]}, {label: "Experience", value: "Example experience"}, {label: "Qualifications", value: null}] }]} />);
  fireEvent.click(screen.getByRole("button", {name: "Preview Profile"}));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("Test Mentor")).toBeVisible();
  expect(within(dialog).getByText("Planning, Coaching")).toBeVisible();
  expect(within(dialog).getByText("Example experience")).toBeVisible();
  expect(within(dialog).getByText("Not recorded")).toBeVisible();
  expect(within(dialog).queryByRole("textbox")).toBeNull();
  expect(within(dialog).queryByRole("button", {name: /save|submit/i})).toBeNull();
});
