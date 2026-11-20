import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/admin-export";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
type Notice = { id: string; subject: string; body: string; created_at: string; read_at: string | null };

export function NotificationInbox({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState<string | null>(null), [error, setError] = useState("");
  const client = useQueryClient();
  const messages = useQuery({ queryKey: ["my-notifications", userId], refetchInterval: 60_000, queryFn: async () => await fetchAllRows(async (from, to) => { const result = await supabase.rpc("get_my_notifications").range(from, to); if (result.error) throw result.error; return result.data ?? []; }) as Notice[] });
  const unread = (messages.data ?? []).filter((notice) => !notice.read_at).length;
  async function update(id: string, action: "read" | "unread" | "delete") {
    setBusy(id); setError("");
    try { const result = await supabase.rpc("set_my_notification_state", { _notification: id, _action: action }); if (result.error) throw result.error; await client.invalidateQueries({ queryKey: ["my-notifications", userId] }); }
    catch { setError("The message could not be updated. Please try again."); }
    finally { setBusy(null); }
  }
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label={unread ? `Notifications: ${unread} unread` : "Notifications"} className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-foreground text-primary transition hover:bg-accent"><Mail className="h-4 w-4" />{unread > 0 && <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{unread > 99 ? "99+" : unread}</span>}</button>
    <Sheet open={open} onOpenChange={setOpen}><SheetContent className="w-full overflow-y-auto bg-ivory sm:max-w-lg"><SheetHeader><SheetTitle>Messages & Notifications</SheetTitle><SheetDescription>{unread} unread {unread === 1 ? "message" : "messages"}</SheetDescription></SheetHeader>
      {error && <p role="alert" className="my-3 text-sm text-destructive">{error}</p>}
      {messages.isPending ? <p className="mt-5 text-sm">Loading messages…</p> : messages.error ? <div className="mt-5"><p role="alert" className="text-sm text-destructive">Unable to load your messages.</p><button className="mt-2 text-sm underline" onClick={() => void messages.refetch()}>Try again</button></div> : !messages.data?.length ? <p className="mt-5 text-sm text-muted-foreground">You have no messages.</p> : <div className="mt-5 divide-y divide-border">{messages.data.map((notice) => <article key={notice.id} className="py-4"><details onToggle={(event) => { if (event.currentTarget.open && !notice.read_at && !busy) void update(notice.id, "read"); }}><summary className="cursor-pointer list-none"><div className="flex items-start justify-between gap-3"><h3 className={"text-sm " + (notice.read_at ? "font-medium" : "font-bold")}>{notice.subject}</h3>{!notice.read_at && <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Unread</span>}</div><time className="mt-1 block text-xs text-muted-foreground" dateTime={notice.created_at}>{new Date(notice.created_at).toLocaleString("en-ZA")}</time></summary><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{notice.body}</p></details><div className="mt-3 flex gap-4"><button disabled={busy === notice.id} onClick={() => void update(notice.id, notice.read_at ? "unread" : "read")} className="flex items-center gap-1 text-xs text-primary disabled:opacity-50"><Check className="h-3.5 w-3.5" />{notice.read_at ? "Mark as unread" : "Mark as read"}</button><button disabled={busy === notice.id} onClick={() => void update(notice.id, "delete")} className="flex items-center gap-1 text-xs text-destructive disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Delete</button></div></article>)}</div>}
    </SheetContent></Sheet>
  </>;
}
