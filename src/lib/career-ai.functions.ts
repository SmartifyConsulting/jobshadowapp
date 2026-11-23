import { createServerFn } from "@tanstack/react-start";
import { parseCareerDraft } from "./career-draft";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only structured draft; saving remains a separate review action. */
export const draftCareerDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ career: z.string().trim().min(1).max(200) }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { recordAiUsage } = await import("./ai-usage.server");
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    let response: unknown;
    try {
      const res = await generateResponse({
        model: "openai/gpt-6.1-sol",
        instructions:
          "Write career guidance for South African high-school scholars. Return ONLY a JSON object: description (2-3 plain sentences, maximum 60 words, with no specialisation list), ideal_for (1-2 sentences on interests, working preferences and strengths without stereotypes), specialisations (3-8 distinct roles or branches by name), school_skills (3-5 foundations), workplace_skills (3-6 practical skills), subjects (2-5 relevant school subject suggestions), interpersonal_skills (3-6 people/soft skills this career specifically relies on, e.g. client communication, teamwork, negotiation), recommended_courses (3-6 specific tertiary qualifications or short courses that prepare someone for this career, by name), self_directed_learning (3-6 concrete, specific things a scholar can start exploring on their own right now, without enrolling anywhere - e.g. a named free online course, a well-known YouTube channel or creator, an open-source project or community, a practical project idea - since formal tertiary courses may not fully prepare someone for this specific career), future_outlook (2-3 plain sentences on how this career is expected to change - automation, technology, demand - so a scholar knows what to expect, maximum 60 words), ai_exposure_level (exactly one of \"low\", \"medium\" or \"high\" - how much of this job's day-to-day tasks current AI tools can already do), ai_exposure_note (1 plain sentence, maximum 35 words, naming which specific parts of the job AI already handles well and which parts still need a human). All lists must be arrays of concise strings. Subjects, courses and self-directed resources are useful guidance, not guaranteed admission requirements or endorsements. Do not claim regulated eligibility or invented qualifications. No markdown fences.",
        input: `Career: ${data.career}`,
      });
      response = res;
      const text = res.output
        .flatMap((o) => (o.type === "message" ? o.content : []))
        .map((c) => (c.type === "output_text" ? c.text : ""))
        .join("")
        .trim();
      const draft = parseCareerDraft(text);
      await recordAiUsage({ feature: "career_description", provider: "lovable", model: "openai/gpt-6.1-sol", actorUserId: context.userId, succeeded: true }, res);
      return draft;
    } catch (e) {
      await recordAiUsage({ feature: "career_description", provider: "lovable", model: "openai/gpt-6.1-sol", actorUserId: context.userId, succeeded: false, errorCode: response ? "invalid_response" : "provider_error" }, response);
      if (e instanceof GatewayError) throw new Error("The AI helper is unavailable right now. Please try again later.");
      throw e;
    }
  });
