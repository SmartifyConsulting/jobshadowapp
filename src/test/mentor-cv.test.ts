import { afterEach, expect, it, vi } from "vitest";
const download = vi.hoisted(() => vi.fn());
const usage = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { storage: { from: () => ({ download }) } },
}));
vi.mock("@/lib/ai-usage.server", () => ({ recordAiUsage: usage }));
import { extractMentorCv } from "@/lib/mentor-cv.server";
import { ownCvPath, parseMentorCvDraft } from "@/lib/mentor-cv";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it("rejects another person's CV and traversal before downloading or billing", async () => {
  expect(ownCvPath("me@example.com/../other.pdf", "me@example.com")).toBe(false);
  await expect(extractMentorCv("other@example.com/cv.pdf", "me@example.com", "me")).rejects.toThrow(
    "own uploaded CV",
  );
  expect(download).not.toHaveBeenCalled();
  expect(usage).not.toHaveBeenCalled();
});
it("reads a synthetic PDF with OpenAI only and returns allowed profile fields", async () => {
  vi.stubEnv("OPENAI_API_KEY", "mock-only");
  download.mockResolvedValue({
    data: { size: 20, arrayBuffer: async () => Buffer.from("%PDF-synthetic fixture") },
    error: null,
  });
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  bio: "I develop software.",
                  specialties: ["Coding", "Coding"],
                  certifications: "BSc",
                  linkedin_url: "https://www.linkedin.com/in/example",
                  email: "private@example.com",
                  role: "admin",
                }),
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 10 },
        }),
      ),
    );
  vi.stubGlobal("fetch", fetch);
  expect(await extractMentorCv("me@example.com/cv.pdf", "me@example.com", "me")).toEqual({
    bio: "I develop software.",
    specialties: ["Coding"],
    certifications: "BSc",
    linkedin_url: "https://www.linkedin.com/in/example",
  });
  expect(fetch.mock.calls[0]![0]).toBe("https://api.openai.com/v1/chat/completions");
  expect(JSON.parse(fetch.mock.calls[0]![1].body).store).toBe(false);
  expect(usage).toHaveBeenCalledOnce();
  expect(usage.mock.calls[0]![0]).toMatchObject({ actorUserId: "me", succeeded: true });
});
it("rejects unsupported CVs, malformed files and empty AI results", async () => {
  vi.stubEnv("OPENAI_API_KEY", "mock-only");
  await expect(extractMentorCv("me@example.com/cv.docx", "me@example.com", "me")).rejects.toThrow(
    "PDF",
  );
  download.mockResolvedValue({
    data: { size: 5, arrayBuffer: async () => Buffer.from("wrong") },
    error: null,
  });
  await expect(extractMentorCv("me@example.com/cv.pdf", "me@example.com", "me")).rejects.toThrow(
    "valid PDF",
  );
  expect(usage).not.toHaveBeenCalled();
  expect(() => parseMentorCvDraft({})).toThrow("preserved");
  expect(parseMentorCvDraft({ bio: "Bio", linkedin_url: "javascript:alert(1)" })).toEqual({
    bio: "Bio",
  });
});
