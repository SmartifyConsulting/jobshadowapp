import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CountrySelect } from "@/components/CountrySelect";
type School = { id: string; name: string; region: string; city: string; school_type: string };
export function SchoolPicker({
  school,
  country,
  schoolType,
  onChange,
  invalid = false,
}: {
  school: string;
  country: string;
  schoolType: string;
  onChange: (school: string, country: string, schoolType: string) => void;
  invalid?: boolean;
}) {
  const searchCountry = country || "ZA";
  const [browseAll, setBrowseAll] = useState(false);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState(school);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const timer = setTimeout(() => setTerm(school), 250);
    return () => clearTimeout(timer);
  }, [school]);
  const searchTerm = browseAll ? "" : term.trim();
  const query = useQuery({
    queryKey: ["school-suggestions", searchCountry, searchTerm],
    enabled: open,
    queryFn: async () => {
      const r = await supabase.rpc("search_country_schools", {
        _country: searchCountry,
        _search: searchTerm,
      });
      if (r.error) throw r.error;
      return r.data ?? [];
    },
    staleTime: 5 * 60_000,
  });
  const home = {
    id: "home-school",
    name: "Home School",
    region: "",
    city: "",
    school_type: "Home School",
  };
  const options = [
    ...(browseAll || !school.trim() || "home school".includes(school.toLowerCase()) ? [home] : []),
    ...(query.data ?? []),
  ];
  function choose(option: School) {
    onChange(option.name, searchCountry, option.school_type);
    setOpen(false);
    setActive(-1);
  }
  return (
    <div
      className="min-w-0 space-y-3"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <CountrySelect
        label="School Country"
        value={searchCountry}
        onChange={(value) => {
          onChange("", value, "Not recorded");
          setTerm("");
          setBrowseAll(true);
          setOpen(false);
        }}
      />
      <div className="relative">
        <label htmlFor="school" className="text-sm font-medium">
          Current School
        </label>
        <input
          ref={inputRef}
          id="school"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={invalid}
          value={school}
          placeholder="Select or type your school"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(
              e.target.value,
              country,
              e.target.value === "Home School" ? "Home School" : "Not recorded",
            );
            setBrowseAll(false);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              inputRef.current?.focus();
              setActive((i) =>
                options.length
                  ? (i + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length
                  : -1,
              );
            }
            if (e.key === "Enter" && open) {
              e.preventDefault();
              if (active >= 0 && options[active]) choose(options[active]);
            }
          }}
          className={`mt-1 w-full border bg-transparent pl-3 pr-10 py-2 text-sm ${invalid ? "border-destructive outline outline-1 outline-destructive" : "border-input"}`}
        />
        <button
          type="button"
          aria-label="Show school list"
          aria-expanded={open}
          aria-controls={listId}
          title="Show school list"
          className="absolute right-1 top-7 rounded p-1 hover:bg-muted"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (open) {
              setOpen(false);
            } else {
              setBrowseAll(true);
              setActive(-1);
              setOpen(true);
              inputRef.current?.focus();
            }
          }}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose from the list or type to find your school.
        </p>
        {open && (
          <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded border border-input bg-background p-1 shadow-lg">
            <ul id={listId} role="listbox" aria-label="Schools">
              {options.map((option, index) => (
                <li
                  key={option.id}
                  role="option"
                  id={`${listId}-${index}`}
                  aria-selected={active === index}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(option)}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${active === index ? "bg-muted" : ""}`}
                  >
                    {option.name}
                    {option.city || option.region ? (
                      <span className="block text-xs text-muted-foreground">
                        {[option.city, option.region, option.school_type]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
            {query.isFetching ? (
              <p role="status" className="px-3 py-2 text-xs">
                Finding schools…
              </p>
            ) : query.error ? (
              <p role="status" className="px-3 py-2 text-xs">
                Suggestions are unavailable. You can enter your school name.
              </p>
            ) : query.data?.length === 40 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Showing the first 40 schools. Type to narrow the list.
              </p>
            ) : !options.length ? (
              <p className="px-3 py-2 text-xs">
                No matches in this country. You can enter your school name.
              </p>
            ) : null}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        School Type: {schoolType === "Not recorded" || !schoolType ? "Not recorded" : schoolType}
      </p>
    </div>
  );
}
