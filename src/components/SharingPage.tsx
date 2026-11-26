import { useState } from "react";
import { z } from "zod";
import { useSiteSession } from "@/components/SiteLayout";
import { CONTACT_EMAIL } from "@/lib/data";

export function ShareStoryForm() {
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
    const r = schema.safeParse({
      ...f,
      name: signedInName || f.name,
      email: signedInEmail ?? f.email,
    });
    if (!r.success)
      return setErrors(
        Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])),
      );
    setErrors({});
    const body = [
      `Name: ${r.data.name}`,
      `Email: ${r.data.email}`,
      `Career shadowed: ${r.data.career || "-"}`,
      "",
      r.data.story,
    ].join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`My Job Shadow experience — ${r.data.name}`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const input =
    "mt-1 w-full border-b border-current/40 bg-transparent px-1 py-1.5 text-sm outline-none focus:border-primary";
  const err = (k: string) =>
    errors[k] && <span className="mt-1 block text-xs text-destructive">{errors[k]}</span>;
  const label = "text-xs uppercase tracking-wide opacity-80";

  return (
    <>
      {sent ? (
        <p className="mt-4 text-sm">
          Thank you! Your email app should now be open with your story ready to send.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 grid gap-2">
          <div
            className={
              "grid gap-3 [&>label]:min-w-0 " +
              (signedInName && signedInEmail ? "" : "sm:grid-cols-3")
            }
          >
            {!signedInName && (
              <label>
                <span className={label}>Your name</span>
                <input
                  className={input}
                  value={f.name}
                  onChange={(e) => setF({ ...f, name: e.target.value })}
                />
                {err("name")}
              </label>
            )}
            {!signedInEmail && (
              <label>
                <span className={label}>Your email</span>
                <input
                  type="email"
                  className={input}
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                />
                {err("email")}
              </label>
            )}
            <label>
              <span className={label}>Career you shadowed (optional)</span>
              <input
                className={input}
                value={f.career}
                onChange={(e) => setF({ ...f, career: e.target.value })}
              />
            </label>
          </div>
          <div className="flex items-end gap-3">
            <label className="min-w-0 flex-1">
              <span className={label}>Your experience</span>
              <textarea
                rows={2}
                className={input}
                value={f.story}
                onChange={(e) => setF({ ...f, story: e.target.value })}
              />
              {err("story")}
            </label>
            <button className="mb-1 shrink-0 rounded-full bg-cta px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-cta-foreground">
              Send
            </button>
          </div>
        </form>
      )}
    </>
  );
}

const schema = z.object({
  recipientFirstName: z.string().trim().min(1, "Please enter the recipient's first name").max(100),
  to: z.string().trim().email("Enter a valid email").max(255),
  message: z.string().trim().min(1, "Please add a message").max(800),
});

const DEFAULT_MESSAGE =
  "Yo bruh,\nI found this lit site that gives you the chance to discover what you wanna do\nwith your life.";

export function SendToFriendForm() {
  const [f, setF] = useState({ recipientFirstName: "", to: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

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
    setSent(true);
  };

  const input =
    "mt-1 w-full border-b border-current/40 bg-transparent px-1 py-1.5 text-sm placeholder:text-current/70 outline-none focus:border-primary";
  const err = (k: string) =>
    errors[k] && <span className="mt-1 block text-xs text-destructive">{errors[k]}</span>;

  return (
    <>
      {sent ? (
        <p className="mt-4 text-sm">
          Thanks! Your email app should now be open with your message ready to send.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 grid gap-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="text-xs uppercase tracking-wide opacity-80">
                Recipient's first name
              </span>
              <input
                className={input}
                value={f.recipientFirstName}
                onChange={(e) => setF({ ...f, recipientFirstName: e.target.value })}
              />
              {err("recipientFirstName")}
            </label>
            <label>
              <span className="text-xs uppercase tracking-wide opacity-80">Recipient email</span>
              <input
                className={input}
                type="email"
                value={f.to}
                onChange={(e) => setF({ ...f, to: e.target.value })}
              />
              {err("to")}
            </label>
          </div>
          <div className="flex items-end gap-3">
            <label className="min-w-0 flex-1">
              <span className="text-xs uppercase tracking-wide opacity-80">Message</span>
              <textarea
                rows={3}
                className={input + " min-h-20 [field-sizing:content]"}
                placeholder={DEFAULT_MESSAGE}
                value={f.message}
                onChange={(e) => setF({ ...f, message: e.target.value })}
              />
              {err("message")}
            </label>
            <button className="mb-1 shrink-0 rounded-full bg-cta px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-cta-foreground">
              Send
            </button>
          </div>
        </form>
      )}
    </>
  );
}
