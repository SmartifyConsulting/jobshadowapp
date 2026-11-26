import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({
    to,
    children,
    params,
    ...props
  }: {
    to: string;
    children: ReactNode;
    params?: { slug: string };
  }) => (
    <a href={params ? to.replace("$slug", params.slug) : to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/SiteLayout", () => ({
  SiteLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
import { PublicInsights } from "@/components/PublicInsights";
import { firstInsight } from "./insights-fixture";
afterEach(cleanup);

describe("Insights reference layout", () => {
  it("lists later published news and keeps the original article bookmark", () => {
    const news = {
      ...firstInsight,
      id: "new-news",
      slug: "new-mentoring-programme",
      title: "New Mentoring Programme",
      kind: "news",
    };
    render(<PublicInsights post={news} posts={[news, firstInsight]} />);
    expect(screen.getByRole("heading", { name: "New Mentoring Programme" })).toBeVisible();
    expect(document.getElementById("blog-1")).toHaveAttribute(
      "href",
      `/insights/${firstInsight.slug}`,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Articles/ }));
    expect(screen.queryByRole("heading", { name: "New Mentoring Programme" })).toBeNull();
    expect(screen.getByRole("heading", { name: firstInsight.title })).toBeVisible();
  });
  it("keeps the full article, references and sidebar sections", () => {
    render(<PublicInsights post={firstInsight} posts={[firstInsight]} />);
    expect(screen.getByRole("complementary", { name: "Insights sidebar" })).toBeVisible();
    for (const title of ["Recent Posts", "Categories", "Archives", "Tags", "Related Reading"]) {
      expect(screen.getByRole("heading", { name: title })).toBeVisible();
    }
    expect(screen.getByRole("link", { name: /^1$/ })).toHaveAttribute(
      "href",
      expect.stringContaining("weforum.org"),
    );
    expect(screen.getByRole("link", { name: /^2$/ })).toHaveAttribute(
      "href",
      expect.stringContaining(".pdf"),
    );
    expect(screen.getByText(/I truly hope this tool helps/)).toBeVisible();
  });
  it("filters honestly and returns to the article from search, categories and tags", () => {
    render(<PublicInsights post={firstInsight} posts={[firstInsight]} />);
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
    expect(screen.getByRole("button", { name: "Mentoring" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
