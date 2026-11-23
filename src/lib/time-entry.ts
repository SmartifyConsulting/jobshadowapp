/** Same AM/PM entry pattern as Dial-a-Crew; storage remains 24-hour HH:mm. */
export function parseTimeEntry(text: string): string | null {
  if (!text.trim()) return "";
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(text.trim());
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const period = match[3]?.toLowerCase();
  if (minute > 59 || (period ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (period) hour = (hour % 12) + (period === "pm" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
export function displayTime(value: string): string {
  const normalized = parseTimeEntry(value);
  if (!normalized) return value;
  const [hour, minute] = normalized.split(":").map(Number);
  return `${hour! % 12 || 12}:${String(minute).padStart(2, "0")} ${hour! >= 12 ? "PM" : "AM"}`;
}
