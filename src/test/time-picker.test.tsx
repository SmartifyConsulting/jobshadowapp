import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useState } from "react";
import { TimePicker } from "@/components/TimePicker";
afterEach(cleanup);
function Fixture() {
  const [value, setValue] = useState("09:15");
  return (
    <>
      <TimePicker label="From" value={value} onChange={setValue} />
      <output>{value}</output>
    </>
  );
}
it("retains custom minutes, selects dropdown hours and accepts typed 24-hour time", () => {
  render(<Fixture />);
  const input = screen.getByRole("combobox", { name: "From" });
  expect(input).toHaveValue("9:15 AM");
  fireEvent.click(input);
  fireEvent.click(screen.getByRole("option", { name: "12:00 PM" }));
  expect(input).toHaveValue("12:00 PM");
  expect(screen.getByRole("status")).toHaveTextContent("12:00");
  fireEvent.change(input, { target: { value: "17:45" } });
  fireEvent.blur(input);
  expect(input).toHaveValue("5:45 PM");
});
it("supports keyboard selection and reports invalid values", () => {
  render(<Fixture />);
  const input = screen.getByRole("combobox", { name: "From" });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(input).toHaveValue("9:30 AM");
  fireEvent.change(input, { target: { value: "25:00" } });
  fireEvent.blur(input);
  expect(input).toHaveValue("25:00");
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});
