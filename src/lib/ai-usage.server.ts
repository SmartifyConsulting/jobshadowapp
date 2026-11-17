import { buildAiUsageRow, type AiUsageMeta } from "./ai-usage";

export async function recordAiUsage(meta: AiUsageMeta, response?: unknown) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let actor = meta.actorUserId ?? null;
    if (meta.actorUserId === undefined) {
      try {
        const { getRequest } = await import("@tanstack/react-start/server");
        const auth = getRequest().headers.get("authorization");
        if (auth?.startsWith("Bearer ")) {
          const { data } = await supabaseAdmin.auth.getUser(auth.slice(7));
          actor = data.user?.id ?? null;
        }
      } catch { /* Anonymous/background requests do not have an authenticated actor. */ }
    }
    const row = buildAiUsageRow({ ...meta, actorUserId: actor }, response, process.env["AI_USAGE_PRICING_JSON"]);
    const { error } = await supabaseAdmin.from("ai_token_ledger").insert(row).abortSignal(AbortSignal.timeout(3000));
    if (error) console.error("AI usage could not be recorded", error.code);
  } catch { console.error("AI usage logging is unavailable"); }
}

/** Read metadata from a clone: callers receive the original response unchanged. */
export async function trackedAiFetch(meta: Omit<AiUsageMeta, "succeeded">, url: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try { response = await fetch(url, init); }
  catch (error) {
    await recordAiUsage({ ...meta, succeeded: false, errorCode: "network_error" });
    throw error;
  }
  let data: unknown;
  try { data = await response.clone().json(); } catch { data = undefined; }
  await recordAiUsage({ ...meta, succeeded: response.ok, errorCode: response.ok ? null : `http_${response.status}` }, data);
  return response;
}
