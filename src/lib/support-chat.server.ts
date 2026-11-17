import { SUPPORT_KNOWLEDGE } from "./support-knowledge";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are the Job Shadow support assistant, embedded on jobshadow.co.za. Job Shadow connects
South African high school students with professionals for job-shadowing experiences and 1-hour online interviews.

Answer only from the knowledge base below, which describes how the student/parent, mentor/host, HR admin,
platform admin and school roles are meant to use the platform. Keep answers short, friendly and specific to
the question asked. If something isn't covered by the knowledge base, say you're not sure and suggest they
email info@jobshadow.co.za rather than guessing. Never invent prices, deadlines or policies not in the
knowledge base. If asked about payment, be clear that online payment is still being finalised.

KNOWLEDGE BASE:
${SUPPORT_KNOWLEDGE}`;

/** Answers a support question using the embedded knowledge base. Falls back to a canned
 * "email us" reply if no API key is configured, so the widget never hard-fails. */
export async function answerSupportQuestion(history: ChatMessage[], message: string, viewerRole?: string): Promise<string> {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) return "Support chat isn't available right now — please email info@jobshadow.co.za and we'll help you directly.";

  const roleHint = viewerRole ? `The person asking is currently signed in as: ${viewerRole}.` : "The person asking may not be signed in.";
  const messages = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${roleHint}` },
    ...history.slice(-8),
    { role: "user", content: message },
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.3, messages }),
    });
    if (!res.ok) return "Sorry, I'm having trouble answering right now — please email info@jobshadow.co.za.";
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    return typeof reply === "string" && reply.trim() ? reply.trim() : "Sorry, I'm having trouble answering right now — please email info@jobshadow.co.za.";
  } catch {
    return "Sorry, I'm having trouble answering right now — please email info@jobshadow.co.za.";
  }
}
