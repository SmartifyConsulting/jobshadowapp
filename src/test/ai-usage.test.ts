import { describe, expect, it } from "vitest";
import { buildAiUsageRow } from "@/lib/ai-usage";

const meta = { feature: "support_chat", provider: "openai", model: "gpt-4o-mini", succeeded: true };
describe("AI token accounting", () => {
  it("prices uncached input, cached input and output separately", () => {
    const row = buildAiUsageRow(meta, { model: "gpt-4o-mini-2024-07-18", id: "req-test", usage: { prompt_tokens: 200, prompt_tokens_details: { cached_tokens: 100 }, completion_tokens: 50, total_tokens: 250 } });
    expect(row).toMatchObject({ input_tokens: 200, cached_input_tokens: 100, output_tokens: 50, total_tokens: 250, cost_source: "estimated" });
    expect(row.cost_usd).toBeCloseTo(0.0000525, 10);
  });
  it("preserves unavailable counts and prices as null rather than zero", () => {
    const row = buildAiUsageRow({ ...meta, succeeded: false }, {});
    expect(row.input_tokens).toBeNull(); expect(row.total_tokens).toBeNull(); expect(row.cost_usd).toBeNull();
    expect(row.cost_source).toBe("unavailable");
  });
  it("supports gateway response usage without assuming OpenAI billing rates", () => {
    const row = buildAiUsageRow({ ...meta, provider: "lovable", model: "openai/example" }, { usage: { input_tokens: 50, input_tokens_details: { cached_tokens: 10 }, output_tokens: 5 } });
    expect(row.total_tokens).toBe(55); expect(row.cost_usd).toBeNull();
  });
  it("uses configured rates only for the model actually reported", () => {
    const config = JSON.stringify({ "openai:custom-model": { input: 1, cached: 0.5, output: 2 } });
    expect(buildAiUsageRow(meta, { model: "custom-model", usage: { prompt_tokens: 100, completion_tokens: 10 } }, config).cost_usd).toBeCloseTo(0.00012, 10);
    expect(buildAiUsageRow(meta, { model: "unknown-other-model", usage: { prompt_tokens: 100, completion_tokens: 10 } }, config).cost_usd).toBeNull();
    expect(buildAiUsageRow(meta, { model: "gpt-4o-2099-01-01", usage: { prompt_tokens: 100, completion_tokens: 10 } }).cost_usd).toBeNull();
  });
  it("keeps provider costs distinct and excludes prompt/response contents", () => {
    const row = buildAiUsageRow(meta, { cost_usd: 0.123, usage: { input_tokens: 10, output_tokens: 5 }, choices: [{ message: { content: "PRIVATE CONTENT" } }], prompt: "PRIVATE PROMPT" });
    expect(row.cost_source).toBe("provider"); expect(row.cost_usd).toBe(0.123);
    expect(JSON.stringify(row)).not.toContain("PRIVATE");
  });
});
