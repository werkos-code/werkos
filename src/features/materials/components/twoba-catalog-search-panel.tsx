"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { euroFromCents } from "@/features/materials/lib/materials";
import type { TwobaSearchHit } from "@/features/materials/lib/twoba-client";

type TwobaCatalogSearchPanelProps = {
  onImported: (article: {
    id: string;
    name: string;
    unit: string;
    purchasePriceCents: number | null;
    created: boolean;
  }) => void;
  disabled?: boolean;
};

export function TwobaCatalogSearchPanel({
  onImported,
  disabled,
}: TwobaCatalogSearchPanelProps) {
  const t = useTranslations("materials.catalog");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TwobaSearchHit[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(
            `/api/catalog/twoba?q=${encodeURIComponent(q)}`,
            { signal: AbortSignal.timeout(20_000) },
          );
          const result = (await response.json()) as {
            configured?: boolean;
            results?: TwobaSearchHit[];
            error?: string;
          };
          setConfigured(result.configured ?? false);
          setResults(result.results ?? []);
          if (result.error) setError(t("searchError"));
        } catch {
          setError(t("searchError"));
          setResults([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query, t]);

  async function importHit(hit: TwobaSearchHit) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/catalog/twoba", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierGln: hit.supplierGln,
          tradeItemId: hit.tradeItemId,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await response.json()) as {
        articleId?: string;
        created?: boolean;
        article?: {
          id: string;
          name: string;
          unit: string;
          purchasePriceCents: number | null;
        };
        error?: string;
      };
      if (!response.ok || !result.articleId || !result.article) {
        setError(
          result.error === "not_configured"
            ? t("notConfigured")
            : t("importError"),
        );
        return;
      }
      onImported({
        id: result.article.id,
        name: result.article.name,
        unit: result.article.unit,
        purchasePriceCents: result.article.purchasePriceCents,
        created: result.created ?? false,
      });
      setQuery("");
      setResults([]);
    } catch {
      setError(t("importError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-9 pl-8"
          disabled={disabled || loading}
        />
      </div>
      {configured === false ? (
        <p className="text-xs text-muted-foreground">{t("notConfigured")}</p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {results.length > 0 ? (
        <ul className="max-h-56 divide-y divide-border/70 overflow-y-auto rounded-lg border border-border/70">
          {results.map((hit) => (
            <li key={`${hit.supplierGln}-${hit.tradeItemId}`}>
              <button
                type="button"
                className="hover:bg-muted/40 block w-full px-3 py-2 text-left text-sm"
                disabled={disabled || loading}
                onClick={() => void importHit(hit)}
              >
                <span className="font-medium">{hit.name}</span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  {hit.manufacturer ?? "—"} · {hit.tradeItemId}
                  {hit.ean ? ` · EAN ${hit.ean}` : ""}
                  {hit.purchasePriceCents != null
                    ? ` · ${euroFromCents(hit.purchasePriceCents)}`
                    : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : loading ? (
        <p className="text-xs text-muted-foreground">{t("loading")}</p>
      ) : query.trim().length >= 2 ? (
        <p className="text-xs text-muted-foreground">{t("noResults")}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{t("searchHint")}</p>
      )}
    </div>
  );
}
