import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ insert: vi.fn(), fail: false }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => ({ insert: (row: unknown) => { db.insert(row); return { abortSignal: async () => { if (db.fail) throw new Error("Database unavailable"); return { error: null }; } }; } }) } }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => ({ headers: new Headers() }) }));
import { trackedAiFetch } from "@/lib/ai-usage.server";
const meta = { feature: "support_chat", provider: "openai", model: "gpt-4o-mini" };
beforeEach(() => { vi.clearAllMocks(); db.fail = false; });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("AI metadata logging", () => {
  it("leaves the original response readable and makes no extra AI request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: "gpt-4o-mini", usage: { prompt_tokens: 10, completion_tokens: 2 }, choices: [{ message: { content: "Private reply" } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await trackedAiFetch(meta, "https://example.invalid/mock-ai", { method: "POST", body: "Private prompt" });
    expect((await response.json()).choices[0].message.content).toBe("Private reply");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ input_tokens: 10, output_tokens: 2, succeeded: true }));
    expect(JSON.stringify(db.insert.mock.calls)).not.toContain("Private");
  });
  it("does not break a successful response if logging is unavailable", async () => {
    db.fail = true; vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"result":"ok"}', { status: 200 })));
    const response = await trackedAiFetch(meta, "https://example.invalid/mock-ai", {});
    expect(await response.json()).toEqual({ result: "ok" });
  });
  it("records a network failure with unavailable usage and rethrows it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failed")));
    await expect(trackedAiFetch(meta, "https://example.invalid/mock-ai", {})).rejects.toThrow("Network failed");
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ succeeded: false, error_code: "network_error", input_tokens: null, cost_usd: null }));
  });
});
