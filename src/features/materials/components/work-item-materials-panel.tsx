"use client";

import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatQty, type ArticleRow } from "@/features/materials/lib/materials";
import type {
  MaterialUsageRow,
  ProjectMaterialLineRow,
} from "@/features/materials/lib/materials";
import { PageCard } from "@/features/shell/components/page-card";

type WorkItemMaterialsPanelProps = {
  workItemId: string;
  projectId: string;
  isGroup: boolean;
  articles: ArticleRow[];
  onChanged: () => void;
};

export function WorkItemMaterialsPanel({
  workItemId,
  projectId,
  isGroup,
  articles,
  onChanged,
}: WorkItemMaterialsPanelProps) {
  const t = useTranslations("materials.workItem");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [lines, setLines] = useState<ProjectMaterialLineRow[]>([]);
  const [usages, setUsages] = useState<MaterialUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [articleId, setArticleId] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("st");
  const [usageTitle, setUsageTitle] = useState("");
  const [usageQty, setUsageQty] = useState("");
  const [usageLineId, setUsageLineId] = useState("");
  const [usageArticleId, setUsageArticleId] = useState("");
  const [deductStock, setDeductStock] = useState(false);
  const [usageLocationId, setUsageLocationId] = useState("");
  const [stockLocations, setStockLocations] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [reserveLine, setReserveLine] = useState<ProjectMaterialLineRow | null>(
    null,
  );
  const [reserveLocationId, setReserveLocationId] = useState("");
  const [reserveQty, setReserveQty] = useState("");
  const [isPending, startTransition] = useTransition();

  async function reload() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/work-item-materials?workItemId=${encodeURIComponent(workItemId)}`,
        { signal: AbortSignal.timeout(20_000) },
      );
      const result = (await response.json()) as {
        lines?: ProjectMaterialLineRow[];
        usages?: MaterialUsageRow[];
        error?: string;
      };
      if (!response.ok || result.error) {
        setError(tCommon("error"));
        setLines([]);
        setUsages([]);
        return;
      }
      setLines(result.lines ?? []);
      setUsages(result.usages ?? []);
      setError(null);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isGroup) {
      setLines([]);
      setUsages([]);
      setLoading(false);
      return;
    }
    void reload();
    void (async () => {
      try {
        const response = await fetch("/api/stock-locations", {
          signal: AbortSignal.timeout(20_000),
        });
        const result = (await response.json()) as {
          locations?: Array<{ id: string; name: string }>;
        };
        setStockLocations(result.locations ?? []);
      } catch {
        setStockLocations([]);
      }
    })();
  }, [workItemId, isGroup]);

  function addLine() {
    const selected = articles.find((a) => a.id === articleId);
    const lineTitle = title.trim() || selected?.name || "";
    if (!lineTitle) {
      setError(t("errors.titleRequired"));
      return;
    }
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/material-lines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            workItemId,
            articleId: articleId || null,
            title: lineTitle,
            estimatedQuantity: qty || 0,
            unit: unit || selected?.unit || "st",
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) {
          setError(tCommon("error"));
          return;
        }
        setTitle("");
        setArticleId("");
        setQty("");
        await reload();
        onChanged();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  function addUsage() {
    const line = lines.find((l) => l.id === usageLineId);
    const usageName = usageTitle.trim() || line?.title || "";
    const resolvedArticleId =
      line?.articleId ?? (usageArticleId || null);
    const article = resolvedArticleId
      ? articles.find((a) => a.id === resolvedArticleId)
      : null;
    if (!usageName || !usageQty) {
      setError(t("errors.usageRequired"));
      return;
    }
    if (deductStock) {
      if (!resolvedArticleId || !article?.trackStock) {
        setError(t("errors.stockArticleRequired"));
        return;
      }
      if (!usageLocationId) {
        setError(t("errors.locationRequired"));
        return;
      }
    }
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/material-usages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workItemId,
            materialLineId: usageLineId || null,
            articleId: resolvedArticleId,
            title: usageName,
            quantity: usageQty,
            unit: line?.unit ?? unit,
            deductStock: deductStock && !!resolvedArticleId && !!usageLocationId,
            locationId: deductStock ? usageLocationId : null,
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
        setUsageTitle("");
        setUsageQty("");
        setUsageLineId("");
        setUsageArticleId("");
        setDeductStock(false);
        setUsageLocationId("");
        await reload();
        onChanged();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  function submitReserve() {
    if (!reserveLine?.articleId || !reserveLocationId || !reserveQty) {
      setError(t("errors.reserveRequired"));
      return;
    }
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/stock-reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId: reserveLine.articleId,
            locationId: reserveLocationId,
            projectId,
            materialLineId: reserveLine.id,
            quantity: reserveQty,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok || result.error) {
          setError(
            result.error === "insufficient_available"
              ? t("errors.insufficientAvailable")
              : tCommon("error"),
          );
          return;
        }
        setReserveLine(null);
        setReserveLocationId("");
        setReserveQty("");
        await reload();
        onChanged();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  function deleteLine(id: string) {
    startTransition(async () => {
      await fetch(`/api/material-lines?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await reload();
      onChanged();
    });
  }

  function deleteUsage(id: string) {
    startTransition(async () => {
      await fetch(`/api/material-usages?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await reload();
      onChanged();
    });
  }

  if (isGroup) {
    return (
      <PageCard className="p-4">
        <p className="text-sm text-muted-foreground">{t("groupHint")}</p>
      </PageCard>
    );
  }

  return (
    <div className="space-y-4">
      <PageCard className="space-y-3 p-4">
        <h3 className="text-sm font-medium">{t("planTitle")}</h3>
        <p className="text-xs text-muted-foreground">{t("planHint")}</p>
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
          />
          <Input
            inputMode="decimal"
            value={qty}
            placeholder={t("fields.qty")}
            onChange={(e) => setQty(e.target.value)}
            className="h-9"
          />
          <Input
            value={unit}
            placeholder={t("fields.unit")}
            onChange={(e) => setUnit(e.target.value)}
            className="h-9"
          />
          <Button
            type="button"
            size="sm"
            className="sm:col-span-2"
            disabled={isPending}
            onClick={addLine}
          >
            {t("addPlan")}
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("planEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {lines.map((line) => (
              <li
                key={line.id}
                className="flex items-start justify-between gap-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{line.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("lineStatus", {
                      expected: formatQty(line.estimatedQuantity, line.unit),
                      reserved: formatQty(line.reservedQuantity, line.unit),
                      actual: formatQty(line.usedQuantity, line.unit),
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {line.articleId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => {
                        setReserveLine(line);
                        setReserveQty(
                          String(
                            Math.max(
                              0,
                              line.estimatedQuantity -
                                line.reservedQuantity -
                                line.usedQuantity,
                            ) || line.estimatedQuantity,
                          ),
                        );
                        setReserveLocationId("");
                        setError(null);
                      }}
                    >
                      {t("reserve")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending}
                    onClick={() => deleteLine(line.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PageCard>

      <PageCard className="space-y-3 p-4">
        <h3 className="text-sm font-medium">{t("usageTitle")}</h3>
        <div className="grid gap-2 sm:grid-cols-4">
          <select
            value={usageLineId}
            onChange={(e) => {
              const id = e.target.value;
              setUsageLineId(id);
              const line = lines.find((l) => l.id === id);
              if (line) {
                setUsageTitle(line.title);
                setUsageArticleId(line.articleId ?? "");
              } else {
                setUsageArticleId("");
              }
            }}
            className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm sm:col-span-2"
          >
            <option value="">{t("freeUsage")}</option>
            {lines.map((line) => (
              <option key={line.id} value={line.id}>
                {line.title}
              </option>
            ))}
          </select>
          <Input
            value={usageTitle}
            placeholder={t("fields.title")}
            onChange={(e) => setUsageTitle(e.target.value)}
            className="h-9 sm:col-span-2"
          />
          <Input
            inputMode="decimal"
            value={usageQty}
            placeholder={t("fields.qty")}
            onChange={(e) => setUsageQty(e.target.value)}
            className="h-9"
          />
          {!usageLineId ? (
            <select
              value={usageArticleId}
              onChange={(e) => setUsageArticleId(e.target.value)}
              className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm sm:col-span-2"
            >
              <option value="">{t("adHoc")}</option>
              {articles
                .filter((a) => a.isActive && a.trackStock)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          ) : null}
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={deductStock}
              onChange={(e) => setDeductStock(e.target.checked)}
              disabled={
                !(
                  (usageLineId
                    ? lines.find((l) => l.id === usageLineId)?.articleId
                    : usageArticleId) &&
                  articles.find(
                    (a) =>
                      a.id ===
                      (usageLineId
                        ? lines.find((l) => l.id === usageLineId)?.articleId
                        : usageArticleId),
                  )?.trackStock
                )
              }
            />
            {t("deductStock")}
          </label>
          {deductStock ? (
            <select
              value={usageLocationId}
              onChange={(e) => setUsageLocationId(e.target.value)}
              className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm sm:col-span-2"
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
            className="sm:col-span-3"
            disabled={isPending}
            onClick={addUsage}
          >
            {t("addUsage")}
          </Button>
        </div>
        {usages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("usageEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {usages.map((usage) => (
              <li
                key={usage.id}
                className="flex items-start justify-between gap-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {formatQty(usage.quantity, usage.unit)} · {usage.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {usage.userName} · {usage.workDate}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={isPending}
                  onClick={() => deleteUsage(usage.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </PageCard>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {reserveLine ? (
        <PageCard className="space-y-3 border-primary/30 p-4">
          <h4 className="text-sm font-medium">{t("reserveTitle")}</h4>
          <p className="text-sm text-muted-foreground">{reserveLine.title}</p>
          <select
            value={reserveLocationId}
            onChange={(e) => setReserveLocationId(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
          >
            <option value="">{t("fields.locationPick")}</option>
            {stockLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <Input
            inputMode="decimal"
            value={reserveQty}
            onChange={(e) => setReserveQty(e.target.value)}
            placeholder={t("fields.qty")}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={submitReserve}
            >
              {t("reserveConfirm")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setReserveLine(null)}
            >
              {tCommon("cancel")}
            </Button>
          </div>
        </PageCard>
      ) : null}

      <p className="sr-only">{locale}</p>
    </div>
  );
}
