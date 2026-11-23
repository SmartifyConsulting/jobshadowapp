import { CAREER_DRAFT_FIELDS, parseCareerDraft } from "./career-draft";
import { recordAiUsage } from "./ai-usage.server";

const INSTRUCTIONS =
  'Write career guidance for South African high-school scholars. Return ONLY a JSON object: description (2-3 plain sentences, maximum 60 words, with no specialisation list), ideal_for (1-2 sentences on interests, working preferences and strengths without stereotypes), specialisations (3-8 distinct roles or branches by name), school_skills (3-5 foundations), workplace_skills (3-6 practical skills), subjects (2-5 relevant school subject suggestions), interpersonal_skills (3-6 people/soft skills this career specifically relies on, e.g. client communication, teamwork, negotiation), recommended_courses (3-6 specific tertiary qualifications or short courses that prepare someone for this career, by name), self_directed_learning (3-6 concrete, specific things a scholar can start exploring on their own right now, without enrolling anywhere - e.g. a named free online course, a well-known YouTube channel or creator, an open-source project or community, a practical project idea - since formal tertiary courses may not fully prepare someone for this specific career), future_outlook (2-3 plain sentences on how this career is expected to change - automation, technology, demand - so a scholar knows what to expect, maximum 60 words), ai_exposure_level (exactly one of "low", "medium" or "high" - how much of this job\'s day-to-day tasks current AI tools can already do), ai_exposure_note (1 plain sentence, maximum 35 words, naming which specific parts of the job AI already handles well and which parts still need a human). All lists must be arrays of concise strings. Subjects, courses and self-directed resources are useful guidance, not guaranteed admission requirements or endorsements. Do not claim regulated eligibility or invented qualifications. No markdown fences.';

/** OpenAI only. One usage entry per request, including incomplete drafts; no automatic retries. */
export async function generateCareerDraft(
  career: string,
  fields: (typeof CAREER_DRAFT_FIELDS)[number][],
  actorUserId: string,
) {
  const key = process.env["OPENAI_API_KEY"];
  if (!key)
    throw new Error("Career AI is not configured. Add the OpenAI API key in the server settings.");
  let response: unknown;
  let succeeded = false;
  let errorCode = "provider_error";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        max_tokens: 3500,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: INSTRUCTIONS },
          {
            role: "user",
            content:
              "Career: " +
              career +
              "\nGenerate ONLY these requested JSON fields: " +
              fields.join(", ") +
              ". Omit all other fields; they already have content and must not be regenerated.",
          },
        ],
      }),
    });
    response = await res.json();
    if (!res.ok)
      throw new Error(
        res.status === 429
          ? "The OpenAI service limit was reached. Please try again later."
          : "The OpenAI helper is unavailable. Please try again later.",
      );
    errorCode = "invalid_response";
    const content =
      (response as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message
        ?.content ?? "";
    const draft = parseCareerDraft(content, fields);
    succeeded = true;
    return draft;
  } catch (error) {
    if (error instanceof Error && /timeout|abort/i.test(error.name))
      throw new Error(
        "AI generation took too long. Your existing content has been preserved. Please try again.",
      );
    throw error;
  } finally {
    await recordAiUsage(
      {
        feature: "career_description",
        provider: "openai",
        model: "gpt-4o-mini",
        actorUserId,
        succeeded,
        errorCode: succeeded ? null : errorCode,
      },
      response,
    );
  }
}
