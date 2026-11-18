import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createAccount } from "@/lib/users.functions";
import type { AccountRow } from "@/lib/users.server";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/dialogs";

export function CreateAccountDialog({ role, label, onClose }: { role: AccountRow["roles"][number]; label: string; onClose: () => void }) {
  const create = useServerFn(createAccount), qc = useQueryClient();
  const [name, setName] = useState(""), [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function save() {
    setBusy(true); setError("");
    try {
      await create({ data: { name: name.trim(), email: email.trim(), role } });
      await qc.invalidateQueries({ queryKey: ["admin", "accounts"] });
      notify("Account created without sending email. Login setup is pending.");
      onClose();
    } catch (e) {
      await qc.invalidateQueries({ queryKey: ["admin", "accounts"] });
      setError(e instanceof Error ? e.message : "Unable to create account.");
    }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent><DialogHeader><DialogTitle>Add {label}</DialogTitle><DialogDescription>Create an account without sending an invitation or other email. Login setup will remain pending.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(); }}>
    <p className="text-sm">User type: <strong>{label}</strong></p>
    {role === "admin" && <p className="rounded border border-primary/30 bg-primary/5 p-3 text-sm">This account will have full Admin access once login setup is completed.</p>}
    <label className="block text-sm">Full name<input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded border border-input bg-background px-3 py-2" /></label>
    <label className="block text-sm">Email<input required type="email" maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded border border-input bg-background px-3 py-2" /></label>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button disabled={busy || !name.trim() || !email.trim()}>{busy ? "Creating…" : "Create account — no email"}</Button></div>
  </form></DialogContent></Dialog>;
}
