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
  euroFromCents,
  type ArticleRow,
  type PurchaseOrderLineRow,
  type PurchaseOrderMatchLineRow,
  type PurchaseOrderRow,
  type StockLocationRow,
  type SupplierInvoiceRow,
} from "@/features/materials/lib/materials";
import {
  PoLineArticlePicker,
  emptyPoLineDraft,
  type PoLineDraft,
} from "@/features/materials/components/po-line-article-picker";
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
  const [lines, setLines] = useState<PoLineDraft[]>([emptyPoLineDraft()]);
  const [receiveOrderId, setReceiveOrderId] = useState<string | null>(null);
  const [receiveLocationId, setReceiveLocationId] = useState("");
  const [receiveLines, setReceiveLines] = useState<PurchaseOrderLineRow[]>([]);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [matchOrderId, setMatchOrderId] = useState<string | null>(null);
  const [matchLines, setMatchLines] = useState<PurchaseOrderMatchLineRow[]>([]);
  const [matchInvoices, setMatchInvoices] = useState<SupplierInvoiceRow[]>([]);
  const [matchOverallStatus, setMatchOverallStatus] = useState<string | null>(
    null,
  );
  const [matchLoading, setMatchLoading] = useState(false);
  const [invoiceOrderId, setInvoiceOrderId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceLines, setInvoiceLines] = useState<PurchaseOrderLineRow[]>([]);
  const [invoiceQty, setInvoiceQty] = useState<Record<string, string>>({});
  const [invoiceCost, setInvoiceCost] = useState<Record<string, string>>({});
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const draftCount = orders.filter((row) => row.status === "draft").length;
  const openCount = orders.filter(
    (row) => row.status === "sent" || row.status === "partially_received",
  ).length;

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
        setLines([emptyPoLineDraft()]);
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

  async function openMatch(orderId: string) {
    setError(null);
    setMatchLoading(true);
    setMatchOrderId(orderId);
    try {
      const response = await fetch(
        `/api/purchase-order-match?purchaseOrderId=${encodeURIComponent(orderId)}`,
        { signal: AbortSignal.timeout(20_000) },
      );
      const result = (await response.json()) as {
        lines?: PurchaseOrderMatchLineRow[];
        invoices?: SupplierInvoiceRow[];
        overallStatus?: string;
        error?: string;
      };
      if (!response.ok || result.error) {
        setError(tCommon("error"));
        setMatchOrderId(null);
        return;
      }
      setMatchLines(result.lines ?? []);
      setMatchInvoices(result.invoices ?? []);
      setMatchOverallStatus(result.overallStatus ?? null);
    } catch {
      setError(tCommon("error"));
      setMatchOrderId(null);
    } finally {
      setMatchLoading(false);
    }
  }

  async function openInvoice(orderId: string) {
    setError(null);
    setInvoiceLoading(true);
    setInvoiceOrderId(orderId);
    setInvoiceNumber("");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setInvoiceQty({});
    setInvoiceCost({});
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
        setInvoiceOrderId(null);
        return;
      }
      const billable = (result.lines ?? []).filter(
        (line) => line.receivedQuantity > 0,
      );
      setInvoiceLines(billable);
      const qty: Record<string, string> = {};
      const cost: Record<string, string> = {};
      for (const line of billable) {
        qty[line.id] = String(line.receivedQuantity);
        cost[line.id] =
          line.unitCostCents != null ? euroFromCents(line.unitCostCents) : "";
      }
      setInvoiceQty(qty);
      setInvoiceCost(cost);
    } catch {
      setError(tCommon("error"));
      setInvoiceOrderId(null);
    } finally {
      setInvoiceLoading(false);
    }
  }

  function submitInvoice() {
    if (!invoiceOrderId || !invoiceNumber.trim()) {
      setError(t("errors.invoiceNumberRequired"));
      return;
    }
    const payloadLines = invoiceLines
      .map((line) => ({
        purchaseOrderLineId: line.id,
        quantity: invoiceQty[line.id] ?? "",
        unitCost: invoiceCost[line.id] ?? "",
      }))
      .filter((line) => line.quantity !== "" && Number(line.quantity) > 0);

    if (payloadLines.length === 0) {
      setError(t("errors.invoiceLinesRequired"));
      return;
    }

    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/supplier-invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purchaseOrderId: invoiceOrderId,
            invoiceNumber: invoiceNumber.trim(),
            invoiceDate: invoiceDate || null,
            lines: payloadLines,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok || result.error) {
          setError(
            result.error === "po_not_ready"
              ? t("errors.poNotReady")
              : tCommon("error"),
          );
          return;
        }
        setInvoiceOrderId(null);
        router.refresh();
      } catch {
        setError(tCommon("error"));
      }
    });
  }

  function deleteSupplierInvoice(id: string) {
    startTransition(async () => {
      await fetch(`/api/supplier-invoices?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (matchOrderId) {
        await openMatch(matchOrderId);
      }
      router.refresh();
    });
  }

  function matchBadgeVariant(status: string) {
    if (status === "matched") return "success";
    if (status === "awaiting_invoice") return "secondary";
    return "destructive";
  }

  const canMatch = (status: PurchaseOrderStatus) =>
    status === "sent" ||
    status === "partially_received" ||
    status === "received";

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
            <table className="data-table min-w-[48rem]">
              <thead>
                <tr>
                  <th>{t("columns.supplier")}</th>
                  <th>{t("columns.reference")}</th>
                  <th>{t("columns.date")}</th>
                  <th className="text-right">{t("columns.total")}</th>
                  <th>{t("columns.status")}</th>
                  <th>{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-medium">{order.supplierName}</td>
                    <td className="text-muted-foreground">
                      {order.reference || "—"}
                    </td>
                    <td className="text-muted-foreground">
                      {order.orderDate}
                    </td>
                    <td className="text-right tabular-nums text-muted-foreground">
                      {order.totalCents != null
                        ? formatEuroFromCents(order.totalCents)
                        : "—"}
                    </td>
                    <td>
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
                    <td>
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
                        {canMatch(order.status) ? (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isPending || matchLoading}
                              onClick={() => void openInvoice(order.id)}
                            >
                              {t("invoice")}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isPending || matchLoading}
                              onClick={() => void openMatch(order.id)}
                            >
                              {t("match")}
                            </Button>
                          </>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
              <p className="text-xs text-muted-foreground">{t("catalog.hint")}</p>
              {lines.map((line, index) => (
                <PoLineArticlePicker
                  key={index}
                  articles={articles}
                  value={line}
                  disabled={isPending}
                  onChange={(next) =>
                    setLines((prev) =>
                      prev.map((row, i) => (i === index ? next : row)),
                    )
                  }
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLines((prev) => [...prev, emptyPoLineDraft()])}
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

      <Dialog
        open={invoiceOrderId != null}
        onOpenChange={(open) => !open && setInvoiceOrderId(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("invoiceTitle")}</DialogTitle>
          </DialogHeader>
          {invoiceLoading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : (
            <div className="space-y-3">
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">
                  {t("fields.invoiceNumber")}
                </span>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">
                  {t("fields.invoiceDate")}
                </span>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </label>
              {invoiceLines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("invoiceNoReceived")}
                </p>
              ) : (
                <ul className="divide-y divide-border/70 rounded-lg border border-border/70">
                  {invoiceLines.map((line) => (
                    <li key={line.id} className="space-y-2 px-3 py-3">
                      <p className="text-sm font-medium">{line.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("invoiceReceivedHint", {
                          qty: formatQty(line.receivedQuantity, line.unit),
                        })}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          inputMode="decimal"
                          value={invoiceQty[line.id] ?? ""}
                          onChange={(e) =>
                            setInvoiceQty((prev) => ({
                              ...prev,
                              [line.id]: e.target.value,
                            }))
                          }
                          placeholder={t("fields.qty")}
                        />
                        <Input
                          inputMode="decimal"
                          value={invoiceCost[line.id] ?? ""}
                          onChange={(e) =>
                            setInvoiceCost((prev) => ({
                              ...prev,
                              [line.id]: e.target.value,
                            }))
                          }
                          placeholder={t("fields.unitCost")}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {error && invoiceOrderId ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInvoiceOrderId(null)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              disabled={isPending || invoiceLoading || invoiceLines.length === 0}
              onClick={submitInvoice}
            >
              {t("invoiceConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={matchOrderId != null}
        onOpenChange={(open) => !open && setMatchOrderId(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("matchTitle")}</DialogTitle>
          </DialogHeader>
          {matchLoading ? (
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          ) : (
            <div className="space-y-4">
              {matchOverallStatus ? (
                <Badge variant={matchBadgeVariant(matchOverallStatus)}>
                  {t(`matchStatus.${matchOverallStatus}`)}
                </Badge>
              ) : null}
              <div className="overflow-x-auto">
                <table className="data-table min-w-[40rem]">
                  <thead>
                    <tr>
                      <th>{t("matchColumns.line")}</th>
                      <th className="text-right">
                        {t("matchColumns.ordered")}
                      </th>
                      <th className="text-right">
                        {t("matchColumns.received")}
                      </th>
                      <th className="text-right">
                        {t("matchColumns.invoiced")}
                      </th>
                      <th className="text-right">
                        {t("matchColumns.poPrice")}
                      </th>
                      <th className="text-right">
                        {t("matchColumns.invoicePrice")}
                      </th>
                      <th>{t("matchColumns.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchLines.map((line) => (
                      <tr key={line.purchaseOrderLineId}>
                        <td className="font-medium">{line.title}</td>
                        <td className="text-right tabular-nums text-muted-foreground">
                          {formatQty(line.orderedQuantity, line.unit)}
                        </td>
                        <td className="text-right tabular-nums text-muted-foreground">
                          {formatQty(line.receivedQuantity, line.unit)}
                        </td>
                        <td className="text-right tabular-nums text-muted-foreground">
                          {formatQty(line.invoicedQuantity, line.unit)}
                        </td>
                        <td className="text-right tabular-nums text-muted-foreground">
                          {line.orderedUnitCostCents != null
                            ? formatEuroFromCents(line.orderedUnitCostCents)
                            : "—"}
                        </td>
                        <td className="text-right tabular-nums text-muted-foreground">
                          {line.invoicedUnitCostCents != null
                            ? formatEuroFromCents(line.invoicedUnitCostCents)
                            : "—"}
                        </td>
                        <td>
                          <Badge variant={matchBadgeVariant(line.matchStatus)}>
                            {t(`lineMatch.${line.matchStatus}`)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {matchInvoices.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("invoicesTitle")}</p>
                  <ul className="divide-y divide-border/70 rounded-lg border border-border/70">
                    {matchInvoices.map((invoice) => (
                      <li
                        key={invoice.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.invoiceDate}
                            {invoice.totalCents != null
                              ? ` · ${formatEuroFromCents(invoice.totalCents)}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={matchBadgeVariant(invoice.status)}>
                            {t(`matchStatus.${invoice.status}`)}
                          </Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => deleteSupplierInvoice(invoice.id)}
                          >
                            {t("deleteInvoice")}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("invoicesEmpty")}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMatchOrderId(null)}
            >
              {tCommon("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="sr-only">{STATUSES.join(",")}</p>
    </div>
  );
}
