import { Fragment, useMemo, useState } from "react";
import { ChevronRight, Info, Pencil, Trash2 } from "lucide-react";
import { schoolDirectory } from "@/lib/school-directory";
import type { AccountRow } from "@/lib/users.server";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
export function SchoolsDirectory({
  accounts,
  onAdd,
  onEdit,
  onDelete,
  busyId,
}: {
  accounts: AccountRow[];
  onAdd: () => void;
  onEdit: (account: AccountRow) => void;
  onDelete: (id: string, label: string) => void;
  busyId: string | null;
}) {
  const schools = useMemo(() => schoolDirectory(accounts), [accounts]);
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const shown = schools.filter(
    (school) =>
      (!letter || school.name.toUpperCase().startsWith(letter)) &&
      [school.name, ...school.sourceNames].some((name) =>
        name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
  );
  const detail = schools.find((school) => school.key === selected);
  const contacts = accounts.filter(
    (account) => account.roles.includes("school") && !account.is_spam,
  );
  return (
    <div className="space-y-3 bg-ivory px-4 py-3 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">Schools ({schools.length})</h2>
          <p className="text-xs text-muted-foreground">
            {schools.reduce((count, school) => count + school.scholars.length, 0)} scholars grouped
            by school
          </p>
        </div>
        <Button onClick={onAdd}>Add School Contact</Button>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter schools by letter">
        {["All", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={letter === (value === "All" ? "" : value)}
            onClick={() => setLetter(value === "All" ? "" : value)}
            className={`rounded-full px-2.5 py-1.5 text-xs ${letter === (value === "All" ? "" : value) ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
          >
            {value}
          </button>
        ))}
      </div>
      <label className="block max-w-sm text-sm">
        Search schools
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="mt-1 w-full rounded border border-input bg-background px-3 py-2"
        />
      </label>
      <table className="w-full table-fixed text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 font-medium">School</th>
            <th className="w-28 px-3 py-2 text-right font-medium">Scholars</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((school) => {
            const open = expanded.has(school.key);
            const childrenId = "school-children-" + encodeURIComponent(school.key);
            return (
              <Fragment key={school.key}>
                <tr className="border-b border-border">
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="flex items-center gap-2 text-left hover:text-primary"
                      aria-expanded={open}
                      aria-controls={childrenId}
                      onClick={() =>
                        setExpanded((current) => {
                          const next = new Set(current);
                          next.has(school.key) ? next.delete(school.key) : next.add(school.key);
                          return next;
                        })
                      }
                    >
                      <ChevronRight
                        aria-hidden
                        className={
                          "h-4 w-4 shrink-0 transition-transform " + (open ? "rotate-90" : "")
                        }
                      />
                      {school.name}
                    </button>
                    {schools.some(
                      (other) =>
                        other.key !== school.key &&
                        other.name.toLowerCase() === school.name.toLowerCase(),
                    ) && (
                      <span className="ml-6 text-xs text-muted-foreground">
                        {school.country ?? "Country not recorded"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="inline-flex items-center gap-3">
                      {school.scholars.length}
                      <button
                        type="button"
                        title="School details"
                        aria-label={"View school details for " + school.name}
                        className="rounded p-1 text-muted-foreground hover:text-primary"
                        onClick={() => setSelected(school.key)}
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </span>
                  </td>
                </tr>
                {open && (
                  <tr>
                    <td colSpan={2} className="border-b border-border bg-ivory px-3 py-1">
                      <ul
                        id={childrenId}
                        aria-label={"Scholars at " + school.name}
                        className="ml-2 divide-y divide-border border-l border-border pl-5"
                      >
                        {[...school.scholars]
                          .sort((a, b) =>
                            (a.full_name || a.display_name || a.email || "").localeCompare(
                              b.full_name || b.display_name || b.email || "",
                            ),
                          )
                          .map((account) => (
                            <li
                              key={account.id}
                              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm"
                            >
                              <span>
                                {account.full_name ||
                                  account.display_name ||
                                  [account.first_name, account.last_name]
                                    .filter(Boolean)
                                    .join(" ") ||
                                  "Name not recorded"}
                              </span>
                              <span className="break-all text-xs text-muted-foreground">
                                {account.email || "Email not recorded"}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {!shown.length && (
        <p className="py-3 text-sm text-muted-foreground">No schools match this search.</p>
      )}
      {contacts.length > 0 && (
        <details className="rounded border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            School contacts ({contacts.length})
          </summary>
          <ul className="mt-2 divide-y divide-border">
            {contacts.map((account) => (
              <li key={account.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>{account.display_name || account.email}</span>
                <span className="ml-auto flex gap-2">
                  <button
                    title="Edit user"
                    aria-label={"Edit " + (account.display_name || account.email)}
                    onClick={() => onEdit(account)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    disabled={busyId === account.id}
                    aria-label={"Delete account for " + (account.display_name || account.email)}
                    onClick={() =>
                      onDelete(account.id, account.display_name || account.email || account.id)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <Sheet
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="overflow-y-auto bg-ivory">
          <SheetHeader>
            <SheetTitle>{detail?.name}</SheetTitle>
            <SheetDescription>{detail?.scholars.length} scholars</SheetDescription>
          </SheetHeader>
          {detail && (
            <div className="mt-4 rounded border border-border p-3">
              <h3 className="text-sm font-medium">Recorded school names</h3>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {detail.sourceNames.map((name) => (
                  <li key={name}>
                    {name} ·{" "}
                    {
                      detail.scholars.filter(
                        (account) => account.school?.trim().replace(/\s+/g, " ") === name,
                      ).length
                    }{" "}
                    scholars
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Original profile entries are preserved.
              </p>
            </div>
          )}
          <ul className="mt-4 divide-y divide-border">
            {detail?.scholars.map((account) => (
              <li key={account.id} className="py-2 text-sm">
                <p>
                  {account.full_name ||
                    account.display_name ||
                    [account.first_name, account.last_name].filter(Boolean).join(" ") ||
                    account.email}
                </p>
                <p className="text-xs text-muted-foreground">{account.email}</p>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  );
}
