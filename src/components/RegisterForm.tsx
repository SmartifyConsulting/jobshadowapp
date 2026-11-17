import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Turnstile } from "@/components/Turnstile";
import { WHERE_HEAR_OPTIONS } from "@/lib/data";

export function RegisterForm({ compact }: { compact?: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [whereHear, setWhereHear] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRequired = !!(import.meta.env["VITE_TURNSTILE_SITE_KEY"] as string | undefined);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) return setMsg("Password must be at least 8 characters.");
    if (password !== confirm) return setMsg("The passwords do not match.");
    if (captchaRequired && !captchaToken) return setMsg("Please complete the verification challenge.");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/my-account`,
        data: { name, where_hear: whereHear },
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    setBusy(false);
    setMsg(error ? error.message : "Check your email to confirm your account, then log in.");
  }

  const input = compact
    ? "w-full rounded-full border border-primary-foreground/40 bg-primary-foreground/10 px-4 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/60 outline-none focus:border-primary-foreground/70"
    : "mt-1 w-full border-b border-current/60 bg-transparent px-1 py-2 text-sm tracking-wide placeholder:text-current/70 outline-none focus:border-primary-foreground";

  return (
    <form onSubmit={submit} className={compact ? "grid gap-2 text-left" : "mx-auto max-w-7xl"}>
      <div className={compact ? "grid gap-2" : "grid gap-4 sm:grid-cols-2"}>
        <input required placeholder="NAME" value={name} onChange={(e) => setName(e.target.value)} className={input} />
        <input type="email" required placeholder="EMAIL ADDRESS" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        <div>
          <input type="password" required placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
          {!compact && <p className="mt-1 text-xs text-current/70">At least 8 characters. Avoid common or easy-to-guess passwords.</p>}
        </div>
        <input type="password" required placeholder="REPEAT PASSWORD" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
        <select
          aria-label="Where did you hear about Job Shadow?"
          value={whereHear}
          onChange={(e) => setWhereHear(e.target.value)}
          className={`${input} [&>option]:text-foreground ${compact ? "" : "sm:col-span-2 sm:max-w-md"}`}
        >
          <option value="">HOW DID YOU HEAR ABOUT US?</option>
          {WHERE_HEAR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <Turnstile onVerify={setCaptchaToken} />
      <button
        type="submit"
        disabled={busy || (captchaRequired && !captchaToken)}
        className={compact ? "mt-1 rounded-full bg-cta px-5 py-2 text-xs font-bold uppercase tracking-wide text-cta-foreground disabled:opacity-50" : "mt-6 rounded-full bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-50"}
      >
        {busy ? "Registering…" : "Register"}
      </button>
      {msg && (
        <p aria-live="assertive" className={compact ? "text-xs font-semibold text-accent" : "mt-3 max-w-md rounded border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive"}>
          {msg}
        </p>
      )}
    </form>
  );
}
