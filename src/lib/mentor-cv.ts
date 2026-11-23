export type MentorCvDraft = {
  bio?: string;
  specialties?: string[];
  certifications?: string;
  linkedin_url?: string;
};
export function parseMentorCvDraft(value: unknown): MentorCvDraft {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("The CV could not be read. Your current profile has been preserved.");
  const source = value as Record<string, unknown>,
    result: MentorCvDraft = {};
  for (const key of ["bio", "certifications", "linkedin_url"] as const) {
    if (typeof source[key] === "string" && source[key].trim())
      result[key] = source[key].trim().slice(0, key === "linkedin_url" ? 500 : 5000);
  }
  if (result.linkedin_url) {
    try {
      const url = new URL(result.linkedin_url);
      if (url.protocol !== "https:" || !/^(www\.)?linkedin\.com$/.test(url.hostname))
        delete result.linkedin_url;
    } catch {
      delete result.linkedin_url;
    }
  }
  if (Array.isArray(source["specialties"]))
    result.specialties = [
      ...new Set(
        source["specialties"]
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim().slice(0, 150))
          .filter(Boolean),
      ),
    ].slice(0, 20);
  if (!result.bio && !result.certifications && !result.linkedin_url && !result.specialties?.length)
    throw new Error(
      "No professional details were found in this CV. Your current profile has been preserved.",
    );
  return result;
}
export function ownCvPath(path: string, email: string) {
  const parts = path.split("/");
  return (
    !!email &&
    parts.length === 2 &&
    parts[0] === email &&
    !!parts[1] &&
    !path.includes("\\") &&
    !parts.some((part) => part === "." || part === "..")
  );
}
