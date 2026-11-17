export type AiUsageMeta = {
  feature: string; provider: string; model: string;
  actorUserId?: string | null | undefined;
  succeeded: boolean; errorCode?: string | null | undefined;
};
type Rates = { input: number; cached: number; output: number };

// Standard text-token rates, USD / million, checked 18 November 2026.
// https://developers.openai.com/api/docs/models/gpt-4o-mini
// https://developers.openai.com/api/docs/models/gpt-4o
const defaults: Record<string, Rates> = {
  "openai:gpt-4o-mini": { input: 0.15, cached: 0.075, output: 0.6 },
  "openai:gpt-4o": { input: 2.5, cached: 1.25, output: 10 },
};
defaults["openai:gpt-4o-mini-2024-07-18"] = defaults["openai:gpt-4o-mini"]!;
defaults["openai:gpt-4o-2024-08-06"] = defaults["openai:gpt-4o"]!;
defaults["openai:gpt-4o-2024-11-20"] = defaults["openai:gpt-4o"]!;
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const count = (value: unknown): number | null => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;

export function buildAiUsageRow(meta: AiUsageMeta, response: unknown, configuredRates?: string | undefined) {
  const data = object(response), usage = object(data["usage"]);
  const model = typeof data["model"] === "string" ? data["model"] : meta.model;
  const input = count(usage["input_tokens"] ?? usage["prompt_tokens"]);
  const output = count(usage["output_tokens"] ?? usage["completion_tokens"]);
  const details = object(usage["input_tokens_details"] ?? usage["prompt_tokens_details"]);
  const cached = input === null ? null : Math.min(count(details["cached_tokens"]) ?? 0, input);
  const total = count(usage["total_tokens"]) ?? (input !== null && output !== null ? input + output : null);
  let rates: Rates | undefined;
  const requestedKey = `${meta.provider}:${model}`;
  try {
    const config = object(configuredRates ? JSON.parse(configuredRates) : {});
    const candidate = object(config[requestedKey]);
    if ([candidate["input"], candidate["cached"], candidate["output"]].every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0)) rates = candidate as Rates;
  } catch { /* Invalid configuration leaves pricing unavailable or uses a known default. */ }
  // Only recognised model snapshots inherit a standard OpenAI rate.
  rates ??= defaults[requestedKey];
  const providerCost = typeof data["cost_usd"] === "number" && Number.isFinite(data["cost_usd"]) && data["cost_usd"] >= 0 ? data["cost_usd"] : null;
  const estimate = rates && input !== null && output !== null && cached !== null
    ? ((input - cached) * rates.input + cached * rates.cached + output * rates.output) / 1_000_000 : null;
  return {
    actor_user_id: meta.actorUserId ?? null, feature: meta.feature, provider: meta.provider, model,
    request_id: typeof data["id"] === "string" ? data["id"] : null,
    input_tokens: input, cached_input_tokens: cached, output_tokens: output, total_tokens: total,
    cost_usd: providerCost ?? estimate,
    cost_source: providerCost !== null ? "provider" : estimate !== null ? "estimated" : "unavailable",
    input_rate_per_million: estimate !== null ? rates!.input : null,
    cached_rate_per_million: estimate !== null ? rates!.cached : null,
    output_rate_per_million: estimate !== null ? rates!.output : null,
    succeeded: meta.succeeded, error_code: meta.errorCode ?? null,
  };
}
