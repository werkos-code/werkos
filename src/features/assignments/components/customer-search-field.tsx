"use client";

import { Search, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type CustomerSearchResult = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type CustomerSearchFieldProps = {
  query: string;
  onQueryChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (customer: CustomerSearchResult | null) => void;
  disabled?: boolean;
};

export function CustomerSearchField({
  query,
  onQueryChange,
  selectedId,
  onSelect,
  disabled,
}: CustomerSearchFieldProps) {
  const t = useTranslations("assignment.gegevens");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }

    const handle = window.setTimeout(() => {
      setLoading(true);
      void (async () => {
        try {
          const params = new URLSearchParams({ q: query.trim() });
          const res = await fetch(`/api/customers/search?${params}`, {
            signal: AbortSignal.timeout(10_000),
          });
          const data = (await res.json()) as {
            customers?: CustomerSearchResult[];
          };
          setResults(data.customers ?? []);
          setOpen(true);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 250);

    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={containerRef} className="space-y-2">
      <Label htmlFor="customer-search">{t("searchLabel")}</Label>
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          id="customer-search"
          value={query}
          disabled={disabled}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
          onChange={(event) => {
            onQueryChange(event.target.value);
            if (selectedId) onSelect(null);
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
        />
        {open && (results.length > 0 || loading) ? (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-card py-1 shadow-sm">
            {loading ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                {t("searching")}
              </li>
            ) : (
              results.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted/60",
                      selectedId === customer.id && "bg-primary/5",
                    )}
                    onClick={() => {
                      onSelect(customer);
                      onQueryChange(customer.name);
                      setOpen(false);
                    }}
                  >
                    <User className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium">{customer.name}</span>
                      <span className="text-muted-foreground block text-xs">
                        {[customer.phone, customer.email]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
      {selectedId ? (
        <p className="text-xs text-primary">{t("existingSelected")}</p>
      ) : query.trim() && !loading ? (
        <p className="text-xs text-muted-foreground">{t("newCustomerHint")}</p>
      ) : null}
    </div>
  );
}
