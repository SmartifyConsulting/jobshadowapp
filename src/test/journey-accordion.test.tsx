import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { UserRound } from "lucide-react";
import { JourneyStepper } from "@/components/JourneyStepper";
afterEach(cleanup);
const steps = [
  { id: "profile", title: "Personal Details", icon: UserRound },
  { id: "identity", title: "Verify Identity", icon: UserRound },
  { id: "review", title: "Review", icon: UserRound, locked: true },
];
function Wizard() {
  const [active, setActive] = useState("profile");
  return (
    <JourneyStepper title="Onboarding" steps={steps} active={active} onChange={setActive}>
      {active === "profile" ? (
        <label>
          First Name
          <input defaultValue="" />
        </label>
      ) : (
        <p>Identity form</p>
      )}
      <button onClick={() => setActive("identity")}>Next</button>
    </JourneyStepper>
  );
}
it("collapses a step without losing edits and reopens its form", () => {
  render(<Wizard />);
  const heading = screen.getByRole("button", { name: /Step 1: Personal Details/ });
  fireEvent.change(screen.getByRole("textbox", { name: "First Name" }), {
    target: { value: "Draft name" },
  });
  fireEvent.click(heading);
  expect(heading).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  fireEvent.click(heading);
  expect(screen.getByRole("textbox")).toHaveValue("Draft name");
});
it("opens the next form under its own heading and keeps every step visible", () => {
  render(<Wizard />);
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("button", { name: /Step 2: Verify Identity/ })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  expect(screen.getByRole("region", { name: /Step 2: Verify Identity/ })).toHaveTextContent(
    "Identity form",
  );
  expect(screen.getByRole("button", { name: /Step 1: Personal Details/ })).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  expect(screen.getByRole("button", { name: /Step 3: Review/ })).toBeDisabled();
});
it("keeps validation with the parent when a requested step is rejected", () => {
  const request = vi.fn();
  render(
    <JourneyStepper title="Onboarding" steps={steps} active="profile" onChange={request}>
      <input aria-label="Existing profile field" />
    </JourneyStepper>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Step 2: Verify Identity/ }));
  expect(request).toHaveBeenCalledWith("identity");
  expect(screen.getByRole("textbox")).toBeVisible();
  expect(screen.getByRole("button", { name: /Step 1: Personal Details/ })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
});
it("closes a newly completed step, shows its tick and expands the next step", () => {
  function CompletingWizard() {
    const [active, setActive] = useState("profile");
    const [saved, setSaved] = useState(false);
    return <JourneyStepper title="Onboarding" active={active} onChange={setActive} steps={steps.map(step => ({ ...step, complete: step.id === "profile" && saved }))}>
      {active === "profile" ? <button onClick={() => setSaved(true)}>Save Details</button> : <p>Identity form</p>}
    </JourneyStepper>;
  }
  render(<CompletingWizard />);
  fireEvent.click(screen.getByRole("button", { name: "Save Details" }));
  const completed = screen.getByRole("button", { name: /Step 1: Personal Details/ });
  expect(completed).toHaveAttribute("aria-expanded", "false");
  expect(completed.querySelector('[aria-label="Completed"]')).not.toBeNull();
  expect(screen.getByRole("button", { name: /Step 2: Verify Identity/ })).toHaveAttribute("aria-expanded", "true");
  expect(screen.queryByRole("button", { name: /^(Next|Back)$/ })).toBeNull();
  fireEvent.click(completed);
  expect(completed).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "Save Details" })).toBeVisible();
});
it("keeps an incomplete step open until completion is actually recorded", () => {
  const onChange = vi.fn();
  const pendingSteps = steps.map(step => ({ ...step, complete: false }));
  const view = render(<JourneyStepper title="Onboarding" steps={pendingSteps} active="profile" onChange={onChange}><p>Saving failed. Please retry.</p></JourneyStepper>);
  view.rerender(<JourneyStepper title="Onboarding" steps={pendingSteps} active="profile" onChange={onChange}><p>Saving failed. Please retry.</p></JourneyStepper>);
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: /Step 1: Personal Details/ })).toHaveAttribute("aria-expanded", "true");
  expect(screen.queryByLabelText("Completed")).toBeNull();
});
