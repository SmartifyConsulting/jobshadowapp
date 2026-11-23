import { SIGNUP_AUDIENCES } from "@/lib/audiences";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Turnstile } from "@/components/Turnstile";
import { PasswordInput } from "@/components/PasswordInput";
import { WHERE_HEAR_OPTIONS } from "@/lib/data";

export function RegisterForm({ compact }: { compact?: boolean }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [whereHear, setWhereHear] = useState("");
  const [accountType, setAccountType] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRequired = !!(import.meta.env["VITE_TURNSTILE_SITE_KEY"] as string | undefined);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!firstName.trim() || !lastName.trim()) return setMsg("Please enter your first name and last name.");
    if (!accountType) return setMsg("Please choose what you are signing up as.");
    if (password.length < 8) return setMsg("Password must be at least 8 characters.");
    if (password !== confirm) return setMsg("The passwords do not match.");
    if (captchaRequired && !captchaToken) return setMsg("Please complete the verification challenge.");
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/my-account`,
        data: { name: `${firstName.trim()} ${lastName.trim()}`, first_name: firstName.trim(), last_name: lastName.trim(), where_hear: whereHear, account_type: accountType },
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    setBusy(false);
    setMsg(error ? error.message : "Check your email to confirm your account, then log in.");
  }

  const input = compact
    ? "w-full rounded-full border border-primary-foreground/40 bg-primary-foreground/10 px-4 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/60 outline-none focus:border-primary-foreground/70"
    : "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 outline-none focus:border-primary";
  const strength = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;

  if (compact) {
    return (
      <form onSubmit={submit} className="grid gap-2 text-left">
        <div className="grid gap-2">
          <select required aria-label="I am signing up as" value={accountType} onChange={(e) => setAccountType(e.target.value)} className={`${input} [&>option]:text-foreground`}>
            <option value="">I am signing up as…</option>
            {SIGNUP_AUDIENCES.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
          </select>
          <input required aria-label="First name" placeholder="First name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={input} />
          <input required aria-label="Last name" placeholder="Last name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={input} />
          <input type="email" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          <PasswordInput required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
          <PasswordInput required placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
          <select aria-label="Where did you hear about Job Shadow?" value={whereHear} onChange={(e) => setWhereHear(e.target.value)} className={`${input} [&>option]:text-foreground`}>
            <option value="">How did you hear about us?</option>
            {WHERE_HEAR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <Turnstile onVerify={setCaptchaToken} />
        <button type="submit" disabled={busy || (captchaRequired && !captchaToken)} className="mt-1 rounded-none bg-cta px-5 py-2 text-xs font-bold uppercase tracking-wide text-cta-foreground disabled:opacity-50">
          {busy ? "Registering…" : "Register"}
        </button>
        {msg && <p aria-live="assertive" className="text-xs font-semibold text-accent">{msg}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 text-sm">
      <div className="flex items-start gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">
        NOTE: No more than one scholar per registration.
      </div>
      <label>
        <span className="font-semibold text-foreground">I am signing up as… <span className="text-accent">*</span></span>
        <select required aria-label="I am signing up as" value={accountType} onChange={(e) => setAccountType(e.target.value)} className={`${input} [&>option]:text-foreground`}>
          <option value="">Select your role…</option>
          {SIGNUP_AUDIENCES.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="font-semibold text-foreground">First name <span className="text-accent">*</span></span>
          <input required aria-label="First name" placeholder="e.g. Thabo" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={input} />
        </label>
        <label>
          <span className="font-semibold text-foreground">Last name <span className="text-accent">*</span></span>
          <input required aria-label="Last name" placeholder="e.g. Mokoena" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={input} />
        </label>
      </div>
      <label>
        <span className="font-semibold text-foreground">Email address <span className="text-accent">*</span></span>
        <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      </label>
      <label>
        <span className="font-semibold text-foreground">Password <span className="text-accent">*</span></span>
        <PasswordInput required placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        <div className="mt-1.5 grid grid-cols-4 gap-1">
          {[0, 1, 2, 3].map((i) => <div key={i} className={`h-1 rounded-full ${i < strength ? "bg-cta" : "bg-border"}`} />)}
        </div>
        <p className="mt-1 text-xs text-foreground/60">At least 8 characters. Avoid common or easy-to-guess passwords.</p>
      </label>
      <label>
        <span className="font-semibold text-foreground">Repeat password <span className="text-accent">*</span></span>
        <PasswordInput required placeholder="Re-enter your password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
      </label>
      <label>
        <span className="font-semibold text-foreground">How did you hear about us?</span>
        <select aria-label="Where did you hear about Job Shadow?" value={whereHear} onChange={(e) => setWhereHear(e.target.value)} className={`${input} [&>option]:text-foreground`}>
          <option value="">Select an option (optional)…</option>
          {WHERE_HEAR_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
      <Turnstile onVerify={setCaptchaToken} />
      <button type="submit" disabled={busy || (captchaRequired && !captchaToken)} className="mt-1 rounded-full bg-primary py-2.5 text-sm font-bold uppercase tracking-wide text-primary-foreground disabled:opacity-50">
        {busy ? "Registering…" : "Register"}
      </button>
      {msg && <p aria-live="assertive" className="rounded-lg border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive">{msg}</p>}
    </form>
  );
}
