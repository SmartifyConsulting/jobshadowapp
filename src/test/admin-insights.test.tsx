import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { firstInsight } from "./insights-fixture";
import type { ReactNode } from "react";
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string;
    params?: { slug: string };
    children: ReactNode;
  }) => (
    <a href={params ? to.replace("$slug", params.slug) : to} {...props}>
      {children}
    </a>
  ),
}));

const state = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  writes: [] as Record<string, unknown>[],
  uploads: [] as string[],
  fail: false,
}));
vi.mock("@/lib/dialogs", () => ({ notify: vi.fn(), confirmAction: vi.fn(async () => true) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string) => {
          state.uploads.push(`${bucket}/${path}`);
          return { error: null };
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://example.com/${bucket}/${path}` },
        }),
      }),
    },
    from: () => {
      let action = "read";
      let values: Record<string, unknown> = {};
      const filters: Record<string, unknown> = {};
      const execute = async () => {
        if (state.fail) return { data: null, error: { message: "Save unavailable" } };
        if (action === "read") return { data: state.rows, error: null };
        state.writes.push(values);
        if (action === "delete") {
          state.rows = state.rows.filter((row) => row["id"] !== filters["id"]);
          return { data: [{ id: filters["id"] }], error: null };
        }
        const row = {
          ...(state.rows.find((row) => row["id"] === filters["id"]) ?? {}),
          ...values,
          id: filters["id"] ?? "new-insight",
          updated_at: new Date().toISOString(),
          published_at: values["status"] === "published" ? new Date().toISOString() : null,
        };
        state.rows = [...state.rows.filter((r) => r["id"] !== row.id), row];
        return { data: row, error: null };
      };
      const builder = {
        select: () => builder,
        order: () => builder,
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return builder;
        },
        range: execute,
        single: execute,
        insert: (input: Record<string, unknown>) => {
          action = "insert";
          values = input;
          return builder;
        },
        update: (input: Record<string, unknown>) => {
          action = "update";
          values = input;
          return builder;
        },
        delete: () => {
          action = "delete";
          return builder;
        },
        then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
          execute().then(resolve, reject),
      };
      return builder;
    },
  },
}));
import { AdminInsights } from "@/components/AdminInsights";
beforeEach(() => {
  state.rows = [{ ...firstInsight }];
  state.writes = [];
  state.uploads = [];
  state.fail = false;
});
afterEach(cleanup);
function mount() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AdminInsights />
    </QueryClientProvider>,
  );
}
describe("Admin Insights publishing", () => {
  it("uploads a dropped cover and saves its URL with the draft", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Add Insight" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Cover test" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Content" }), {
      target: { value: "Content creates the description automatically." },
    });
    const file = {
      name: "cover.png",
      size: 8,
      type: "image/png",
      slice: () => ({
        arrayBuffer: async () => Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]).buffer,
      }),
    };
    fireEvent.drop(screen.getByText(/Or drag an image here/).closest(".border-dashed")!, {
      dataTransfer: { files: [file] },
    });
    await screen.findByAltText("Current cover");
    expect(state.uploads[0]).toMatch(/^partner-logos\/insights\/.*\.png$/);
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Draft saved"));
    expect(state.writes[0]?.["cover_image_url"]).toMatch(/^https:\/\/example.com/);
    expect(state.writes[0]?.["excerpt"]).toBe("Content creates the description automatically.");
  });
  it("adds an editable draft and only publishes after the Publish action", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Add Insight" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "New careers article" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Content" }), {
      target: { value: "Draft content for review." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Draft saved"));
    expect(state.writes[0]?.["status"]).toBe("draft");
    expect(screen.getByLabelText("URL Slug")).toHaveValue("new-careers-article");
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Published"));
    expect(state.writes[1]?.["status"]).toBe("published");
  });
  it("preserves unsaved content when a save fails", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Add Insight" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Keep this draft" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Content" }), {
      target: { value: "Never lose these changes." },
    });
    state.fail = true;
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Save unavailable"));
    expect(screen.getByRole("textbox", { name: "Content" })).toHaveValue(
      "Never lose these changes.",
    );
    expect(state.writes).toHaveLength(0);
  });
  it("loads published content for editing and protects its stable URL", async () => {
    mount();
    const edit = await screen.findByRole("button", { name: `Edit ${firstInsight.title}` });
    fireEvent.click(edit);
    expect(screen.getByRole("textbox", { name: "Content" })).toHaveValue(firstInsight.body);
    expect(screen.getByLabelText("URL Slug")).toHaveAttribute("readonly");
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByRole("dialog", { name: "Insight Preview" })).toHaveTextContent(
      "I truly hope this tool helps",
    );
    expect(screen.queryByRole("link", { name: "Share insight by email" })).toBeNull();
    expect(state.writes).toHaveLength(0);
  });
  it("opens the full private blog preview by clicking its title", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: firstInsight.title }));
    expect(screen.getByRole("dialog", { name: "Insight Preview" })).toBeVisible();
    expect(screen.getByRole("complementary", { name: "Insights sidebar" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Recent Posts" })).toBeVisible();
    expect(state.writes).toHaveLength(0);
  });
  it("offers cover upload without a summary or cover URL field", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Add Insight" }));
    expect(screen.queryByLabelText("Summary")).toBeNull();
    expect(screen.queryByLabelText("Cover Image URL")).toBeNull();
    expect(screen.getByLabelText("Upload Cover Image")).toHaveAttribute("type", "file");
    expect(screen.getByText(/Or drag an image here/)).toBeVisible();
  });
});
