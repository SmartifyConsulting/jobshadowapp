import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ChevronDown, Mail, Facebook, Twitter, Linkedin } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/send-to-a-friend")({
  head: () => ({
    meta: [
      { title: "Send To A Friend — Job Shadow" },
      { name: "description", content: "Share Job Shadow with a friend by email or WhatsApp." },
      { property: "og:title", content: "Send To A Friend — Job Shadow" },
      { property: "og:description", content: "Tell a friend about Job Shadow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SendToFriend,
});

const schema = z.object({
  yourName: z.string().trim().min(1, "Please enter your name").max(100),
  yourEmail: z.string().trim().email("Enter a valid email").max(255),
  to: z.string().trim().email("Enter a valid email").max(255),
  message: z.string().trim().min(1, "Please add a message").max(800),
});

const DEFAULT_MESSAGE = "Yo bruh,\nI found this lit site that gives you the chance to discover what you wanna do\nwith your life.";

const SHARE_ICONS = [Mail, Facebook, Twitter, Linkedin] as const;

function SendToFriend() {
  const [f, setF] = useState({ yourName: "", yourEmail: "", to: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...f, message: f.message || DEFAULT_MESSAGE };
    const r = schema.safeParse(data);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    window.location.href = `mailto:${encodeURIComponent(r.data.to)}?subject=${encodeURIComponent(`${r.data.yourName} thinks you'd like Job Shadow`)}&body=${encodeURIComponent(r.data.message)}`;
  };

  const input = "mt-1 w-full border-b border-primary-foreground/40 bg-transparent px-1 py-2 text-sm placeholder:text-primary-foreground/70 outline-none focus:border-primary-foreground";
  const err = (k: string) => errors[k] && <span className="mt-1 block text-xs text-cta">{errors[k]}</span>;

  return (
    <SiteLayout>
      <div className="bg-teal text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <ChevronDown className="h-6 w-6" />
          <span className="font-display text-2xl uppercase">Send To A Friend</span>
        </div>
      </div>
      <section className="bg-teal px-5 pb-20 pt-10 text-primary-foreground">
        <form onSubmit={submit} className="mx-auto max-w-5xl">
          <p className="text-sm">How do you want to send this message?</p>
          <div className="mt-3 flex gap-3">
            {SHARE_ICONS.map((Icon, i) => (
              <span key={i} className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground text-teal">
                <Icon className="h-4 w-4" />
              </span>
            ))}
          </div>
          <div className="mt-10 grid gap-6 border-b border-primary-foreground/40 pb-6 sm:grid-cols-3">
            <label><span className="text-xs uppercase tracking-wide opacity-80">Your name</span><input className={input} value={f.yourName} onChange={(e) => setF({ ...f, yourName: e.target.value })} />{err("yourName")}</label>
            <label><span className="text-xs uppercase tracking-wide opacity-80">Your email</span><input className={input} type="email" value={f.yourEmail} onChange={(e) => setF({ ...f, yourEmail: e.target.value })} />{err("yourEmail")}</label>
            <label><span className="text-xs uppercase tracking-wide opacity-80">Recipient email</span><input className={input} type="email" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />{err("to")}</label>
          </div>
          <textarea
            rows={5}
            className="mt-8 w-full rounded-sm border border-primary-foreground/40 bg-transparent p-4 text-sm outline-none placeholder:text-primary-foreground/70 focus:border-primary-foreground"
            placeholder={DEFAULT_MESSAGE}
            value={f.message}
            onChange={(e) => setF({ ...f, message: e.target.value })}
          />
          {err("message")}
          <button className="mt-8 bg-primary px-8 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-primary-foreground">Send</button>
        </form>
      </section>
    </SiteLayout>
  );
}
