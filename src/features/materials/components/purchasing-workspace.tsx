"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";
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
  type ArticleRow,
  type PurchaseOrderLineRow,
  type PurchaseOrderRow,
  type StockLocationRow,
} from "@/features/materials/lib/materials";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";
import type { PurchaseOrderStatus } from "@/types/database";
import { formatEuroFromCents } from "@/utils/format";
import { cn } from "@/lib/utils";

type PurchasingWorkspaceProps = {
  orders: PurchaseOrderRow[];
  suppliers: Array<{ id: string; name: string }>;
  articles: ArticleRow[];
  locations: StockLocationRow[];
};

type DraftLine = {
  articleId: string;
  title: string;
  quantity: string;
  unit: string;
  unitCost: string;
};

function emptyLine(): DraftLine {
  return { articleId: "", title: "", quantity: "", unit: "st", unitCost: "" };
}

const STATUSES: PurchaseOrderStatus[] = [
  "draft",
  "sent",
  "partially_received",
  "received",
  "cancelled",
];

export function PurchasingWorkspace({
  orders,
  suppliers,
  articles,
  locations,
}: PurchasingWorkspaceProps) {
  const t = useTranslations("materials.purchasing");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [reference, setReference] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [receiveOrderId, setReceiveOrderId] = useState<string | null>(null);
  const [receiveLocationId, setReceiveLocationId] = useState("");
  const [receiveLines, setReceiveLines] = useState<PurchaseOrderLineRow[]>([]);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const draftCount = orders.filter((row) => row.status === "draft").length;
  const openCount = orders.filter(
    (row) => row.status === "sent" || row.status === "partially_received",
  ).length;

  const filteredArticles = useMemo(
    () => articles.filter((row) => row.isActive),
    [articles],
  );

  function createOrder() {
    if (!supplierId) {
      setError(t("errors.supplierRequired"));
      return;
    }
    const payloadLines = lines
      .map((line) => ({
        articleId: line.articleId || null,
        title: line.title.trim(),
        quantity: line.quantity,
        unit: line.unit,
        unitCost: line.unitCost,
      }))
      .filter((line) => line.title && line.quantity);
    if (payloadLines.length === 0) {
      setError(t("errors.linesRequired"));
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/purchase-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId,
            reference,
            expectedDate: expectedDate || null,
            lines: payloadLines,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) {
          setError(tCommon("error"));
          return;
        }
        setOpen(false);
        setSupplierId("");
        setReference("");
        setExpectedDate("");
        setLines([emptyLine()]);
        router.refresh();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  function updateStatus(id: string, status: PurchaseOrderStatus) {
    startTransition(async () => {
      await fetch("/api/purchase-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      router.refresh();
    });
  }

  async function openReceive(orderId: string) {
    setError(null);
    setReceiveLoading(true);
    setReceiveOrderId(orderId);
    setReceiveLocationId("");
    setReceiveQty({});
    try {
      const response = await fetch(
        `/api/purchase-orders?id=${encodeURIComponent(orderId)}`,
        { signal: AbortSignal.timeout(20_000) },
      );
      const result = (await response.json()) as {
        lines?: PurchaseOrderLineRow[];
        error?: string;
      };
      if (!response.ok || result.error) {
        setError(tCommon("error"));
        setReceiveOrderId(null);
        return;
      }
      const openLines = (result.lines ?? []).filter(
        (line) => line.receivedQuantity + 0.0001 < line.quantity,
      );
      setReceiveLines(openLines);
      const initialQty: Record<string, string> = {};
      for (const line of openLines) {
        initialQty[line.id] = String(line.quantity - line.receivedQuantity);
      }
      setReceiveQty(initialQty);
    } catch {
      setError(tCommon("error"));
      setReceiveOrderId(null);
    } finally {
      setReceiveLoading(false);
    }
  }

  function submitReceive() {
    if (!receiveOrderId || !receiveLocationId) {
      setError(t("errors.locationRequired"));
      return;
    }
    const payloadLines = receiveLines
      .map((line) => ({
        purchaseOrderLineId: line.id,
        quantity: receiveQty[line.id] ?? "",
      }))
      .filter((line) => line.quantity !== "" && Number(line.quantity) > 0);

    if (payloadLines.length === 0) {
      setError(t("errors.receiveLinesRequired"));
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/purchase-receipts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purchaseOrderId: receiveOrderId,
            locationId: receiveLocationId,
            lines: payloadLines,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok || result.error) {
          setError(
            result.error === "over_receive"
              ? t("errors.overReceive")
              : tCommon("error"),
          );
          return;
        }
        setReceiveOrderId(null);
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
          <MetaStatCard label={t("kpiTotal")} value={String(orders.length)} />
          <MetaStatCard label={t("kpiDraft")} value={String(draftCount)} />
          <MetaStatCard label={t("kpiOpen")} value={String(openCount)} />
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          {t("new")}
        </Button>
      </div>

      {error && !open ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {orders.length === 0 ? (
        <PageCard className="px-5 py-8 text-sm text-muted-foreground">
          {t("empty")}
        </PageCard>
      ) : (
        <PageCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3">{t("columns.supplier")}</th>
                  <th className="px-4 py-3">{t("columns.reference")}</th>
                  <th className="px-4 py-3">{t("columns.date")}</th>
                  <th className="px-4 py-3 text-right">{t("columns.total")}</th>
                  <th className="px-4 py-3">{t("columns.status")}</th>
                  <th className="px-4 py-3">{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border/70 last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">{order.supplierName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {order.reference || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {order.orderDate}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {order.totalCents != null
                        ? formatEuroFromCents(order.totalCents)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          order.status === "received" ? "success" : "secondary"
                        }
                        className={cn(
                          order.status === "sent" &&
                            "bg-primary/10 text-primary",
                        )}
                      >
                        {t(`status.${order.status}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {order.status === "draft" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => updateStatus(order.id, "sent")}
                          >
                            {t("send")}
                          </Button>
                        ) : null}
                        {order.status === "sent" ||
                        order.status === "partially_received" ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isPending || receiveLoading}
                            onClick={() => void openReceive(order.id)}
                          >
                            {t("receive")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("newTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.supplier")}</span>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
              >
                <option value="">{t("fields.supplierPick")}</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.reference")}</span>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("fields.expected")}</span>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </label>

            <div className="space-y-2">
              <p className="text-sm font-medium">{t("fields.lines")}</p>
              {lines.map((line, index) => (
                <div key={index} className="grid gap-2 rounded-lg border border-border/70 p-3 sm:grid-cols-2">
                  <select
                    value={line.articleId}
                    onChange={(e) => {
                      const articleId = e.target.value;
                      const article = filteredArticles.find(
                        (row) => row.id === articleId,
                      );
                      setLines((prev) =>
                        prev.map((row, i) =>
                          i === index
                            ? {
                                ...row,
                                articleId,
                                title: article?.name ?? row.title,
                                unit: article?.unit ?? row.unit,
                              }
                            : row,
                        ),
                      );
                    }}
                    className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm sm:col-span-2"
                  >
                    <option value="">{t("fields.articleAdHoc")}</option>
                    {filteredArticles.map((article) => (
                      <option key={article.id} value={article.id}>
                        {article.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={line.title}
                    placeholder={t("fields.lineTitle")}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, title: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <Input
                    inputMode="decimal"
                    value={line.quantity}
                    placeholder={t("fields.qty")}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, quantity: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <Input
                    value={line.unit}
                    placeholder={t("fields.unit")}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, unit: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  <Input
                    inputMode="decimal"
                    value={line.unitCost}
                    placeholder={t("fields.unitCost")}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, unitCost: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((prev) => [...prev, emptyLine()])}
              >
                <Plus className="size-4" />
                {t("addLine")}
              </Button>
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="button" disabled={isPending} onClick={createOrder}>
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={receiveOrderId != null}
        onOpenChange={(open) => !open && setReceiveOrderId(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("receiveTitle")}</DialogTitle>
          </DialogHeader>
          {receiveLoading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : (
            <div className="space-y-3">
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">{t("fields.location")}</span>
                <select
                  value={receiveLocationId}
                  onChange={(e) => setReceiveLocationId(e.target.value)}
                  className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
                >
                  <option value="">{t("fields.locationPick")}</option>
                  {locations
                    .filter((loc) => loc.isActive)
                    .map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                </select>
              </label>
              {receiveLines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("receiveAllDone")}
                </p>
              ) : (
                <ul className="divide-y divide-border/70 rounded-lg border border-border/70">
                  {receiveLines.map((line) => {
                    const remaining = line.quantity - line.receivedQuantity;
                    return (
                      <li key={line.id} className="space-y-2 px-3 py-3">
                        <p className="text-sm font-medium">{line.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t("receiveRemaining", {
                            received: formatQty(line.receivedQuantity, line.unit),
                            ordered: formatQty(line.quantity, line.unit),
                          })}
                        </p>
                        <Input
                          inputMode="decimal"
                          value={receiveQty[line.id] ?? ""}
                          onChange={(e) =>
                            setReceiveQty((prev) => ({
                              ...prev,
                              [line.id]: e.target.value,
                            }))
                          }
                          placeholder={t("fields.qty")}
                        />
                        {Number(receiveQty[line.id]) > remaining + 0.0001 ? (
                          <p className="text-xs text-destructive">
                            {t("errors.overReceive")}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
          {error && receiveOrderId ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReceiveOrderId(null)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              disabled={isPending || receiveLoading || receiveLines.length === 0}
              onClick={submitReceive}
            >
              {t("receiveConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="sr-only">{STATUSES.join(",")}</p>
    </div>
  );
}
