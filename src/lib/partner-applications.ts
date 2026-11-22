import { z } from "zod";

export const partnerApplicationSchema = z.object({
  applicant_type: z.enum(["mentor", "host"]),
  company: z.string().trim().min(1, "Please enter your company.").max(200),
  first_name: z.string().trim().min(1, "Please enter your first name.").max(100),
  last_name: z.string().trim().min(1, "Please enter your last name.").max(100),
  phone: z.string().trim().regex(/^\+[1-9][0-9]{6,14}$/, "Please enter a mobile number with its country code."),
  message: z.string().trim().max(2000),
});
export type PartnerApplication = {
  id: string; user_id: string; applicant_type: "mentor" | "host"; company: string;
  first_name: string; last_name: string; email: string; phone: string; message: string;
  status: "pending" | "under_review" | "accepted" | "rejected"; created_at: string; reviewed_at: string | null;
};
export const PARTNER_STATUS = { pending: "Pending", under_review: "Under Review", accepted: "Accepted", rejected: "Rejected" } as const;
