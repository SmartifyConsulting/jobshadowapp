import { afterEach, expect, it, vi } from "vitest";
const usage = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/ai-usage.server", () => ({ recordAiUsage: usage }));
import { generateCareerDraft } from "@/lib/career-ai.server";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("uses OpenAI only, requests missing fields and records one usage entry", async () => {
  vi.stubEnv("OPENAI_API_KEY", "mock-only");
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  interpersonal_skills: ["Teamwork"],
                  description: "Do not overwrite",
                }),
              },
            },
          ],
          usage: { prompt_tokens: 20, completion_tokens: 10 },
        }),
      ),
    );
  vi.stubGlobal("fetch", fetch);
  expect(await generateCareerDraft("Accountant", ["interpersonal_skills"], "admin")).toEqual({
    interpersonal_skills: ["Teamwork"],
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]![0]).toBe("https://api.openai.com/v1/chat/completions");
  const body = JSON.parse(fetch.mock.calls[0]![1].body);
  expect(body.messages[1].content).toContain(
    "ONLY these requested JSON fields: interpersonal_skills",
  );
  expect(usage).toHaveBeenCalledOnce();
  expect(usage.mock.calls[0]![0]).toMatchObject({ provider: "openai", succeeded: true });
});
it("rejects incomplete drafts without retries and records their usage once", async () => {
  vi.stubEnv("OPENAI_API_KEY", "mock-only");
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] })));
  vi.stubGlobal("fetch", fetch);
  await expect(generateCareerDraft("Accountant", ["subjects"], "admin")).rejects.toThrow(
    "preserved",
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(usage).toHaveBeenCalledOnce();
  expect(usage.mock.calls[0]![0]).toMatchObject({
    succeeded: false,
    errorCode: "invalid_response",
  });
});
it("gives a clear configuration error without contacting any provider when the key is missing", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await expect(generateCareerDraft("Accountant", ["subjects"], "admin")).rejects.toThrow(
    "OpenAI API key",
  );
  expect(fetch).not.toHaveBeenCalled();
});
