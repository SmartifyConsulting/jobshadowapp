import { useState } from "react";
import { z } from "zod";
import { Mail, Facebook } from "lucide-react";
import { SiteLayout, useSiteSession } from "@/components/SiteLayout";
import { CONTACT_EMAIL } from "@/lib/data";

export function SharingPage() {
  return <SiteLayout className="sharing-page bg-teal"><ShareStorySection /><SendToFriendSection /></SiteLayout>;
}

function ShareStorySection() {
  const { data: session } = useSiteSession();
  const signedInEmail = session?.user?.email ?? null;
  const signedInName = session?.displayName ?? null;
  const [f, setF] = useState({ name: "", email: "", career: "", story: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const schema = z.object({
    name: z.string().trim().min(1, "Please enter your name").max(150),
    email: z.string().trim().email("Enter a valid email").max(255),
    career: z.string().trim().max(150).optional(),
    story: z.string().trim().min(10, "Please tell us a little more").max(2000),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse({ ...f, name: signedInName || f.name, email: signedInEmail ?? f.email });
    if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
    setErrors({});
    const body = [`Name: ${r.data.name}`, `Email: ${r.data.email}`, `Career shadowed: ${r.data.career || "-"}`, "", r.data.story].join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`My Job Shadow experience — ${r.data.name}`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const input = "mt-1 w-full border-b border-current/40 bg-transparent px-1 py-1.5 text-sm outline-none focus:border-primary";
  const err = (k: string) => errors[k] && <span className="mt-1 block text-xs text-destructive">{errors[k]}</span>;
  const label = "text-xs uppercase tracking-wide opacity-80";

  return (
    <>
      <section id="share-your-story" aria-labelledby="share-your-story-title" className="flex items-center bg-accent px-5 py-4 text-accent-foreground sm:py-5">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-2">
          <div>
            <h1 id="share-your-story-title" className="font-display text-3xl uppercase leading-tight md:text-4xl">Share your experience with us</h1>
            <p className="mt-4 text-sm text-foreground/80">Did a Job Shadow help you decide on your career? Tell us about your day — your story helps other scholars choose with confidence.</p>
            <p className="mt-4 text-xs uppercase tracking-wide opacity-80">Or share it here</p>
            <div className="mt-2 flex gap-3">
              {SHARE_ICONS.map((Icon, i) => (
                <span key={i} className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground text-primary"><Icon className="h-4 w-4" /></span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-foreground/20 bg-background/20 p-4">
            <h2 className="font-display text-2xl uppercase">Your Story</h2>
            {sent ? (
              <p className="mt-4 text-sm">Thank you! Your email app should now be open with your story ready to send.</p>
            ) : (
              <form onSubmit={submit} className="mt-3 grid gap-2">
                <div className={'grid gap-3 [&>label]:min-w-0 ' + (signedInName && signedInEmail ? '' : 'sm:grid-cols-3')}>
                {!signedInName && <label><span className={label}>Your name</span><input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />{err("name")}</label>}
                {!signedInEmail && <label><span className={label}>Your email</span><input type="email" className={input} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />{err("email")}</label>}
                <label><span className={label}>Career you shadowed (optional)</span><input className={input} value={f.career} onChange={(e) => setF({ ...f, career: e.target.value })} /></label>
                </div>
                <div className="flex items-end gap-3">
                  <label className="min-w-0 flex-1"><span className={label}>Your experience</span><textarea rows={2} className={input} value={f.story} onChange={(e) => setF({ ...f, story: e.target.value })} />{err("story")}</label>
                  <button className="mb-1 shrink-0 rounded-full bg-cta px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-cta-foreground">Send</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

const schema = z.object({
  recipientFirstName: z.string().trim().min(1, "Please enter the recipient's first name").max(100),
  to: z.string().trim().email("Enter a valid email").max(255),
  message: z.string().trim().min(1, "Please add a message").max(800),
});

const DEFAULT_MESSAGE = "Yo bruh,\nI found this lit site that gives you the chance to discover what you wanna do\nwith your life.";

const SHARE_ICONS = [Mail, Facebook] as const;

function SendToFriendSection() {
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

  const input = "mt-1 w-full border-b border-current/40 bg-transparent px-1 py-1.5 text-sm placeholder:text-current/70 outline-none focus:border-primary";
  const err = (k: string) => errors[k] && <span className="mt-1 block text-xs text-destructive">{errors[k]}</span>;

  return (
    <>
      <section id="send-to-friend" aria-labelledby="send-to-friend-title" className="flex items-center border-t border-foreground/15 bg-[#7CCCC8] px-5 py-4 text-teal-foreground sm:py-5">
        <div className="mx-auto grid max-w-6xl items-start gap-6 md:grid-cols-2">
          <div>
            <h2 id="send-to-friend-title" className="font-display text-3xl uppercase leading-tight md:text-4xl">Send To A Friend</h2>
            <p className="mt-4 text-sm text-foreground/80">Know someone who should try a job before they study for it? Tell them about Job Shadow.</p>
            <a href="#share-your-story" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Share your experience with us</a>
          </div>
          <div className="rounded-xl border border-foreground/20 bg-background/20 p-4">
            <h2 className="font-display text-2xl uppercase">Your Message</h2>
            <form onSubmit={submit} className="mt-3 grid gap-2">
              <div className="grid gap-3 sm:grid-cols-2">
              <label><span className="text-xs uppercase tracking-wide opacity-80">Recipient's first name</span><input className={input} value={f.recipientFirstName} onChange={(e) => setF({ ...f, recipientFirstName: e.target.value })} />{err("recipientFirstName")}</label>
              <label><span className="text-xs uppercase tracking-wide opacity-80">Recipient email</span><input className={input} type="email" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />{err("to")}</label>
              </div>
              <div className="flex items-end gap-3">
                <label className="min-w-0 flex-1"><span className="text-xs uppercase tracking-wide opacity-80">Message</span><textarea rows={3} className={input + ' min-h-20 [field-sizing:content]'} placeholder={DEFAULT_MESSAGE} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />{err("message")}</label>
                <button className="mb-1 shrink-0 rounded-full bg-cta px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-cta-foreground">Send</button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
