import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/components/SiteLayout", () => ({ SiteLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>, useSiteSession: () => ({ data: { user: null } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/support-chat.functions", () => ({ askSupportChat: vi.fn() }));
import { Route } from "@/routes/roles";
import { SupportChatWidget } from "@/components/SupportChatWidget";
afterEach(cleanup);
describe("Career guidance and chat placement", () => {
  it("shows suitability guidance only when a career is expanded", () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
    client.setQueryData(["placements"], []); client.setQueryData(["no-availability-message"], null);
    const Page = Route.options.component as () => React.JSX.Element;
    render(<QueryClientProvider client={client}><Page /></QueryClientProvider>);
    expect(screen.queryByText("Ideal for:")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Accountant").closest("button")!);
    expect(screen.getByText("Ideal for:")).toBeVisible();
    expect(screen.getByText(/People who enjoy numbers, organised records/)).toBeVisible();
    fireEvent.click(screen.getByText("Accountant").closest("button")!);
    expect(screen.queryByText("Ideal for:")).not.toBeInTheDocument();
    client.clear();
  });
  it("places Reddy inside the chat dialog beside the opening message", () => {
    render(<SupportChatWidget />);
    fireEvent.click(screen.getByRole("button", { name: "Open support chat" }));
    const chat = screen.getByRole("dialog", { name: "Ask JobShadow" });
    expect(within(chat).getByRole("img", { name: "Reddy" })).toBeVisible();
    expect(within(chat).getByText(/Hi, I'm Reddy/)).toBeVisible();
    fireEvent.click(within(chat).getByRole("button", { name: "Close support chat" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
