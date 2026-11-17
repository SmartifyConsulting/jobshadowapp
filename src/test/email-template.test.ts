import { describe, it, expect } from "vitest";
import { renderEmailHtml, LOGO_URL } from "@/lib/email-template";

describe("branded email", () => {
  it("includes the absolute Job Shadow logo and escapes body text", () => {
    const html = renderEmailHtml({ template: "applicant_thank_you", subject: "JobShadow: confirmed", body: "Hi <b>Sam</b>" });
    expect(html).toContain(LOGO_URL);
    expect(LOGO_URL.startsWith("https://jobshadow.co.za/")).toBe(true);
    expect(html).toContain("&lt;b&gt;Sam");
    expect(html).toContain("https://jobshadow.co.za/my-account");
  });
});
