export const DEV_PERSONAS = [
  {
    id: "9583883b-77c9-4053-9efc-693877f3ea12",
    email: "info@georgiaadams.co.za",
    label: "Georgia Adams — Admin",
  },
  {
    id: "85261e3c-0bd6-497d-8538-09737d718981",
    email: "georgia.adams@smartify.co.za",
    label: "Internet Solutions — Company",
  },
  {
    id: "fdd7e15d-485e-4c34-8ee6-e7dbac38a98f",
    email: "nonastasia@gmail.com",
    label: "Anastasia — Mentor",
  },
  {
    id: "1ec456b0-6280-4732-9393-9e67991ffdfa",
    email: "elenanicolettis@icloud.com",
    label: "Raphy Nicolettis — Scholar",
  },
  {
    id: "ea29d396-45d1-430c-88d7-29d4504d9725",
    email: "elena@moi.co.za",
    label: "Elena Nicolettis — Parent/Guardian",
  },
] as const;

export function isParentSwitchPersona(id: string, email: string | null | undefined) {
  return id === DEV_PERSONAS[4].id && email?.toLowerCase() === DEV_PERSONAS[4].email;
}

// Pointer to the approved, database-flagged sample Accountant placement.
// Its booking submission is blocked by the database; this enables read-only review only.
export const DEMO_ACCOUNTANT_PLACEMENT_ID = 900000115;

export function demoIdentityPassed(id: string, email: string | null | undefined) {
  if (!isSwitchPersona(id, email) || typeof window === "undefined") return false;
  try { return window.sessionStorage.getItem(`jobshadow-demo-identity:${id}`) === "passed"; }
  catch { return false; }
}

export function isSwitchPersona(id: string, email: string | null | undefined) {
  return DEV_PERSONAS.some(
    (persona) => persona.id === id && persona.email === email?.toLowerCase(),
  );
}

export function switchTarget(callerId: string, callerEmail: string, targetEmail: string) {
  if (!isSwitchPersona(callerId, callerEmail))
    throw new Error("This account cannot switch profiles.");
  const target = DEV_PERSONAS.find((persona) => persona.email === targetEmail.toLowerCase());
  if (!target) throw new Error("This profile is not available in the test switcher.");
  return target;
}
