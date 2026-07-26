"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatQty,
  STOCK_LOCATION_KINDS,
  type ArticleRow,
  type StockBalanceRow,
  type StockLocationRow,
  type StockMovementRow,
} from "@/features/materials/lib/materials";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";
import type { StockLocationKind, StockMovementType } from "@/types/database";

type StockWorkspaceProps = {
  locations: StockLocationRow[];
  balances: StockBalanceRow[];
  movements: StockMovementRow[];
  articles: ArticleRow[];
};

export function StockWorkspace({
  locations,
  balances,
  movements,
  articles,
}: StockWorkspaceProps) {
  const t = useTranslations("materials.stock");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [locOpen, setLocOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [locName, setLocName] = useState("");
  const [locCode, setLocCode] = useState("");
  const [locKind, setLocKind] = useState<StockLocationKind>("warehouse");
  const [articleId, setArticleId] = useState("");
  const [movementType, setMovementType] =
    useState<StockMovementType>("receipt");
  const [quantity, setQuantity] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lowStock = balances.filter(
    (row) =>
      row.minQuantity != null && row.quantity < row.minQuantity,
  ).length;

  function createLocation() {
    if (!locName.trim()) {
      setError(t("errors.nameRequired"));
      return;
    }
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/stock-locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: locName,
            code: locCode,
            kind: locKind,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) {
          setError(tCommon("error"));
          return;
        }
        setLocOpen(false);
        setLocName("");
        setLocCode("");
        router.refresh();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  function createMovement() {
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/stock-movements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            articleId,
            movementType,
            quantity,
            fromLocationId: fromLocationId || null,
            toLocationId: toLocationId || null,
            notes,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok || result.error) {
          setError(
            result.error === "insufficient_stock"
              ? t("errors.insufficient")
              : tCommon("error"),
          );
          return;
        }
        setMoveOpen(false);
        setQuantity("");
        setNotes("");
        router.refresh();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <MetaStatCard
            label={t("kpiLocations")}
            value={String(locations.length)}
          />
          <MetaStatCard
            label={t("kpiBalances")}
            value={String(balances.length)}
          />
          <MetaStatCard label={t("kpiLow")} value={String(lowStock)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setLocOpen(true)}>
            <Plus className="size-4" />
            {t("newLocation")}
          </Button>
          <Button type="button" onClick={() => setMoveOpen(true)}>
            <Plus className="size-4" />
            {t("newMovement")}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <PageCard className="overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-sm font-medium">
            {t("locationsTitle")}
          </div>
          {locations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              {t("locationsEmpty")}
            </p>
          ) : (
            <ul className="divide-y divide-border/70">
              {locations.map((loc) => (
                <li
                  key={loc.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{loc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`kinds.${loc.kind}`)}
                      {loc.code ? ` · ${loc.code}` : ""}
                      {loc.projectName ? ` · ${loc.projectName}` : ""}
                    </p>
                  </div>
                  <Badge variant={loc.isActive ? "success" : "secondary"}>
                    {loc.isActive ? t("active") : t("inactive")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </PageCard>

        <PageCard className="overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-sm font-medium">
            {t("balancesTitle")}
          </div>
          {balances.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              {t("balancesEmpty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] text-muted-foreground uppercase">
                    <th className="px-3 py-2">{t("columns.article")}</th>
                    <th className="px-3 py-2">{t("columns.location")}</th>
                    <th className="px-3 py-2 text-right">{t("columns.qty")}</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border/70 last:border-0"
                    >
                      <td className="px-3 py-2">
                        <span className="font-medium">{row.articleName}</span>
                        {row.articleCode ? (
                          <span className="ml-1 font-mono text-xs text-muted-foreground">
                            {row.articleCode}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {row.locationName}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatQty(row.quantity, row.articleUnit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageCard>
      </div>

      <PageCard className="overflow-hidden">
        <div className="border-b border-border px-4 py-3 text-sm font-medium">
          {t("movementsTitle")}
        </div>
        {movements.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            {t("movementsEmpty")}
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {movements.map((row) => (
              <li key={row.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">
                    {t(`types.${row.movementType}`)} · {row.articleName}
                  </p>
                  <span className="tabular-nums text-muted-foreground">
                    {formatQty(row.quantity)} · {row.workDate}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {[row.fromLocationName, row.toLocationName]
                    .filter(Boolean)
                    .join(" → ") || "—"}
                  {row.notes ? ` · ${row.notes}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </PageCard>

      <Dialog open={locOpen} onOpenChange={setLocOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newLocation")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.name")}</span>
              <Input value={locName} onChange={(e) => setLocName(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.code")}</span>
              <Input value={locCode} onChange={(e) => setLocCode(e.target.value)} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.kind")}</span>
              <select
                value={locKind}
                onChange={(e) =>
                  setLocKind(e.target.value as StockLocationKind)
                }
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
              >
                {STOCK_LOCATION_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`kinds.${kind}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLocOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" disabled={isPending} onClick={createLocation}>
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newMovement")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.article")}</span>
              <select
                value={articleId}
                onChange={(e) => setArticleId(e.target.value)}
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
              >
                <option value="">{t("fields.articlePick")}</option>
                {articles
                  .filter((a) => a.isActive && a.trackStock)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.type")}</span>
              <select
                value={movementType}
                onChange={(e) =>
                  setMovementType(e.target.value as StockMovementType)
                }
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
              >
                {(
                  [
                    "receipt",
                    "issue",
                    "transfer",
                    "adjustment",
                    "return",
                  ] as StockMovementType[]
                ).map((type) => (
                  <option key={type} value={type}>
                    {t(`types.${type}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.quantity")}</span>
              <Input
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            {movementType === "issue" || movementType === "transfer" ? (
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">{t("fields.from")}</span>
                <select
                  value={fromLocationId}
                  onChange={(e) => setFromLocationId(e.target.value)}
                  className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
                >
                  <option value="">—</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {movementType !== "issue" ? (
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">{t("fields.to")}</span>
                <select
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                  className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
                >
                  <option value="">—</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.notes")}</span>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" disabled={isPending} onClick={createMovement}>
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
