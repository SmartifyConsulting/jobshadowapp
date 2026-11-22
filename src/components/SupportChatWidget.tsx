import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Send } from "lucide-react";
import { askSupportChat } from "@/lib/support-chat.functions";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content: "Hi, I'm Reddy! Ask me anything about booking, hosting, indemnity forms, or how Job Shadow works.",
};

export function SupportChatWidget({ viewerRole }: { viewerRole?: string | undefined }) {
  const ask = useServerFn(askSupportChat);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { reply } = await ask({ data: { history: next.slice(0, -1), message: text, viewerRole } });
      setMessages((cur) => [...cur, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((cur) => [...cur, { role: "assistant", content: (e as Error).message || "Something went wrong — please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="relative w-80 max-w-[calc(100vw-2.5rem)]">
        <div role="dialog" aria-label="Ask JobShadow" className="flex h-[28rem] max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl sm:max-h-[calc(100dvh-3rem)]">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <p className="font-display text-lg uppercase tracking-wide">Ask JobShadow</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close support chat" className="rounded p-1 hover:bg-primary-foreground/10"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div key={i} className={"flex items-start gap-2 " + (m.role === "user" ? "justify-end" : "")}>
                {i === 0 && <img src="/assets/reddy-mascot.webp" alt="Reddy" className="h-24 w-14 shrink-0 self-start object-contain" />}
                <div className={"min-w-0 rounded-lg px-3 py-2 text-sm " + (i === 0 ? "flex-1 bg-muted text-foreground" : m.role === "user" ? "max-w-[85%] bg-primary text-primary-foreground" : "max-w-[85%] bg-muted text-foreground")}>{m.content}</div>
              </div>
            ))}
            {busy && <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Typing…</div>}
          </div>
          <div className="flex items-center gap-2 border-t border-border p-2">
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
              placeholder="Ask a question…" disabled={busy}
              className="flex-1 rounded-full border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50"
            />
            <button onClick={send} disabled={busy || !input.trim()} aria-label="Send" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
        </div>
      )}
      {!open && <button
        onClick={() => setOpen(true)} aria-label="Open support chat"
        className="grid h-16 w-16 place-items-center rounded-full bg-white shadow-warm transition hover:brightness-105"
      >
        <img src="/assets/reddy-mascot.webp" alt="Chat with Reddy" className="h-full w-full rounded-full object-cover" />
      </button>}
    </div>
  );
}
