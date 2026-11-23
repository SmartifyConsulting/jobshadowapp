import { afterEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ rpc: vi.fn(), ai: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mock.rpc } }));
vi.mock("@/lib/ai-usage.server", () => ({ trackedAiFetch: mock.ai }));
import { answerSupportQuestion } from "@/lib/support-chat.server";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it("loads both public career sources into the answer request without sending real AI requests", async () => {
  vi.stubEnv("OPENAI_API_KEY", "mock-only");
  mock.rpc.mockImplementation((name: string) => ({
    abortSignal: () =>
      Promise.resolve({
        data:
          name === "list_public_careers"
            ? [{ name: "Accountant", recommended_courses: ["BCom Accounting"] }]
            : [{ name: "Accountant", description: "Saved overview" }],
        error: null,
      }),
  }));
  mock.ai.mockResolvedValue(
    new Response(JSON.stringify({ choices: [{ message: { content: "Mocked career answer" } }] })),
  );
  expect(await answerSupportQuestion([], "What training does an accountant need?")).toBe(
    "Mocked career answer",
  );
  const request = JSON.parse(mock.ai.mock.calls[0]![2].body);
  expect(request.messages[0].content).toContain("BCom Accounting");
  expect(request.messages[0].content).toContain("Saved overview");
  expect(mock.rpc.mock.calls.map(([name]) => name)).toEqual([
    "get_public_career_guidance",
    "list_public_careers",
    "get_public_career_availability",
  ]);
});
it("tells the model not to invent career facts when public data fails", async () => {
  vi.stubEnv("OPENAI_API_KEY", "mock-only");
  mock.rpc.mockReturnValue({
    abortSignal: () => Promise.resolve({ error: { message: "Unavailable" } }),
  });
  mock.ai.mockResolvedValue(
    new Response(JSON.stringify({ choices: [{ message: { content: "Please try again" } }] })),
  );
  await answerSupportQuestion([], "Accountant subjects?");
  expect(JSON.parse(mock.ai.mock.calls[0]![2].body).messages[0].content).toContain(
    "Do not guess career facts",
  );
});
