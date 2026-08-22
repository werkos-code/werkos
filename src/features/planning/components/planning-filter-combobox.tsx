"use client";

import { ChevronDown, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type PlanningFilterOption = {
  value: string;
  label: string;
  hint?: string | null;
  initials?: string;
};

type PlanningFilterComboboxProps = {
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  allLabel: string;
  value: string;
  options: PlanningFilterOption[];
  onChange: (value: string) => void;
  className?: string;
};

export function PlanningFilterCombobox({
  label,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  allLabel,
  value,
  options,
  onChange,
  className,
}: PlanningFilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        (option.hint ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="border-input bg-background hover:bg-muted/40 flex h-9 min-w-[8.5rem] items-center justify-between gap-2 rounded-lg border px-2.5 text-sm transition-colors"
        aria-expanded={open}
      >
        <span className="truncate text-left">
          <span className="text-muted-foreground mr-1 text-[11px]">{label}</span>
          <span className="font-medium">
            {value === "all" ? allLabel : (selected?.label ?? placeholder)}
          </span>
        </span>
        <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
      </button>

      {open ? (
        <div className="bg-popover absolute top-[calc(100%+4px)] z-50 w-72 rounded-lg border border-border p-2 shadow-md">
          <div className="relative mb-2">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="border-input bg-background h-8 w-full rounded-md border pr-2 pl-8 text-sm outline-none"
              autoFocus
            />
          </div>
          <ul className="max-h-56 space-y-0.5 overflow-y-auto">
            <li>
              <button
                type="button"
                className={cn(
                  "hover:bg-muted/60 w-full rounded-md px-2 py-1.5 text-left text-sm",
                  value === "all" && "bg-primary/10 text-primary",
                )}
                onClick={() => {
                  onChange("all");
                  setOpen(false);
                  setQuery("");
                }}
              >
                {allLabel}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-2 py-3 text-xs text-muted-foreground">{emptyLabel}</li>
            ) : (
              filtered.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={cn(
                      "hover:bg-muted/60 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                      value === option.value && "bg-primary/10 text-primary",
                    )}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {option.initials ? (
                      <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                        {option.initials}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.hint ? (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {option.hint}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function PlanningActiveFilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
    >
      {label}
      <X className="size-3" />
    </button>
  );
}
