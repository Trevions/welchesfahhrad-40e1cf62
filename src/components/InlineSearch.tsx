import { Search, X, ArrowRight, CornerDownLeft } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

export type Suggestion = {
  id: string;
  label: string;
  subtitle?: string;
  href?: string;
  category?: string;
  icon?: React.ReactNode;
};

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (s: Suggestion) => void;
  placeholder?: string;
  eyebrow?: string;
  hint?: string;
  resultsCount?: number;
  autoFocus?: boolean;
  suggestions?: Suggestion[];
};

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <>
      {before}
      <mark className="bg-signal/20 px-0.5 text-foreground font-semibold">
        {match}
      </mark>
      {after}
    </>
  );
}

export function InlineSearch({
  value,
  onChange,
  onSelect,
  placeholder = "Suchen…",
  eyebrow,
  hint,
  resultsCount,
  autoFocus,
  suggestions,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const active = value.trim().length > 0;
  const hasSuggestions = active && suggestions && suggestions.length > 0;

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    // reset selection when suggestions change
    setActiveIndex(-1);
  }, [suggestions?.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!hasSuggestions) return;
      const max = Math.min(suggestions!.length - 1, 4);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        setActiveIndex((prev) => (prev >= max ? 0 : prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
        setActiveIndex((prev) => (prev <= 0 ? max : prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex <= max && onSelect) {
          onSelect(suggestions![activeIndex]);
          setOpen(false);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
      }
    },
    [hasSuggestions, suggestions, activeIndex, onSelect],
  );

  const handleSelect = (s: Suggestion) => {
    onSelect?.(s);
    setOpen(false);
    setActiveIndex(-1);
  };

  const showDropdown = hasSuggestions && open;

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`group relative flex items-center gap-3 rounded-2xl glass-card px-4 py-3 transition-shadow duration-500 md:px-5 md:py-4 ${
          active ? "!shadow-glow" : ""
        }`}
      >
        <Search
          className={`h-5 w-5 shrink-0 transition-colors ${
            active ? "text-signal" : "text-muted-foreground group-hover:text-foreground"
          }`}
          strokeWidth={1.75}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          {eyebrow && (
            <span className="hidden text-[10px] uppercase tracking-[0.22em] text-muted-foreground md:block">
              {eyebrow}
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => active && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent text-base font-medium tracking-tight text-foreground outline-none placeholder:text-muted-foreground/70 md:text-lg"
            aria-label={placeholder}
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls={showDropdown ? "search-suggestions" : undefined}
          />
        </div>

        {active ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-signal hover:text-signal"
            aria-label="Suche zurücksetzen"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded-lg border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground md:inline-block">
            /
          </kbd>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && (
        <div
          id="search-suggestions"
          role="listbox"
          className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl glass-card !shadow-elevated animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="border-b border-border/50 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Vorschläge
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-signal font-medium">
              {Math.min(suggestions!.length, 5)} Treffer
            </span>
          </div>
          <ul className="py-1">
            {suggestions!.slice(0, 5).map((s, i) => (
              <li key={s.id} role="option" aria-selected={i === activeIndex}>
                {s.href ? (
                  <a
                    href={s.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSelect(s);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      i === activeIndex
                        ? "bg-signal/10"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    {s.icon && (
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-background text-signal">
                        {s.icon}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {highlightMatch(s.label, value)}
                      </div>
                      {s.subtitle && (
                        <div className="text-xs text-muted-foreground truncate">
                          {highlightMatch(s.subtitle, value)}
                        </div>
                      )}
                    </div>
                    {s.category && (
                      <span className="hidden sm:inline-block shrink-0 rounded-full border border-border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                        {s.category}
                      </span>
                    )}
                    <ArrowRight
                      className={`h-4 w-4 shrink-0 transition-all ${
                        i === activeIndex
                          ? "text-signal translate-x-0.5"
                          : "text-muted-foreground/40"
                      }`}
                      strokeWidth={1.5}
                    />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelect(s)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      i === activeIndex
                        ? "bg-signal/10"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    {s.icon && (
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-background text-signal">
                        {s.icon}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {highlightMatch(s.label, value)}
                      </div>
                      {s.subtitle && (
                        <div className="text-xs text-muted-foreground truncate">
                          {highlightMatch(s.subtitle, value)}
                        </div>
                      )}
                    </div>
                    {s.category && (
                      <span className="hidden sm:inline-block shrink-0 rounded-full border border-border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                        {s.category}
                      </span>
                    )}
                    <CornerDownLeft
                      className={`h-4 w-4 shrink-0 transition-all ${
                        i === activeIndex
                          ? "text-signal"
                          : "text-muted-foreground/40"
                      }`}
                      strokeWidth={1.5}
                    />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {suggestions!.length > 5 && (
            <div className="border-t border-border/50 px-4 py-2 text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              +{suggestions!.length - 5} weitere — gib deine Suche ein für alle Ergebnisse
            </div>
          )}
        </div>
      )}

      {/* Hint + count */}
      {(hint || typeof resultsCount === "number") && (
        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="truncate">{hint}</span>
          {active && typeof resultsCount === "number" && (
            <span className="shrink-0">
              <span className="text-signal">{resultsCount}</span>{" "}
              {resultsCount === 1 ? "Treffer" : "Treffer"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
