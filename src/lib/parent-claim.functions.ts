import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// An email address is not proof of ownership. Activation requires a private invitation.
export const claimParentAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().toLowerCase().email().max(255), password: z.string().min(8).max(200) }).parse(d))
  .handler(async () => {
    throw new Error("Parent/guardian access requires a private invitation. If you already have a Parent/Guardian account, please sign in.");
  });
