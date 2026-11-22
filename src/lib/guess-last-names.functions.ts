import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only: for accounts with no last name on file, best-effort guesses one from the email's
 * local part (e.g. john.smith@x.com -> Smith). Never writes to the database — the result is shown
 * as a visibly AI-guessed hint in the admin Users list, to be confirmed/edited by an admin, not
 * treated as fact. Returns null for an id where the email gives no reasonable clue. */
export const guessLastNamesFromEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ entries: z.array(z.object({ id: z.string(), email: z.string(), firstName: z.string().optional() })).max(150) }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    if (!data.entries.length) return { guesses: {} as Record<string, string | null> };

    const { recordAiUsage } = await import("./ai-usage.server");
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const list = data.entries.map((e) => `${e.id}: ${e.email}${e.firstName ? ` (first name on file: ${e.firstName})` : ""}`).join("\n");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6.1-sol",
        instructions:
          "Each line is \"id: email (first name on file: X)\". Look only at the email address's local part (before the @) and guess a plausible surname, e.g. john.smith@x.com -> Smith, j.vandermerwe@x.com -> van der Merwe. If the local part gives no reasonable clue to a surname (generic words, initials only, numbers, no separator from the first name, etc.), use null for that id. Respond with strict JSON only: an object mapping each id to a guessed surname string or null. No other text, no markdown fences.",
        input: list,
      });
      await recordAiUsage({ feature: "guess_last_name", provider: "lovable", model: "openai/gpt-6.1-sol", actorUserId: context.userId, succeeded: true }, res);
      const text = res.output
        .flatMap((o) => (o.type === "message" ? o.content : []))
        .map((c) => (c.type === "output_text" ? c.text : ""))
        .join("")
        .trim()
        .replace(/^```(?:json)?\s*|\s*```$/g, "");
      const parsed = JSON.parse(text) as Record<string, string | null>;
      return { guesses: parsed };
    } catch (e) {
      await recordAiUsage({ feature: "guess_last_name", provider: "lovable", model: "openai/gpt-6.1-sol", actorUserId: context.userId, succeeded: false, errorCode: "provider_error" });
      if (e instanceof GatewayError) throw new Error("The AI helper is unavailable right now. Please try again later.");
      throw e;
    }
  });
