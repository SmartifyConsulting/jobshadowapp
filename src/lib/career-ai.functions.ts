import { createServerFn } from "@tanstack/react-start";
import { parseCareerDraft } from "./career-draft";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only: drafts a brief career description; career types inside it are wrapped in **bold**. */
export const draftCareerDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ career: z.string().trim().min(1).max(200) }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { recordAiUsage } = await import("./ai-usage.server");
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const res = await generateResponse({
        model: "openai/gpt-6.1-sol",
        instructions:
          "You write short career descriptions for South African high-school scholars. Write 2-3 plain sentences (max 60 words) describing the career. Then list the main types/specialisations within this career by name only, each wrapped in **double asterisks**, comma separated, with no explanation of each type. Return ONLY a JSON object with keys description (the requested description text), school_skills (3-5 concise school-level foundations), and workplace_skills (3-6 practical workplace skills). Skills must be arrays of strings. School foundations are useful preparation, not mandatory admissions criteria. Do not include personality traits in skills. No markdown fences.",
        input: `Career: ${data.career}`,
      });
      const text = res.output
        .flatMap((o) => (o.type === "message" ? o.content : []))
        .map((c) => (c.type === "output_text" ? c.text : ""))
        .join("")
        .trim();
      const draft = parseCareerDraft(text);
      await recordAiUsage({ feature: "career_description", provider: "lovable", model: "openai/gpt-6.1-sol", actorUserId: context.userId, succeeded: true }, res);
      return draft;
    } catch (e) {
      await recordAiUsage({ feature: "career_description", provider: "lovable", model: "openai/gpt-6.1-sol", actorUserId: context.userId, succeeded: false, errorCode: "provider_error" });
      if (e instanceof GatewayError) throw new Error("The AI helper is unavailable right now. Please try again later.");
      throw e;
    }
  });
