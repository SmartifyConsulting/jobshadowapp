import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { displayTime, parseTimeEntry } from "@/lib/time-entry";

export function TimePicker({
  value,
  onChange,
  label,
  invalid = false,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null),
    list = useRef<HTMLDivElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState<string | null>(null),
    [active, setActive] = useState(0);
  const raw = parseTimeEntry(value) ?? value;
  const options = Array.from(
    { length: 48 },
    (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
  );
  if (raw && parseTimeEntry(raw) && !options.includes(raw)) options.push(raw);
  options.sort();
  useEffect(() => {
    if (open)
      list.current
        ?.querySelector(`[data-index="${active}"]`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [open, active]);
  function show() {
    if (disabled) return;
    const index = options.findIndex((time) => time >= (raw || "09:00"));
    setActive(Math.max(0, index));
    setOpen(true);
  }
  function choose(time: string) {
    onChange(time);
    setDraft(null);
    setOpen(false);
    input.current?.focus();
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={`relative flex h-9 min-w-0 items-center rounded border bg-transparent text-sm ${invalid ? "border-destructive ring-1 ring-destructive" : "border-input"}`}
        >
          <input
            ref={input}
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            aria-controls={id}
            aria-autocomplete="none"
            aria-activedescendant={open ? `${id}-${active}` : undefined}
            aria-invalid={invalid}
            disabled={disabled}
            value={draft ?? displayTime(raw)}
            placeholder="Select time"
            autoComplete="off"
            className="w-full min-w-0 bg-transparent py-1 pl-2 pr-9 outline-none"
            onClick={show}
            onChange={(e) => {
              setDraft(e.target.value);
              const time = parseTimeEntry(e.target.value);
              onChange(time ?? "");
              if (time) setOpen(true);
            }}
            onBlur={() => {
              if (draft !== null && parseTimeEntry(draft) !== null) setDraft(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                if (!open) show();
                else
                  setActive(
                    (i) => (i + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length,
                  );
              } else if (e.key === "Enter" && open) {
                e.preventDefault();
                choose(options[active]!);
              } else if (e.key === "Escape" || e.key === "Tab") setOpen(false);
            }}
          />
          <button
            type="button"
            aria-label={`Show times for ${label}`}
            disabled={disabled}
            onClick={() => (open ? setOpen(false) : show())}
            className="absolute inset-y-0 right-0 border-l border-input px-2 text-muted-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="z-[100] w-40 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div
          ref={list}
          id={id}
          role="listbox"
          aria-label={`Times for ${label}`}
          className="max-h-52 overflow-y-auto py-1"
        >
          {options.map((time, index) => (
            <button
              key={time}
              id={`${id}-${index}`}
              data-index={index}
              role="option"
              aria-selected={raw === time}
              tabIndex={-1}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(time)}
              className={`block w-full px-3 py-1.5 text-left text-sm hover:bg-cta/20 ${active === index ? "bg-cta/20" : ""}`}
            >
              {displayTime(time)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
