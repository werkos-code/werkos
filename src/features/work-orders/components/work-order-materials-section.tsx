"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatQty,
  type ArticleRow,
  type WorkOrderMaterialSummaryRow,
} from "@/features/materials/lib/materials";

type WorkOrderMaterialsSectionProps = {
  workOrderId: string;
  projectId: string;
  disabled?: boolean;
};

export function WorkOrderMaterialsSection({
  workOrderId,
  projectId,
  disabled,
}: WorkOrderMaterialsSectionProps) {
  const t = useTranslations("workOrders.materials");
  const tCommon = useTranslations("common");
  const [rows, setRows] = useState<WorkOrderMaterialSummaryRow[]>([]);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [workItems, setWorkItems] = useState<Array<{ id: string; title: string }>>(
    [],
  );
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [stockLocations, setStockLocations] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [pickId, setPickId] = useState("");
  const [articleId, setArticleId] = useState("");
  const [title, setTitle] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("st");
  const [deductStock, setDeductStock] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function reload() {
    setLoading(true);
    try {
      const [materialsRes, linksRes] = await Promise.all([
        fetch(
          `/api/work-order-materials?workOrderId=${encodeURIComponent(workOrderId)}`,
          { signal: AbortSignal.timeout(20_000) },
        ),
        fetch(
          `/api/work-order-work-items?workOrderId=${encodeURIComponent(workOrderId)}`,
          { signal: AbortSignal.timeout(20_000) },
        ),
      ]);
      const materials = (await materialsRes.json()) as {
        rows?: WorkOrderMaterialSummaryRow[];
        error?: string;
      };
      const links = (await linksRes.json()) as {
        linkedWorkItemIds?: string[];
        workItems?: Array<{ id: string; title: string }>;
        error?: string;
      };
      if (!materialsRes.ok || materials.error || !linksRes.ok || links.error) {
        setError(tCommon("error"));
        return;
      }
      setRows(materials.rows ?? []);
      setLinkedIds(links.linkedWorkItemIds ?? []);
      setWorkItems(links.workItems ?? []);
      setError(null);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    void (async () => {
      try {
        const [articlesRes, locationsRes] = await Promise.all([
          fetch("/api/articles", { signal: AbortSignal.timeout(20_000) }),
          fetch("/api/stock-locations", { signal: AbortSignal.timeout(20_000) }),
        ]);
        const articlesResult = (await articlesRes.json()) as {
          articles?: ArticleRow[];
        };
        const locationsResult = (await locationsRes.json()) as {
          locations?: Array<{ id: string; name: string }>;
        };
        setArticles(articlesResult.articles ?? []);
        setStockLocations(locationsResult.locations ?? []);
      } catch {
        setArticles([]);
        setStockLocations([]);
      }
    })();
  }, [workOrderId, projectId]);

  function linkItem(workItemId: string) {
    if (!workItemId) return;
    startTransition(async () => {
      await fetch("/api/work-order-work-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderId, workItemId }),
      });
      setPickId("");
      await reload();
    });
  }

  function unlinkItem(workItemId: string) {
    startTransition(async () => {
      await fetch(
        `/api/work-order-work-items?workOrderId=${encodeURIComponent(workOrderId)}&workItemId=${encodeURIComponent(workItemId)}`,
        { method: "DELETE" },
      );
      await reload();
    });
  }

  function bookDirect() {
    const selected = articles.find((a) => a.id === articleId);
    const usageTitle = title.trim() || selected?.name || "";
    if (!usageTitle || !qty) {
      setError(t("errors.usageRequired"));
      return;
    }
    if (deductStock) {
      if (!articleId || !selected?.trackStock) {
        setError(t("errors.stockArticleRequired"));
        return;
      }
      if (!locationId) {
        setError(t("errors.locationRequired"));
        return;
      }
    }
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/work-order-material-usages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workOrderId,
            articleId: articleId || null,
            title: usageTitle,
            quantity: qty,
            unit: unit || selected?.unit || "st",
            deductStock: deductStock && !!articleId && !!locationId,
            locationId: deductStock ? locationId : null,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) {
          const result = (await response.json()) as { error?: string };
          setError(
            result.error === "insufficient_stock"
              ? t("errors.insufficientStock")
              : tCommon("error"),
          );
          return;
        }
        setArticleId("");
        setTitle("");
        setQty("");
        setUnit("st");
        setDeductStock(false);
        setLocationId("");
        await reload();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  function deleteDirect(id: string) {
    startTransition(async () => {
      await fetch(`/api/work-order-material-usages?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await reload();
    });
  }

  const available = workItems.filter((item) => !linkedIds.includes(item.id));
  const linkedRows = rows.filter((row) => row.kind !== "direct");
  const directRows = rows.filter((row) => row.kind === "direct");

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t("title")}</h3>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>

        {linkedIds.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {workItems
              .filter((item) => linkedIds.includes(item.id))
              .map((item) => (
                <li key={item.id}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={disabled || isPending}
                    onClick={() => unlinkItem(item.id)}
                  >
                    {item.title} ×
                  </Button>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noLinks")}</p>
        )}

        {available.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <select
              value={pickId}
              onChange={(e) => setPickId(e.target.value)}
              className="border-input bg-background h-9 min-w-[12rem] flex-1 rounded-lg border px-2.5 text-sm"
              disabled={disabled || isPending}
            >
              <option value="">{t("pickWorkItem")}</option>
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              disabled={disabled || isPending || !pickId}
              onClick={() => linkItem(pickId)}
            >
              {t("link")}
            </Button>
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : linkedRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border/70 rounded-lg border border-border/70">
            {linkedRows.map((row, index) => (
              <li
                key={`${row.kind}-${row.workItemId}-${row.title}-${index}`}
                className="px-3 py-2 text-sm"
              >
                <p className="font-medium">
                  {formatQty(row.quantity, row.unit)} · {row.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(`kinds.${row.kind}`)} · {row.workItemTitle}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-border/70 pt-4">
        <h3 className="text-sm font-medium">{t("directTitle")}</h3>
        <p className="text-xs text-muted-foreground">{t("directHint")}</p>
        <div className="grid gap-2 sm:grid-cols-4">
          <select
            value={articleId}
            onChange={(e) => {
              const id = e.target.value;
              setArticleId(id);
              const article = articles.find((a) => a.id === id);
              if (article) {
                setTitle(article.name);
                setUnit(article.unit);
              }
            }}
            className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm sm:col-span-2"
            disabled={disabled || isPending}
          >
            <option value="">{t("adHoc")}</option>
            {articles
              .filter((a) => a.isActive)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
          <Input
            value={title}
            placeholder={t("fields.title")}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 sm:col-span-2"
            disabled={disabled || isPending}
          />
          <Input
            inputMode="decimal"
            value={qty}
            placeholder={t("fields.qty")}
            onChange={(e) => setQty(e.target.value)}
            className="h-9"
            disabled={disabled || isPending}
          />
          <Input
            value={unit}
            placeholder={t("fields.unit")}
            onChange={(e) => setUnit(e.target.value)}
            className="h-9"
            disabled={disabled || isPending}
          />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={deductStock}
              onChange={(e) => setDeductStock(e.target.checked)}
              disabled={disabled || isPending}
            />
            {t("deductStock")}
          </label>
          {deductStock ? (
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm sm:col-span-2"
              disabled={disabled || isPending}
            >
              <option value="">{t("fields.locationPick")}</option>
              {stockLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="sm:col-span-2"
            disabled={disabled || isPending}
            onClick={bookDirect}
          >
            {t("bookDirect")}
          </Button>
        </div>

        {directRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("directEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border/70 rounded-lg border border-border/70">
            {directRows.map((row) => (
              <li
                key={row.id}
                className="flex items-start justify-between gap-2 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {formatQty(row.quantity, row.unit)} · {row.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("kinds.direct")}
                  </p>
                </div>
                {row.id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled || isPending}
                    onClick={() => deleteDirect(row.id!)}
                    aria-label={t("deleteDirect")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
