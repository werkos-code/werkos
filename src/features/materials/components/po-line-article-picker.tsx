"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  euroFromCents,
  type ArticleRow,
} from "@/features/materials/lib/materials";
import type { TwobaSearchHit } from "@/features/materials/lib/twoba-client";
import { cn } from "@/lib/utils";

export type PoLinePickMode = "local" | "twoba" | "adhoc";

export type PoLineDraft = {
  mode: PoLinePickMode;
  articleId: string;
  title: string;
  quantity: string;
  unit: string;
  unitCost: string;
  twobaSupplierGln?: string;
  twobaTradeItemId?: string;
};

export function emptyPoLineDraft(): PoLineDraft {
  return {
    mode: "local",
    articleId: "",
    title: "",
    quantity: "",
    unit: "st",
    unitCost: "",
  };
}

type PoLineArticlePickerProps = {
  articles: ArticleRow[];
  value: PoLineDraft;
  onChange: (value: PoLineDraft) => void;
  disabled?: boolean;
};

export function PoLineArticlePicker({
  articles,
  value,
  onChange,
  disabled,
}: PoLineArticlePickerProps) {
  const t = useTranslations("materials.purchasing");
  const [twobaQuery, setTwobaQuery] = useState("");
  const [twobaResults, setTwobaResults] = useState<TwobaSearchHit[]>([]);
  const [twobaConfigured, setTwobaConfigured] = useState<boolean | null>(null);
  const [twobaLoading, setTwobaLoading] = useState(false);
  const [twobaError, setTwobaError] = useState<string | null>(null);

  const filteredArticles = articles.filter((row) => row.isActive);

  useEffect(() => {
    if (value.mode !== "twoba") return;
    const q = twobaQuery.trim();
    if (q.length < 2) {
      setTwobaResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setTwobaLoading(true);
        setTwobaError(null);
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
          setTwobaConfigured(result.configured ?? false);
          setTwobaResults(result.results ?? []);
          if (result.error) setTwobaError(t("catalog.searchError"));
        } catch {
          setTwobaError(t("catalog.searchError"));
          setTwobaResults([]);
        } finally {
          setTwobaLoading(false);
        }
      })();
    }, 350);

    return () => window.clearTimeout(timer);
  }, [twobaQuery, value.mode, t]);

  async function importTwobaHit(hit: TwobaSearchHit) {
    setTwobaLoading(true);
    setTwobaError(null);
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
        article?: {
          id: string;
          name: string;
          unit: string;
          purchasePriceCents: number | null;
        };
        error?: string;
      };
      if (!response.ok || !result.articleId || !result.article) {
        setTwobaError(
          result.error === "not_configured"
            ? t("catalog.notConfigured")
            : t("catalog.importError"),
        );
        return;
      }
      onChange({
        ...value,
        mode: "twoba",
        articleId: result.articleId,
        title: result.article.name,
        unit: result.article.unit || "st",
        unitCost:
          result.article.purchasePriceCents != null
            ? euroFromCents(result.article.purchasePriceCents)
            : value.unitCost,
        twobaSupplierGln: hit.supplierGln,
        twobaTradeItemId: hit.tradeItemId,
      });
      setTwobaQuery("");
      setTwobaResults([]);
    } catch {
      setTwobaError(t("catalog.importError"));
    } finally {
      setTwobaLoading(false);
    }
  }

  return (
    <div className="grid gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-2">
      <div className="flex flex-wrap gap-1 sm:col-span-2">
        {(["local", "twoba", "adhoc"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            onClick={() => onChange({ ...value, mode, articleId: "" })}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              value.mode === mode
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`catalog.modes.${mode}`)}
          </button>
        ))}
      </div>

      {value.mode === "local" ? (
        <select
          value={value.articleId}
          onChange={(e) => {
            const articleId = e.target.value;
            const article = filteredArticles.find((row) => row.id === articleId);
            onChange({
              ...value,
              articleId,
              title: article?.name ?? value.title,
              unit: article?.unit ?? value.unit,
              unitCost:
                article?.purchasePriceCents != null
                  ? euroFromCents(article.purchasePriceCents)
                  : value.unitCost,
            });
          }}
          className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm sm:col-span-2"
          disabled={disabled}
        >
          <option value="">{t("fields.articlePick")}</option>
          {filteredArticles.map((article) => (
            <option key={article.id} value={article.id}>
              {article.name}
            </option>
          ))}
        </select>
      ) : null}

      {value.mode === "twoba" ? (
        <div className="space-y-2 sm:col-span-2">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={twobaQuery}
              onChange={(e) => setTwobaQuery(e.target.value)}
              placeholder={t("catalog.searchPlaceholder")}
              className="h-9 pl-8"
              disabled={disabled || twobaLoading}
            />
          </div>
          {twobaConfigured === false ? (
            <p className="text-xs text-muted-foreground">
              {t("catalog.notConfigured")}
            </p>
          ) : null}
          {twobaError ? (
            <p className="text-xs text-destructive">{twobaError}</p>
          ) : null}
          {value.articleId ? (
            <p className="text-xs text-primary">{t("catalog.selected", { title: value.title })}</p>
          ) : null}
          {twobaResults.length > 0 ? (
            <ul className="max-h-40 divide-y divide-border/70 overflow-y-auto rounded-lg border border-border/70">
              {twobaResults.map((hit) => (
                <li key={`${hit.supplierGln}-${hit.tradeItemId}`}>
                  <button
                    type="button"
                    className="hover:bg-muted/40 block w-full px-3 py-2 text-left text-sm"
                    disabled={disabled || twobaLoading}
                    onClick={() => void importTwobaHit(hit)}
                  >
                    <span className="font-medium">{hit.name}</span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">
                      {hit.manufacturer ?? "—"} · {hit.tradeItemId}
                      {hit.ean ? ` · EAN ${hit.ean}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : twobaLoading ? (
            <p className="text-xs text-muted-foreground">{t("loading")}</p>
          ) : twobaQuery.trim().length >= 2 ? (
            <p className="text-xs text-muted-foreground">{t("catalog.noResults")}</p>
          ) : null}
        </div>
      ) : null}

      <Input
        value={value.title}
        placeholder={t("fields.lineTitle")}
        onChange={(e) => onChange({ ...value, title: e.target.value })}
        className="h-9 sm:col-span-2"
        disabled={disabled || value.mode === "local" || value.mode === "twoba"}
      />
      <Input
        inputMode="decimal"
        value={value.quantity}
        placeholder={t("fields.qty")}
        onChange={(e) => onChange({ ...value, quantity: e.target.value })}
        className="h-9"
        disabled={disabled}
      />
      <Input
        value={value.unit}
        placeholder={t("fields.unit")}
        onChange={(e) => onChange({ ...value, unit: e.target.value })}
        className="h-9"
        disabled={disabled}
      />
      <Input
        inputMode="decimal"
        value={value.unitCost}
        placeholder={t("fields.unitCost")}
        onChange={(e) => onChange({ ...value, unitCost: e.target.value })}
        className="h-9 sm:col-span-2"
        disabled={disabled}
      />
    </div>
  );
}
