import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => <a href={to} {...props}>{children}</a>,
}));
vi.mock("@/components/SiteLayout", () => ({
  SiteLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
import { Route } from "@/routes/blogs";
afterEach(cleanup);

describe("Insights reference layout", () => {
  it("keeps the full article, references and sidebar sections", () => {
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    expect(screen.getByRole("complementary", { name: "Insights sidebar" })).toBeVisible();
    for (const title of ["Recent Posts", "Categories", "Archives", "Tags", "Related Reading"]) {
      expect(screen.getByRole("heading", { name: title })).toBeVisible();
    }
    expect(screen.getByRole("link", { name: /Reference 1/ })).toHaveAttribute("href", expect.stringContaining("weforum.org"));
    expect(screen.getByRole("link", { name: /Reference 2/ })).toHaveAttribute("href", expect.stringContaining(".pdf"));
    expect(screen.getByText(/I truly hope this tool helps/)).toBeVisible();
  });
  it("filters honestly and returns to the article from search, categories and tags", () => {
    const Page = Route.options.component as () => React.JSX.Element;
    render(<Page />);
    const heading = /Before They Choose a Career/;
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "no such article" } });
    expect(screen.queryByRole("heading", { name: heading })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("No insights match");
    fireEvent.click(screen.getByRole("button", { name: "View All Insights" }));
    expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /^News/ }));
    expect(screen.getByRole("status")).toHaveTextContent("No insights match");
    fireEvent.click(screen.getByRole("button", { name: "Mentoring" }));
    expect(screen.getByRole("heading", { name: heading })).toBeVisible();
    expect(screen.getByRole("searchbox")).toHaveValue("Mentoring");
  });
});
