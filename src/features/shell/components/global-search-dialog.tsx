"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { globalSearch } from "@/features/shell/global-search-actions";
import { Link, useRouter } from "@/i18n/navigation";

type GlobalSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: GlobalSearchDialogProps) {
  const t = useTranslations("shell.search");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<
    Awaited<ReturnType<typeof globalSearch>>["results"]
  >([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setError(null);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      startTransition(() => {
        void (async () => {
          const result = await globalSearch(q);
          if (result.error) {
            setError(result.error);
            setResults([]);
            return;
          }
          setError(null);
          setResults(result.results ?? []);
        })();
      });
    }, 200);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="sr-only">{t("title")}</DialogTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("placeholder")}
              className="h-10 border-0 pl-9 shadow-none focus-visible:ring-0"
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </DialogHeader>
        <div className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="px-2 py-6 text-sm text-muted-foreground">
              {t("minChars")}
            </p>
          ) : isPending ? (
            <p className="px-2 py-6 text-sm text-muted-foreground">
              {t("loading")}
            </p>
          ) : error ? (
            <p className="px-2 py-6 text-sm text-destructive">{error}</p>
          ) : results && results.length > 0 ? (
            <div className="space-y-3">
              {(
                [
                  "projects",
                  "customers",
                  "quotes",
                  "workItems",
                  "invoices",
                ] as const
              ).map((group) => {
                const groupResults = results.filter((r) => r.group === group);
                if (groupResults.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {t(`groups.${group}`)}
                    </p>
                    <ul className="space-y-0.5">
                      {groupResults.map((result) => (
                        <li key={`${group}-${result.id}`}>
                          <button
                            type="button"
                            className="flex w-full flex-col rounded-lg px-2 py-2 text-left hover:bg-muted/60"
                            onClick={() => {
                              onOpenChange(false);
                              router.push(result.href);
                            }}
                          >
                            <span className="text-sm font-medium">
                              {result.label}
                            </span>
                            {result.subtitle ? (
                              <span className="text-xs text-muted-foreground">
                                {result.subtitle}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="px-2 py-6 text-sm text-muted-foreground">
              {t("empty")}
            </p>
          )}
        </div>
        <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <Link href="/inbox" className="hover:text-primary hover:underline">
            {t("openInbox")}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
