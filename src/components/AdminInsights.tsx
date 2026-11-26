import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { confirmAction, notify } from "@/lib/dialogs";
import {
  insightDate,
  insightSlug,
  insightExcerpt,
  insightCoverExtension,
  validateInsight,
  type Insight,
  type InsightDraft,
} from "@/lib/insights";
import { PublicInsights } from "@/components/PublicInsights";
import { safeInsightImage } from "@/lib/insights";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const emptyDraft = (): InsightDraft => ({
  title: "",
  slug: "",
  kind: "article",
  excerpt: "",
  author_name: "",
  body: "",
  cover_image_url: "",
});
export function AdminInsights() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "insights"],
    queryFn: async () => {
      const rows: Insight[] = [];
      for (let from = 0; ; from += 1000) {
        const r = await supabase
          .from("insights")
          .select("*")
          .order("updated_at", { ascending: false })
          .order("id")
          .range(from, from + 999);
        if (r.error) throw r.error;
        rows.push(...(r.data ?? []));
        if (!r.data || r.data.length < 1000) return rows;
      }
    },
  });
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<Insight | null>(null);
  const [draft, setDraft] = useState<InsightDraft>(emptyDraft);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState("");
  const previewPost: Insight = {
    ...draft,
    excerpt: insightExcerpt(draft.body),
    id: selected?.id ?? "private-preview",
    slug: draft.slug || "preview",
    title: draft.title || "Untitled",
    status: "draft",
    cover_image_url: safeInsightImage(draft.cover_image_url) ? draft.cover_image_url : "",
    published_at: selected?.published_at ?? null,
    created_at: selected?.created_at ?? new Date().toISOString(),
    updated_at: selected?.updated_at ?? new Date().toISOString(),
  };

  const open = (row: Insight | null) => {
    setSelected(row);
    setDraft(
      row
        ? {
            title: row.title,
            slug: row.slug,
            kind: row.kind,
            excerpt: row.excerpt,
            author_name: row.author_name,
            body: row.body,
            cover_image_url: row.cover_image_url,
          }
        : emptyDraft(),
    );
    setError("");
    setSaved("");
    setPreview(false);
    setEditing(true);
  };
  const change = (key: keyof InsightDraft, value: string) => {
    setSaved("");
    setDraft((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "title" &&
      (!previous.slug || previous.slug === insightSlug(previous.title)) &&
      !selected?.published_at
        ? { slug: insightSlug(value) }
        : {}),
    }));
  };
  async function uploadCover(file: File) {
    setUploading(true);
    setError("");
    setSaved("");
    try {
      const extension = await insightCoverExtension(file);
      const path = `insights/${crypto.randomUUID()}.${extension}`;
      const bucket = supabase.storage.from("partner-logos");
      const result = await bucket.upload(path, file, { contentType: file.type, upsert: false });
      if (result.error) throw result.error;
      change("cover_image_url", bucket.getPublicUrl(path).data.publicUrl);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The cover image could not be uploaded. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  }
  async function save(status: string) {
    const problem = validateInsight(draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (
      selected?.status === "published" &&
      status !== "published" &&
      !(await confirmAction(
        "Remove this insight from public view? It will remain available in Admin.",
        { confirmLabel: "Unpublish" },
      ))
    )
      return;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const values = {
        ...draft,
        excerpt: insightExcerpt(draft.body),
        title: draft.title.trim(),
        author_name: draft.author_name.trim(),
        status,
      };
      const r = selected
        ? await supabase
            .from("insights")
            .update(values)
            .eq("id", selected.id)
            .eq("updated_at", selected.updated_at)
            .select()
            .single()
        : await supabase.from("insights").insert(values).select().single();
      if (r.error || !r.data)
        throw new Error(
          r.error?.code === "23505"
            ? "That URL slug is already in use. Choose a different slug."
            : selected && r.error?.code === "PGRST116"
              ? "This insight changed elsewhere. Your input is preserved; reopen the record before saving."
              : (r.error?.message ?? "The insight could not be saved."),
        );
      setSelected(r.data);
      setDraft({
        title: r.data.title,
        slug: r.data.slug,
        kind: r.data.kind,
        excerpt: r.data.excerpt,
        author_name: r.data.author_name,
        body: r.data.body,
        cover_image_url: r.data.cover_image_url,
      });
      setSaved(
        status === "published" ? "Published" : status === "archived" ? "Archived" : "Draft saved",
      );
      await qc.invalidateQueries({ queryKey: ["admin", "insights"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The insight could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(row: Insight) {
    if (
      !(await confirmAction(`Permanently delete the draft “${row.title}”?`, {
        danger: true,
        confirmLabel: "Delete Draft",
      }))
    )
      return;
    setBusy(true);
    setError("");
    try {
      const r = await supabase
        .from("insights")
        .delete()
        .eq("id", row.id)
        .eq("status", "draft")
        .eq("updated_at", row.updated_at)
        .select("id");
      if (r.error || !r.data?.length)
        throw new Error(
          r.error?.message ?? "The draft changed or could not be deleted. Refresh and try again.",
        );
      notify("Draft deleted");
      await qc.invalidateQueries({ queryKey: ["admin", "insights"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete the draft.");
    } finally {
      setBusy(false);
    }
  }
  const button =
    "rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50";
  const secondary = "rounded border border-border px-4 py-2 text-sm disabled:opacity-50";
  const input = "mt-1 w-full border border-input bg-background px-3 py-2 text-sm";
  const rows = (query.data ?? []).filter(
    (row) =>
      (filter === "All" ||
        (filter === "Articles"
          ? row.kind === "article"
          : filter === "News"
            ? row.kind === "news"
            : row.status === filter.toLowerCase())) &&
      [row.title, row.author_name, row.excerpt]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className="min-w-0 bg-ivory p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl">Insights</h1>
        {!editing && (
          <button
            type="button"
            className={button + " inline-flex items-center gap-2"}
            onClick={() => open(null)}
          >
            <Plus className="h-4 w-4" />
            Add Insight
          </button>
        )}
        {editing && (
          <button
            type="button"
            disabled={busy || uploading}
            className={secondary}
            onClick={async () => {
              const changed =
                JSON.stringify(draft) !==
                JSON.stringify(
                  selected
                    ? {
                        title: selected.title,
                        slug: selected.slug,
                        kind: selected.kind,
                        excerpt: selected.excerpt,
                        author_name: selected.author_name,
                        body: selected.body,
                        cover_image_url: selected.cover_image_url,
                      }
                    : emptyDraft(),
                );
              if (
                changed &&
                !(await confirmAction("Leave without saving these edits?", {
                  confirmLabel: "Discard Edits",
                }))
              )
                return;
              setEditing(false);
              setError("");
            }}
          >
            Back to List
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {!editing ? (
        <>
          <div className="my-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {["All", "Articles", "News", "Draft", "Published", "Archived"].map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={
                    "rounded-full border border-border px-3 py-1.5 text-xs " +
                    (filter === value ? "bg-primary text-primary-foreground" : "bg-background")
                  }
                >
                  {value === "Draft" ? "Drafts" : value}
                </button>
              ))}
            </div>
            <input
              aria-label="Search Insights"
              type="search"
              placeholder="Search Insights"
              className="border border-input bg-background px-3 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {query.isError ? (
            <p role="alert">
              Insights could not be loaded.{" "}
              <button type="button" onClick={() => query.refetch()} className="underline">
                Try Again
              </button>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-y border-border">
                    {["Title", "Type", "Author", "Status", "Published", "Actions"].map((title) => (
                      <th key={title} className="px-3 py-2 font-medium">
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {query.isPending ? (
                    <tr>
                      <td colSpan={6} className="p-4">
                        Loading…
                      </td>
                    </tr>
                  ) : rows.length ? (
                    rows.map((row) => (
                      <tr key={row.id} className="border-b border-border">
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            disabled={busy || uploading}
                            className="text-left font-semibold hover:text-primary hover:underline"
                            onClick={() => {
                              open(row);
                              setPreview(true);
                            }}
                          >
                            {row.title}
                          </button>
                        </td>
                        <td className="px-3 py-3 capitalize">{row.kind}</td>
                        <td className="px-3 py-3">{row.author_name || "—"}</td>
                        <td className="px-3 py-3 capitalize">{row.status}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {insightDate(row.published_at) || "—"}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              aria-label={`Edit ${row.title}`}
                              onClick={() => open(row)}
                              disabled={busy || uploading}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {row.status === "draft" && (
                              <button
                                type="button"
                                aria-label={`Delete draft ${row.title}`}
                                disabled={busy || uploading}
                                onClick={() => remove(row)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-4">
                        No insights match this selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(8rem,1fr)]">
            <label className="text-sm">
              Title
              <input
                className={input}
                maxLength={200}
                value={draft.title}
                onChange={(e) => change("title", e.target.value)}
              />
            </label>
            <label className="text-sm">
              Type
              <select
                className={input}
                value={draft.kind}
                onChange={(e) => change("kind", e.target.value)}
              >
                <option value="article">Article</option>
                <option value="news">News</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Author
              <input
                className={input}
                maxLength={150}
                value={draft.author_name}
                onChange={(e) => change("author_name", e.target.value)}
              />
            </label>
            <label className="text-sm">
              URL Slug
              <input
                className={input}
                readOnly={!!selected?.published_at}
                value={draft.slug}
                onChange={(e) => change("slug", e.target.value)}
              />
            </label>
          </div>
          <div
            className="rounded border border-dashed border-border p-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (busy || uploading) return;
              const file = e.dataTransfer.files[0];
              if (file && e.dataTransfer.files.length === 1) void uploadCover(file);
              else setError("Choose one cover image.");
            }}
          >
            <h2 className="text-sm font-bold">Cover Image</h2>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {draft.cover_image_url && (
                <img
                  src={draft.cover_image_url}
                  alt="Current cover"
                  className="h-20 w-36 rounded object-cover"
                />
              )}
              <label className={button + " inline-flex cursor-pointer items-center gap-2"}>
                <Upload className="h-4 w-4" />
                {uploading
                  ? "Uploading…"
                  : draft.cover_image_url
                    ? "Replace Cover Image"
                    : "Upload Cover Image"}
                <input
                  aria-label="Upload Cover Image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={busy || uploading}
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (file) void uploadCover(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {draft.cover_image_url && (
                <button
                  type="button"
                  className={secondary}
                  disabled={busy || uploading}
                  onClick={() => change("cover_image_url", "")}
                >
                  Remove Cover
                </button>
              )}
              <p className="text-xs text-muted-foreground">
                Or drag an image here. JPG, PNG or WebP, up to 5 MB.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Content</span>
            <button
              type="button"
              className="text-sm font-semibold text-primary"
              onClick={() => setPreview(true)}
            >
              Preview
            </button>
          </div>
          {
            <>
              <textarea
                aria-label="Content"
                rows={15}
                maxLength={100000}
                className={input}
                value={draft.body}
                onChange={(e) => change("body", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use ## for headings, **bold**, *italics*, - for lists, and [link text](https://…).
              </p>
            </>
          }
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || uploading}
              className={secondary}
              onClick={() => save("draft")}
            >
              Save Draft
            </button>
            <button
              type="button"
              disabled={busy || uploading}
              className={button}
              onClick={() => save("published")}
            >
              {selected?.status === "published" ? "Update Published Insight" : "Publish"}
            </button>
            {selected && selected.status !== "archived" && (
              <button
                type="button"
                disabled={busy || uploading}
                className={secondary}
                onClick={() => save("archived")}
              >
                Archive
              </button>
            )}
            <span role="status" className="text-sm">
              {busy ? "Saving…" : saved}
            </span>
          </div>
        </div>
      )}
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="max-h-[95dvh] w-[96vw] max-w-[1400px] overflow-y-auto p-0 sm:max-w-[1400px]">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>Insight Preview</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Private preview — changes are not published.
            </p>
          </DialogHeader>
          <div
            aria-label="Insight preview"
            onClickCapture={(e) => {
              if ((e.target as Element).closest("a")) e.preventDefault();
            }}
          >
            <PublicInsights
              key={previewPost.id + String(preview)}
              preview
              post={previewPost}
              posts={[
                previewPost,
                ...(query.data ?? []).filter(
                  (row) => row.status === "published" && row.id !== previewPost.id,
                ),
              ]}
            />
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
