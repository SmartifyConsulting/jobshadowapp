export type CsvTargetColumn = { key: string; label: string; field?: "text" | "number" | "date" | "checkbox" | undefined };

/** Asks an LLM to map messy/arbitrary CSV headers onto the known target
 * columns, so an admin can upload a spreadsheet without matching our exact
 * column names. Falls back to exact/loose name matching if no API key is
 * configured or the call fails, so uploads never hard-fail on this step. */
export async function mapCsvHeaders(headers: string[], sampleRows: string[][], targetColumns: CsvTargetColumn[]): Promise<Record<string, string | null>> {
  const key = process.env["OPENAI_API_KEY"];
  if (!key) return fallbackMapping(headers, targetColumns);

  const prompt = `You are mapping columns from an uploaded spreadsheet to a fixed set of database fields for a job-shadow placement system.

Target fields (key: description):
${targetColumns.map((c) => `- ${c.key}: ${c.label}${c.field ? ` (${c.field})` : ""}`).join("\n")}

Spreadsheet headers: ${JSON.stringify(headers)}
Sample data rows (for context only):
${sampleRows.slice(0, 3).map((r) => JSON.stringify(r)).join("\n")}

For each spreadsheet header, choose the single best-matching target field key, or null if nothing matches well. Respond with ONLY a JSON object mapping each exact header string to a target key or null, e.g. {"Company Name": "company", "Random Column": null}.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return fallbackMapping(headers, targetColumns);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallbackMapping(headers, targetColumns);
    const parsed = JSON.parse(content) as Record<string, string | null>;
    const validKeys = new Set(targetColumns.map((c) => c.key));
    const mapping: Record<string, string | null> = {};
    for (const h of headers) {
      const v = parsed[h];
      mapping[h] = typeof v === "string" && validKeys.has(v) ? v : null;
    }
    return mapping;
  } catch {
    return fallbackMapping(headers, targetColumns);
  }
}

function fallbackMapping(headers: string[], targetColumns: CsvTargetColumn[]): Record<string, string | null> {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const byNorm = new Map(targetColumns.map((c) => [norm(c.key), c.key] as const));
  const mapping: Record<string, string | null> = {};
  for (const h of headers) mapping[h] = byNorm.get(norm(h)) ?? null;
  return mapping;
}
