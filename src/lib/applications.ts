import { useEffect, useState } from "react";
import type { Status } from "./data";

export interface Application {
  id: string;
  createdAt: string;
  status: Status;
  scholar: { fullName: string; email: string; phone: string; grade: string; school: string; city: string; province: string };
  guardian: { name: string; email: string; phone: string; relationship: string; emergencyName: string; emergencyPhone: string; consent: boolean };
  shadow: { role: string; format: "In-person full-day" | "1-hour digital interview"; months: string[] };
  motivation: { why: string; questions: string };
  host?: string;
  date?: string;
}

const KEY = "jobshadow.applications";

export const DEMO: Application[] = [
  {
    id: "JS-2026-0412", createdAt: "2026-08-14", status: "Date Confirmed",
    scholar: { fullName: "Thandiwe Mokoena", email: "thandi@example.com", phone: "082 555 0101", grade: "Grade 11", school: "Pretoria High School for Girls", city: "Pretoria", province: "Gauteng" },
    guardian: { name: "Lerato Mokoena", email: "lerato@example.com", phone: "082 555 0102", relationship: "Mother", emergencyName: "Sipho Mokoena", emergencyPhone: "083 555 0103", consent: true },
    shadow: { role: "Civil Engineer", format: "In-person full-day", months: ["October"] },
    motivation: { why: "I love maths and want to see how bridges are designed.", questions: "What does a normal day on site look like?" },
    host: "Aurecon — Centurion office", date: "2026-10-29",
  },
  {
    id: "JS-2026-0377", createdAt: "2026-07-02", status: "Completed",
    scholar: { fullName: "Thandiwe Mokoena", email: "thandi@example.com", phone: "082 555 0101", grade: "Grade 11", school: "Pretoria High School for Girls", city: "Pretoria", province: "Gauteng" },
    guardian: { name: "Lerato Mokoena", email: "lerato@example.com", phone: "082 555 0102", relationship: "Mother", emergencyName: "Sipho Mokoena", emergencyPhone: "083 555 0103", consent: true },
    shadow: { role: "Software Developer", format: "1-hour digital interview", months: ["July"] },
    motivation: { why: "Curious about tech careers.", questions: "Do I need a degree?" },
    host: "Takealot — Engineering team", date: "2026-07-18",
  },
];

export function useApplications() {
  const [apps, setApps] = useState<Application[]>(DEMO);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]") as Application[];
      setApps([...saved, ...DEMO]);
    } catch { /* ignore */ }
  }, []);
  return apps;
}

export function saveApplication(app: Application) {
  const saved = JSON.parse(localStorage.getItem(KEY) || "[]") as Application[];
  localStorage.setItem(KEY, JSON.stringify([app, ...saved]));
}
