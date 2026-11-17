/** Public audience choices describe the person; privileged roles are never self-assigned here. */
export const CONTACT_AUDIENCES = ["Learner", "Parent / Guardian", "School Representative", "Host / Company Representative", "Sponsor", "Other"] as const;
const accountTypes = ["student", "parent", "school", "host", "sponsor", "other"] as const;
export const SIGNUP_AUDIENCES = CONTACT_AUDIENCES.map((label, index) => ({ label, value: accountTypes[index]! }));
