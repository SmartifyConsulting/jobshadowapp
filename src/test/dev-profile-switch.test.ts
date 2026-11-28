import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEV_PERSONAS, isSwitchPersona, isParentSwitchPersona, switchTarget } from "@/lib/dev-personas";
const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  generateLink: vi.fn(),
  verifyOtp: vi.fn(),
  header: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (fn: unknown) => fn,
    };
    return builder;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({ setResponseHeader: mocks.header }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    auth: { admin: { getUserById: mocks.getUserById, generateLink: mocks.generateLink } },
  },
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { verifyOtp: mocks.verifyOtp } }),
}));
import { switchDevPersona } from "@/lib/dev-account-switch.functions";
const invoke = switchDevPersona as unknown as (input: {
  context: { userId: string; claims: { email: string } };
  data: { email: string };
}) => Promise<unknown>;
const caller = DEV_PERSONAS[0];
const target = DEV_PERSONAS[3];
const request = (
  userId: string = caller.id,
  email: string = caller.email,
  targetEmail: string = target.email,
) => ({ context: { userId, claims: { email } }, data: { email: targetEmail } });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUserById.mockImplementation(async (id: string) => ({
    data: { user: { ...DEV_PERSONAS.find((p) => p.id === id), email_confirmed_at: "2026-01-01" } },
    error: null,
  }));
  mocks.generateLink.mockResolvedValue({
    data: { user: { id: target.id }, properties: { hashed_token: "mock-single-use-token" } },
    error: null,
  });
  mocks.verifyOtp.mockResolvedValue({
    data: {
      user: { id: target.id },
      session: { access_token: "mock-access", refresh_token: "mock-refresh" },
    },
    error: null,
  });
});
describe("isolated five-profile switcher", () => {
  it("allows only exact account IDs and emails, including each allowed pair", () => {
    expect(DEV_PERSONAS).toHaveLength(5);
    for (const from of DEV_PERSONAS)
      for (const to of DEV_PERSONAS) expect(switchTarget(from.id, from.email, to.email)).toBe(to);
    expect(isSwitchPersona("other", caller.email)).toBe(false);
    expect(isParentSwitchPersona(DEV_PERSONAS[4].id, "elena@moi.co.za")).toBe(true);
    expect(isParentSwitchPersona("other", "elena@moi.co.za")).toBe(false);
  });
  it.each([
    request("unrelated", "other@example.com"),
    request("94343b17-15ba-4666-9104-c8cb4077bd14", "elena@jobshadow.co.za"),
    request("unrelated", caller.email),
    request(caller.id, "other@example.com"),
    request(caller.id, caller.email, "other@example.com"),
  ])("rejects unauthorised callers and targets before privileged auth calls", async (input) => {
    await expect(invoke(input)).rejects.toThrow();
    expect(mocks.getUserById).not.toHaveBeenCalled();
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });
  it("verifies current account identity again and denies changed emails", async () => {
    mocks.getUserById.mockResolvedValue({
      data: {
        user: { id: caller.id, email: "changed@example.com", email_confirmed_at: "2026-01-01" },
      },
      error: null,
    });
    await expect(invoke(request())).rejects.toThrow();
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });
  it("denies a banned caller", async () => {
    mocks.getUserById.mockImplementation(async (id: string) => ({
      data: {
        user: {
          ...DEV_PERSONAS.find((p) => p.id === id),
          email_confirmed_at: "2026-01-01",
          banned_until: id === caller.id ? "2999-01-01" : undefined,
        },
      },
      error: null,
    }));
    await expect(invoke(request())).rejects.toThrow();
    expect(mocks.generateLink).not.toHaveBeenCalled();
  });
  it("creates and consumes a one-use token on the server without creating users or changing roles", async () => {
    await expect(invoke(request())).resolves.toEqual({
      access_token: "mock-access",
      refresh_token: "mock-refresh",
    });
    expect(mocks.generateLink).toHaveBeenCalledWith({ type: "magiclink", email: target.email });
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      type: "magiclink",
      token_hash: "mock-single-use-token",
    });
    expect(mocks.header).toHaveBeenCalledWith("Cache-Control", "no-store");
  });
  it("never returns session secrets if the verified user is not the requested account", async () => {
    mocks.verifyOtp.mockResolvedValue({
      data: { user: { id: caller.id }, session: { access_token: "wrong", refresh_token: "wrong" } },
      error: null,
    });
    await expect(invoke(request())).rejects.toThrow("Unable to switch profile");
  });
});
