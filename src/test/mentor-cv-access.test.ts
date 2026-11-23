import { expect, it, vi } from "vitest";
const extract = vi.hoisted(() => vi.fn().mockResolvedValue({ bio: "Draft" }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      validator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/mentor-cv.server", () => ({ extractMentorCv: extract }));
import { draftMentorProfileFromCv } from "@/lib/mentor-cv.functions";
const invoke = draftMentorProfileFromCv as unknown as (input: unknown) => Promise<unknown>;
it("requires mentor access before attempting CV extraction", async () => {
  await expect(
    invoke({
      data: { storagePath: "self@example.com/cv.pdf" },
      context: {
        userId: "self",
        claims: { email: "self@example.com" },
        supabase: { rpc: vi.fn().mockResolvedValue({ data: false, error: null }) },
      },
    }),
  ).rejects.toThrow("Mentor access");
  expect(extract).not.toHaveBeenCalled();
});
it("passes the authenticated actor and email to the ownership check", async () => {
  await expect(
    invoke({
      data: { storagePath: "self@example.com/cv.pdf" },
      context: {
        userId: "self",
        claims: { email: "self@example.com" },
        supabase: { rpc: vi.fn().mockResolvedValue({ data: true, error: null }) },
      },
    }),
  ).resolves.toEqual({ bio: "Draft" });
  expect(extract).toHaveBeenCalledWith("self@example.com/cv.pdf", "self@example.com", "self");
});
