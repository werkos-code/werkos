"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type ArticleSupplierPriceRow,
} from "@/features/materials/lib/materials";
import { formatEuroFromCents } from "@/utils/format";

type ArticleSupplierPricesPanelProps = {
  articleId: string;
  suppliers: Array<{ id: string; name: string }>;
};

export function ArticleSupplierPricesPanel({
  articleId,
  suppliers,
}: ArticleSupplierPricesPanelProps) {
  const t = useTranslations("materials.supplierPrices");
  const tCommon = useTranslations("common");
  const [prices, setPrices] = useState<ArticleSupplierPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [supplierSku, setSupplierSku] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [leadDays, setLeadDays] = useState("");
  const [isPreferred, setIsPreferred] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function reload() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/article-supplier-prices?articleId=${encodeURIComponent(articleId)}`,
        { signal: AbortSignal.timeout(20_000) },
      );
      const result = (await response.json()) as {
        prices?: ArticleSupplierPriceRow[];
        error?: string;
      };
      if (!response.ok || result.error) {
        setError(tCommon("error"));
        setPrices([]);
        return;
      }
      setPrices(result.prices ?? []);
      setError(null);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [articleId]);

  function addPrice() {
    if (!supplierId) {
      setError(t("errors.supplierRequired"));
      return;
    }
    const supplier = suppliers.find((row) => row.id === supplierId);
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/article-supplier-prices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId,
            supplierId,
            supplierName: supplier?.name ?? "",
            supplierSku,
            unitCost,
            leadTimeDays: leadDays,
            isPreferred,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) {
          setError(tCommon("error"));
          return;
        }
        setSupplierId("");
        setSupplierSku("");
        setUnitCost("");
        setLeadDays("");
        setIsPreferred(false);
        await reload();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  function removePrice(id: string) {
    startTransition(async () => {
      await fetch(`/api/article-supplier-prices?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await reload();
    });
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <h4 className="text-sm font-medium">{t("title")}</h4>
      <p className="text-xs text-muted-foreground">{t("hint")}</p>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : prices.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-border/70 rounded-lg border border-border/70">
          {prices.map((price) => (
            <li
              key={price.id}
              className="flex items-start justify-between gap-3 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">
                  {price.supplierName}
                  {price.isPreferred ? (
                    <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary">
                      {t("preferred")}
                    </Badge>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {price.supplierSku ? `${price.supplierSku} · ` : ""}
                  {price.unitCostCents != null
                    ? formatEuroFromCents(price.unitCostCents)
                    : "—"}
                  {price.leadTimeDays != null
                    ? ` · ${t("leadDays", { days: price.leadTimeDays })}`
                    : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isPending}
                onClick={() => removePrice(price.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {suppliers.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noSuppliers")}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm sm:col-span-2"
          >
            <option value="">{t("pickSupplier")}</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
          <Input
            value={supplierSku}
            placeholder={t("fields.sku")}
            onChange={(e) => setSupplierSku(e.target.value)}
            className="h-9"
          />
          <Input
            inputMode="decimal"
            value={unitCost}
            placeholder={t("fields.cost")}
            onChange={(e) => setUnitCost(e.target.value)}
            className="h-9"
          />
          <Input
            inputMode="numeric"
            value={leadDays}
            placeholder={t("fields.leadDays")}
            onChange={(e) => setLeadDays(e.target.value)}
            className="h-9"
          />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={isPreferred}
              onChange={(e) => setIsPreferred(e.target.checked)}
            />
            {t("fields.preferred")}
          </label>
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={addPrice}
            className="sm:col-span-2"
          >
            <Plus className="size-4" />
            {t("add")}
          </Button>
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
