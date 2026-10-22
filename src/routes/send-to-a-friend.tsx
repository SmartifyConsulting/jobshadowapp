import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Mail, MessageCircle, Send } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/SiteLayout";

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

type Method = "email" | "whatsapp";
const base = z.object({
  yourName: z.string().trim().min(1, "Please enter your name").max(100),
  friendName: z.string().trim().min(1, "Please enter your friend's name").max(100),
  message: z.string().trim().min(1, "Please add a message").max(800),
});
const emailSchema = base.extend({ to: z.string().trim().email("Enter a valid email").max(255) });
const waSchema = base.extend({ to: z.string().trim().regex(/^\+?[0-9 ]{9,15}$/, "Enter a valid cellphone number") });

function SendToFriend() {
  const [method, setMethod] = useState<Method>("email");
  const [f, setF] = useState({ yourName: "", friendName: "", to: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const defaultMsg = (friend: string, me: string) =>
    `Hi ${friend || "there"}, I found Job Shadow – you can spend a day with a professional (or do a one-hour digital interview) before choosing what to study. Check it out: ${typeof window !== "undefined" ? window.location.origin : "https://jobshadow.co.za"}${me ? `\n\n– ${me}` : ""}`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...f, message: f.message || defaultMsg(f.friendName, f.yourName) };
    const r = (method === "email" ? emailSchema : waSchema).safeParse(data);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    if (method === "email") {
      window.location.href = `mailto:${encodeURIComponent(r.data.to)}?subject=${encodeURIComponent(`${r.data.yourName} thinks you'd like Job Shadow`)}&body=${encodeURIComponent(r.data.message)}`;
    } else {
      let n = r.data.to.replace(/\D/g, "");
      if (n.startsWith("0")) n = "27" + n.slice(1);
      window.open(`https://wa.me/${n}?text=${encodeURIComponent(r.data.message)}`, "_blank", "noopener,noreferrer");
    }
  };

  const input = "mt-1 w-full rounded border border-input bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-ring";
  const err = (k: string) => errors[k] && <span className="mt-1 block text-xs text-destructive">{errors[k]}</span>;

  return (
    <SiteLayout>
      <PageHero title="Send To A Friend" />
      <section className="mx-auto max-w-2xl px-5 py-14">
        <form onSubmit={submit} className="space-y-5 rounded bg-card p-7 ring-1 ring-border">
          <div>
            <p className="font-semibold">How do you want to send this message?</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {([["email", Mail, "Email"], ["whatsapp", MessageCircle, "WhatsApp"]] as const).map(([m, Icon, label]) => (
                <button type="button" key={m} onClick={() => { setMethod(m); setF({ ...f, to: "" }); setErrors({}); }} className={`flex items-center justify-center gap-2 rounded border-2 py-3 font-semibold transition ${method === m ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>
                  <Icon className="h-5 w-5" /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="text-sm font-medium">Your name</span><input className={input} value={f.yourName} onChange={(e) => setF({ ...f, yourName: e.target.value })} />{err("yourName")}</label>
            <label><span className="text-sm font-medium">Friend's name</span><input className={input} value={f.friendName} onChange={(e) => setF({ ...f, friendName: e.target.value })} />{err("friendName")}</label>
          </div>
          <label className="block">
            <span className="text-sm font-medium">{method === "email" ? "Friend's email" : "Friend's cellphone number"}</span>
            <input className={input} type={method === "email" ? "email" : "tel"} placeholder={method === "email" ? "friend@example.com" : "082 123 4567"} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />{err("to")}
          </label>
          <label className="block">
            <span className="text-sm font-medium">Message</span>
            <textarea rows={5} className={input} placeholder={defaultMsg(f.friendName, f.yourName)} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
            <span className="text-xs text-muted-foreground">Leave blank to use the suggested message.</span>{err("message")}
          </label>
          <button className="inline-flex w-full items-center justify-center gap-2 bg-cta py-3 font-semibold uppercase tracking-[0.15em] text-cta-foreground">
            <Send className="h-4 w-4" /> Send via {method === "email" ? "email" : "WhatsApp"}
          </button>
        </form>
      </section>
    </SiteLayout>
  );
}
