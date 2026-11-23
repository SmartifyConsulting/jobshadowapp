import { getCareerDescription } from "./career-descriptions";
import { getCareerGuidance } from "./career-guidance";
import { missingCareerFields } from "./career-draft";

/** Use exactly the same saved content and catalogue fallbacks the editor displays. */
export function careerContentForAI(row: Record<string, unknown>) {
  const name = String(row["name"] ?? "");
  const description = getCareerDescription(name, row["description"]);
  const guidance = getCareerGuidance(name, description, row);
  return {
    description,
    school_skills: guidance.skills.school,
    workplace_skills: guidance.skills.workplace,
    ideal_for: guidance.idealFor,
    specialisations: guidance.specialisations,
    subjects: guidance.subjects,
    interpersonal_skills: guidance.interpersonalSkills,
    recommended_courses: guidance.recommendedCourses,
    self_directed_learning: guidance.selfDirectedLearning,
    future_outlook: guidance.futureOutlook,
    ai_exposure_level: guidance.aiExposureLevel,
    ai_exposure_note: guidance.aiExposureNote,
  };
}
export function careersMissingContent(records: Record<string, unknown>[]) {
  return records.filter(
    (row) =>
      String(row["name"] ?? "").trim() && missingCareerFields(careerContentForAI(row)).length > 0,
  );
}
