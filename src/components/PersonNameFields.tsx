import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function joinPersonName(first: string, last: string) {
  return [first.trim(), last.trim()].filter(Boolean).join(" ");
}

export function PersonNameFields({ id, label, firstName, lastName, originalName, required = false, disabled = false, firstNameInvalid = false, lastNameInvalid = false, onChange }: {
  id: string; label?: string; firstName?: string | null | undefined; lastName?: string | null | undefined; originalName?: string | null | undefined;
  required?: boolean; disabled?: boolean; firstNameInvalid?: boolean; lastNameInvalid?: boolean; onChange: (first: string, last: string, full: string) => void;
}) {
  const first = firstName ?? "", last = lastName ?? "";
  return <fieldset className="min-w-0 space-y-2">
    {label && <legend className="mb-2 text-sm font-semibold">{label}</legend>}
    {!first && !last && originalName && <p className="text-xs text-muted-foreground">Existing name: <strong>{originalName}</strong>. Please confirm the first and last names when editing this name.</p>}
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <div className="min-w-0"><Label htmlFor={id + "-first"}>First Name</Label><Input id={id + "-first"} aria-invalid={firstNameInvalid} autoComplete="given-name" maxLength={100} required={required} disabled={disabled} value={first} onChange={(event) => onChange(event.target.value, last, joinPersonName(event.target.value, last))} /></div>
      <div className="min-w-0"><Label htmlFor={id + "-last"}>Last Name</Label><Input id={id + "-last"} aria-invalid={lastNameInvalid} autoComplete="family-name" maxLength={100} required={required} disabled={disabled} value={last} onChange={(event) => onChange(first, event.target.value, joinPersonName(first, event.target.value))} /></div>
    </div>
  </fieldset>;
}
