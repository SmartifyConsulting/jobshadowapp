import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Mail, Facebook, Twitter, Linkedin } from "lucide-react";
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
  recipientFirstName: z.string().trim().min(1, "Please enter the recipient's first name").max(100),
  to: z.string().trim().email("Enter a valid email").max(255),
  message: z.string().trim().min(1, "Please add a message").max(800),
});

const DEFAULT_MESSAGE = "Yo bruh,\nI found this lit site that gives you the chance to discover what you wanna do\nwith your life.";

const SHARE_ICONS = [Mail, Facebook, Twitter, Linkedin] as const;

function SendToFriend() {
  const [f, setF] = useState({ recipientFirstName: "", to: "", message: "" });
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
    const body = `Hi ${r.data.recipientFirstName},\n\n${r.data.message}`;
    window.location.href = `mailto:${encodeURIComponent(r.data.to)}?subject=${encodeURIComponent("A friend thinks you'd like Job Shadow")}&body=${encodeURIComponent(body)}`;
  };

  const input = "mt-1 w-full border-b border-current/40 bg-transparent px-1 py-2 text-sm placeholder:text-current/70 outline-none focus:border-primary-foreground";
  const err = (k: string) => errors[k] && <span className="mt-1 block text-xs text-accent">{errors[k]}</span>;

  return (
    <SiteLayout>
      <section className="bg-primary px-5 py-14 text-primary-foreground">
        <div className="mx-auto grid max-w-6xl items-start gap-10 md:grid-cols-2">
          <div>
            <h1 className="font-display text-3xl uppercase leading-tight md:text-4xl">Send To A Friend</h1>
            <p className="mt-4 text-sm text-primary-foreground/80">Know someone who should try a job before they study for it? Tell them about Job Shadow.</p>
            <p className="mt-8 text-xs uppercase tracking-wide opacity-80">Or share it here</p>
            <div className="mt-3 flex gap-3">
              {SHARE_ICONS.map((Icon, i) => (
                <span key={i} className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground text-primary"><Icon className="h-4 w-4" /></span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 p-6">
            <h2 className="font-display text-2xl uppercase">Your Message</h2>
            <form onSubmit={submit} className="mt-6 grid gap-4">
              <label><span className="text-xs uppercase tracking-wide opacity-80">Recipient's first name</span><input className={input} value={f.recipientFirstName} onChange={(e) => setF({ ...f, recipientFirstName: e.target.value })} />{err("recipientFirstName")}</label>
              <label><span className="text-xs uppercase tracking-wide opacity-80">Recipient email</span><input className={input} type="email" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />{err("to")}</label>
              <label><span className="text-xs uppercase tracking-wide opacity-80">Message</span><textarea rows={5} className={input} placeholder={DEFAULT_MESSAGE} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />{err("message")}</label>
              <button className="mt-2 justify-self-start rounded-full bg-cta px-6 py-3 text-sm font-bold uppercase tracking-wide text-cta-foreground">Send</button>
            </form>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
