import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InsightContent } from "@/components/InsightContent";
import {
  filterInsights,
  insightSlug,
  validateInsight,
  insightCoverExtension,
  insightExcerpt,
} from "@/lib/insights";
import { insightsSitemap } from "@/lib/insights-sitemap";
import { firstInsight } from "./insights-fixture";
afterEach(cleanup);
describe("Insights content and public data", () => {
  it("generates summaries from content without requiring a separate field", () => {
    expect(insightExcerpt("## A career\n\n**Hello** [read](https://example.com)")).toBe(
      "A career Hello read",
    );
    expect(insightExcerpt("word ".repeat(100)).length).toBeLessThanOrEqual(160);
  });
  it("checks cover size, MIME type and actual image bytes", async () => {
    const file = (type: string, size: number, bytes: number[]) =>
      ({
        type,
        size,
        slice: () => ({ arrayBuffer: async () => Uint8Array.from(bytes).buffer }),
      }) as File;
    await expect(
      insightCoverExtension(file("image/png", 8, [137, 80, 78, 71, 13, 10, 26, 10])),
    ).resolves.toBe("png");
    await expect(insightCoverExtension(file("image/svg+xml", 8, []))).rejects.toThrow(/JPG/);
    await expect(
      insightCoverExtension(file("image/png", 8, [60, 115, 99, 114, 105, 112, 116])),
    ).rejects.toThrow(/valid/);
    await expect(insightCoverExtension(file("image/jpeg", 6 * 1024 * 1024, []))).rejects.toThrow(
      /5 MB/,
    );
  });
  it("renders safe formatting without executing HTML or unsafe links", () => {
    const { container } = render(
      <InsightContent
        body={
          "## Heading\n\n**Bold** and *italic* with [safe](https://example.com).\n\n- One\n- Two\n\n<script>alert(1)</script> [bad](javascript:alert) [protocol-relative](//example.com)"
        }
      />,
    );
    expect(screen.getByRole("heading", { name: "Heading" })).toBeVisible();
    expect(screen.getByRole("list")).toHaveTextContent("OneTwo");
    expect(screen.getByRole("link", { name: "safe" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.queryByRole("link", { name: "bad" })).toBeNull();
    expect(screen.queryByRole("link", { name: "protocol-relative" })).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });
  it("preserves all six original paragraphs and both original references", () => {
    render(<InsightContent body={firstInsight.body} />);
    expect(document.querySelectorAll("p")).toHaveLength(6);
    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      expect.stringContaining("weforum.org/media/"),
    );
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute(
      "href",
      expect.stringContaining("WEF_Future_of_Jobs_Report_2025.pdf"),
    );
    expect(screen.getByText(/I truly hope this tool helps/)).toBeVisible();
  });
  it("validates content and uses stable URL slugs", () => {
    expect(insightSlug("Career & Study: Next Steps!")).toBe("career-study-next-steps");
    expect(validateInsight(firstInsight)).toBeNull();
    expect(validateInsight({ ...firstInsight, body: " " })).toMatch(/content/);
    expect(validateInsight({ ...firstInsight, cover_image_url: "javascript:alert(1)" })).toMatch(
      /HTTPS/,
    );
    expect(validateInsight({ ...firstInsight, cover_image_url: "https://" })).toMatch(/HTTPS/);
    expect(validateInsight({ ...firstInsight, slug: "../admin" })).toMatch(/slug/);
  });
  it("filters by kind, search and real publication month", () => {
    expect(filterInsights([firstInsight], "Elena", "article", "2026-11")).toHaveLength(1);
    expect(filterInsights([firstInsight], "", "news")).toHaveLength(0);
    expect(filterInsights([firstInsight], "", "All", "2026-10")).toHaveLength(0);
  });
  it("only advertises published article URLs in the sitemap", () => {
    const xml = insightsSitemap([
      firstInsight,
      { ...firstInsight, slug: "secret-draft", status: "draft" },
      { ...firstInsight, slug: "archived-post", status: "archived" },
    ]);
    expect(xml).toContain(`/insights/${firstInsight.slug}`);
    expect(xml).not.toContain("secret-draft");
    expect(xml).not.toContain("archived-post");
    expect(xml).not.toContain("/admin");
  });
});
