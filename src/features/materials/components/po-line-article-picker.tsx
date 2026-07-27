"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import {
  euroFromCents,
  type ArticleRow,
} from "@/features/materials/lib/materials";
import { TwobaCatalogSearchPanel } from "@/features/materials/components/twoba-catalog-search-panel";
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
  const tCatalog = useTranslations("materials.catalog");

  const filteredArticles = articles.filter((row) => row.isActive);

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
            {tCatalog(`modes.${mode}`)}
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
          <TwobaCatalogSearchPanel
            disabled={disabled}
            onImported={(article) =>
              onChange({
                ...value,
                mode: "twoba",
                articleId: article.id,
                title: article.name,
                unit: article.unit || "st",
                unitCost:
                  article.purchasePriceCents != null
                    ? euroFromCents(article.purchasePriceCents)
                    : value.unitCost,
              })
            }
          />
          {value.articleId ? (
            <p className="text-xs text-primary">
              {tCatalog("selected", { title: value.title })}
            </p>
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
