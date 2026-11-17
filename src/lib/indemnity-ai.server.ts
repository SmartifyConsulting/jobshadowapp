import { trackedAiFetch } from "./ai-usage.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Downloads an admin-uploaded company indemnity document from storage and asks an LLM to
 * extract its substantive clauses as plain text, so they can be rendered into our own
 * branded indemnity template rather than attempting true format-preserving conversion.
 * Works for PDFs and images via vision input; falls back to a clear error for formats
 * OpenAI can't read directly (e.g. legacy .doc) so the admin can convert and retry. */
export async function extractIndemnityClauses(storagePath: string): Promise<string> {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) throw new Error("AI extraction is not configured (missing OPENAI_API_KEY).");

  const { data: file, error } = await supabaseAdmin.storage.from("company-indemnity").download(storagePath);
  if (error || !file) throw new Error(error?.message ?? "Could not read the uploaded document.");

  const mime = file.type || "application/octet-stream";
  if (!/^(application\/pdf|image\/(png|jpe?g))$/.test(mime)) {
    throw new Error("This file type can't be read automatically. Please upload a PDF, PNG or JPEG.");
  }
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const dataUrl = `data:${mime};base64,${base64}`;

  const prompt = "This is a company's job-shadow indemnity / consent / liability-waiver document. " +
    "Extract its substantive legal clauses as clean plain text (risk acknowledgement, liability waiver, " +
    "photo/media consent, any site-specific rules), preserving meaning and structure but dropping letterhead, " +
    "page numbers and signature-line boilerplate. Respond with ONLY the extracted clause text, no commentary.";

  const content = mime === "application/pdf"
    ? [{ type: "text", text: prompt }, { type: "file", file: { filename: "indemnity.pdf", file_data: dataUrl } }]
    : [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: dataUrl } }];

  const res = await trackedAiFetch({ feature: "indemnity_extraction", provider: "openai", model: "gpt-4o" }, "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o", temperature: 0, messages: [{ role: "user", content }] }),
  });
  if (!res.ok) throw new Error(`AI extraction failed (${res.status}).`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") throw new Error("AI extraction returned no text.");
  return text.trim();
}
