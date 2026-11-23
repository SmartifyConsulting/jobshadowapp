import { careerKey } from "./career-skills";

export type MentorPlacement = {
  company?: string | null; career?: string | null; mentor_name?: string | null;
  mentor_email?: string | null; active?: boolean; dates?: string | null;
  arrival_time?: string | null; collection_time?: string | null;
};

function minutes(value?: string | null) {
  const match = value?.trim().match(/^(\d{1,2})[:h](\d{2})\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || (match[3] ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (match[3]) hour = hour % 12 + (/pm/i.test(match[3]) ? 12 : 0);
  return hour * 60 + minute;
}

export function hasPlacementTimes(placement: MentorPlacement) {
  const start = minutes(placement.arrival_time), end = minutes(placement.collection_time);
  return start !== null && end !== null && end > start;
}

export function mentorAvailability(rows: MentorPlacement[], today = new Date()) {
  const result = new Map<string, { total: number; available: number }>();
  const groups = new Map<string, Map<string, boolean>>();
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (const row of rows) {
    const career = careerKey(row.career ?? "");
    if (!career) continue;
    const person = careerKey(row.mentor_name ?? "") || row.mentor_email?.split(/[,;]/)[0]?.trim().toLowerCase();
    if (!person) continue;
    const identity = careerKey(row.company ?? "") + ":" + person;
    const mentors = groups.get(career) ?? new Map<string, boolean>();
    const futureDate = (row.dates ?? "").split(",").some((value) => {
      const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!match) return false;
      const month = Number(match[1]), date = Number(match[2]), year = Number(match[3]);
      const parsed = new Date(year, month - 1, date);
      return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === date && parsed >= day;
    });
    mentors.set(identity, (mentors.get(identity) ?? false) || (row.active === true && futureDate && hasPlacementTimes(row)));
    groups.set(career, mentors);
  }
  groups.forEach((mentors, career) => result.set(career, { total: mentors.size, available: [...mentors.values()].filter(Boolean).length }));
  return result;
}
