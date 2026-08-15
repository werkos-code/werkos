"use client";

import { Link, useRouter } from "@/i18n/navigation";
import {
  Check,
  ExternalLink,
  Eye,
  Printer,
  Send,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatInvoiceEuro,
  InvoiceDocument,
} from "@/features/invoices/components/invoice-document";
import { InvoicePdfDownloadButton } from "@/features/invoices/components/invoice-pdf-download-button";
import type { InvoiceDetail } from "@/features/invoices/invoices-actions";
import type { InvoiceLineRow } from "@/features/invoices/lib/invoice-lines";
import { reorderInvoiceSiblings } from "@/features/invoices/lib/invoice-line-tree";
import {
  computeInvoiceTotals,
  isInvoiceEditable,
} from "@/features/invoices/lib/invoice-pricing";
import { dueDateFromPaymentTerms } from "@/features/quotes/lib/quote-status";
import {
  MetaStatCard,
  PageCard,
} from "@/features/shell/components/page-card";
import type { InvoiceStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type InvoiceEditorProps = {
  invoice: InvoiceDetail;
};

const PAYMENT_CHIPS = [7, 14, 30, 60] as const;

export function InvoiceEditor({ invoice }: InvoiceEditorProps) {
  const t = useTranslations("invoices.editor");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [status, setStatus] = useState<InvoiceStatus>(invoice.status);
  const [title, setTitle] = useState(invoice.title);
  const [issueDate, setIssueDate] = useState(invoice.issueDate);
  const [dueDate, setDueDate] = useState(invoice.dueDate ?? "");
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const [lines, setLines] = useState<InvoiceLineRow[]>(invoice.lines);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [pendingAction, setPendingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [railTab, setRailTab] = useState<"summary" | "settings">("summary");

  const editable = isInvoiceEditable(status);

  useEffect(() => {
    if (dirty) return;
    setStatus(invoice.status);
    setTitle(invoice.title);
    setIssueDate(invoice.issueDate);
    setDueDate(invoice.dueDate ?? "");
    setNotes(invoice.notes ?? "");
    setLines(invoice.lines);
  }, [invoice, dirty]);

  const totals = useMemo(
    () =>
      computeInvoiceTotals(
        lines
          .filter((line) => !line.isGroup)
          .map((line) => ({
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            discountCents: line.discountCents,
            vatRateBps: line.vatRateBps,
          })),
      ),
    [lines],
  );

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") {
        return;
      }
      if (!editable || !dirty) return;
      event.preventDefault();
      void saveAll();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saveAll closes over latest state
  }, [editable, dirty, title, issueDate, dueDate, notes, lines, totals]);

  function mapApiError(code?: string) {
    if (code === "not_editable") return t("errors.notEditable");
    if (code === "not_found") return t("errors.notFound");
    if (code === "forbidden") return t("errors.forbidden");
    if (code === "parent_not_found" || code === "invalid_parent") {
      return t("errors.invalidParent");
    }
    return code || tCommon("error");
  }

  function markDirty() {
    setDirty(true);
    setSaveState("idle");
  }

  function updateLocalLine(lineId: string, patch: Partial<InvoiceLineRow>) {
    setLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    );
    markDirty();
  }

  function reorderLines(
    parentId: string | null,
    activeId: string,
    overId: string,
  ) {
    setLines((prev) =>
      reorderInvoiceSiblings(prev, parentId, activeId, overId),
    );
    markDirty();
  }

  async function createLine(input: {
    title: string;
    parentId?: string | null;
    isGroup?: boolean;
  }) {
    if (!editable) return;
    setPendingAction(true);
    setError(null);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.title,
          parentId: input.parentId ?? null,
          isGroup: Boolean(input.isGroup),
          quantity: input.isGroup ? 0 : 1,
          unit: input.isGroup ? null : "st",
          unitPriceCents: 0,
          vatRateBps: input.isGroup ? 0 : 2100,
          discountCents: 0,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await response.json()) as {
        error?: string;
        line?: InvoiceLineRow;
      };
      if (!response.ok || !result.line) {
        setError(mapApiError(result.error));
        return;
      }
      const created = {
        ...result.line,
        isGroup: result.line.isGroup ?? Boolean(input.isGroup),
      };
      setLines((prev) => [...prev, created]);
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPendingAction(false);
    }
  }

  async function addLine(parentId?: string | null) {
    await createLine({
      title: t("defaultLineTitle"),
      parentId: parentId ?? null,
    });
  }

  async function addGroup() {
    await createLine({
      title: t("defaultGroupTitle"),
      isGroup: true,
    });
  }

  async function deleteLine(lineId: string) {
    if (!editable) return;
    const target = lines.find((line) => line.id === lineId);
    const confirmMessage = target?.isGroup
      ? t("deleteGroupConfirm")
      : t("deleteLineConfirm");
    if (!window.confirm(confirmMessage)) return;
    setPendingAction(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/invoices/${invoice.id}/lines?id=${encodeURIComponent(lineId)}`,
        { method: "DELETE", signal: AbortSignal.timeout(20_000) },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok || result.error) {
        setError(mapApiError(result.error));
        return;
      }
      setLines((prev) =>
        prev.filter((line) => line.id !== lineId && line.parentId !== lineId),
      );
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPendingAction(false);
    }
  }

  async function saveAll() {
    setSaveState("saving");
    setError(null);
    try {
      const headerRes = await fetch("/api/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: invoice.id,
          title: title.trim(),
          issueDate,
          dueDate: dueDate || null,
          notes: notes || null,
          subtotalCents: totals.subtotalCents,
          vatCents: totals.vatCents,
          totalCents: totals.totalCents,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const headerResult = (await headerRes.json()) as { error?: string };
      if (!headerRes.ok || headerResult.error) {
        setError(mapApiError(headerResult.error));
        setSaveState("idle");
        return false;
      }

      const lineResults = await Promise.all(
        lines.map(async (line) => {
          const response = await fetch(`/api/invoices/${invoice.id}/lines`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: line.id,
              parentId: line.parentId,
              title: line.title,
              description: line.description,
              quantity: line.quantity,
              unit: line.unit,
              unitPriceCents: line.unitPriceCents,
              vatRateBps: line.vatRateBps,
              discountCents: line.discountCents,
              sortOrder: line.sortOrder,
              isGroup: line.isGroup,
            }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as { error?: string };
          return { ok: response.ok && !result.error, error: result.error };
        }),
      );

      const failed = lineResults.find((r) => !r.ok);
      if (failed) {
        setError(mapApiError(failed.error));
        setSaveState("idle");
        return false;
      }

      setDirty(false);
      setSaveState("saved");
      router.refresh();
      return true;
    } catch {
      setError(tCommon("error"));
      setSaveState("idle");
      return false;
    }
  }

  async function setInvoiceStatus(next: InvoiceStatus) {
    if (dirty && editable) {
      const saved = await saveAll();
      if (!saved) return;
    }
    setPendingAction(true);
    setError(null);
    try {
      const response = await fetch("/api/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invoice.id, status: next }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok || result.error) {
        setError(mapApiError(result.error));
        return;
      }
      setStatus(next);
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPendingAction(false);
    }
  }

  function applyPaymentDays(days: number) {
    if (!editable) return;
    const next = dueDateFromPaymentTerms(issueDate, days);
    if (!next) return;
    setDueDate(next);
    markDirty();
  }

  const busy = saveState === "saving" || pendingAction;
  const printRef = useRef<HTMLDivElement>(null);

  return (
    <>
    <div className="no-print space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge
          variant={status === "draft" ? "success" : "secondary"}
          className="h-6 px-2.5"
        >
          {t(`status.${status}`)}
        </Badge>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {invoice.invoiceNumber}
        </span>
        {dirty ? (
          <span className="text-xs text-amber-700">{t("unsaved")}</span>
        ) : saveState === "saved" ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3.5" />
            {t("savedJustNow")}
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {editable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || !dirty}
              onClick={() => void saveAll()}
            >
              {saveState === "saving" ? tCommon("loading") : t("save")}
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={`/facturen/${invoice.id}/voorbeeld`} target="_blank">
              <Eye className="size-3.5" />
              {t("actions.preview")}
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="size-3.5" />
            {t("actions.print")}
          </Button>
          <InvoicePdfDownloadButton
            invoice={invoice}
            title={title}
            issueDate={issueDate}
            dueDate={dueDate}
            notes={notes}
            lines={lines}
            totals={totals}
            sourceRef={printRef}
          />
          {editable ? (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void setInvoiceStatus("sent")}
            >
              <Send className="size-3.5" />
              {t("actions.send")}
            </Button>
          ) : null}
          {status === "sent" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void setInvoiceStatus("paid")}
            >
              {t("actions.markPaid")}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetaStatCard
          label={t("kpi.subtotal")}
          value={formatInvoiceEuro(totals.subtotalCents)}
        />
        <MetaStatCard
          label={t("kpi.vat")}
          value={formatInvoiceEuro(totals.vatCents)}
        />
        <MetaStatCard
          label={t("kpi.gross")}
          value={formatInvoiceEuro(totals.totalCents)}
        />
        <MetaStatCard
          label={t("fields.dueDate")}
          value={dueDate || "—"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 rounded-2xl bg-muted/40 p-3 sm:p-5">
          <InvoiceDocument
            mode="edit"
            invoice={invoice}
            title={title}
            issueDate={issueDate}
            dueDate={dueDate}
            notes={notes}
            lines={lines}
            totals={totals}
            editable={editable}
            busy={busy}
            className="w-full shadow-sm"
            onTitleChange={(value) => {
              setTitle(value);
              markDirty();
            }}
            onIssueDateChange={(value) => {
              setIssueDate(value);
              markDirty();
            }}
            onDueDateChange={(value) => {
              setDueDate(value);
              markDirty();
            }}
            onNotesChange={(value) => {
              setNotes(value);
              markDirty();
            }}
            onLineChange={updateLocalLine}
            onAddLine={(parentId) => void addLine(parentId)}
            onAddGroup={() => void addGroup()}
            onDeleteLine={(lineId) => void deleteLine(lineId)}
            onReorder={reorderLines}
          />
        </div>

        <aside className="space-y-3">
          <PageCard className="sticky top-20 overflow-hidden">
            <div className="flex gap-1 border-b border-border px-2 pt-2">
              {(
                [
                  { id: "summary", label: t("rail.summary") },
                  { id: "settings", label: t("rail.settings") },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRailTab(item.id)}
                  className={cn(
                    "rounded-t-lg px-3 py-2 text-sm transition-colors",
                    railTab === item.id
                      ? "border-b-2 border-primary font-medium text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {railTab === "summary" ? (
              <div className="space-y-4 p-4">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">
                      {t("totals.subtotal")}
                    </dt>
                    <dd className="font-mono tabular-nums">
                      {formatInvoiceEuro(totals.subtotalCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t("totals.vat")}</dt>
                    <dd className="font-mono tabular-nums">
                      {formatInvoiceEuro(totals.vatCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-border pt-2 font-medium">
                    <dt>{t("totals.gross")}</dt>
                    <dd className="font-mono tabular-nums">
                      {formatInvoiceEuro(totals.totalCents)}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {t("meta.customer")}
                  </p>
                  {invoice.customerId ? (
                    <Link
                      href={`/klanten/${invoice.customerId}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium hover:text-primary hover:underline"
                    >
                      {invoice.customerName ?? "—"}
                      <ExternalLink className="size-3.5 text-muted-foreground" />
                    </Link>
                  ) : (
                    <p className="text-sm">{invoice.customerName ?? "—"}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {t("meta.project")}
                  </p>
                  {invoice.projectId ? (
                    <Link
                      href={`/projecten/${invoice.projectId}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium hover:text-primary hover:underline"
                    >
                      {invoice.projectName}
                      <ExternalLink className="size-3.5 text-muted-foreground" />
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>

                {status === "draft" ? (
                  <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                    {t("draftHint")}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4 p-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {t("fields.dueDate")}
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    disabled={!editable}
                    className="h-9"
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      markDirty();
                    }}
                  />
                  {editable ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {PAYMENT_CHIPS.map((days) => (
                        <button
                          key={days}
                          type="button"
                          className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-opacity hover:opacity-80"
                          onClick={() => applyPaymentDays(days)}
                        >
                          {t("paymentDays", { days })}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {t("fields.issueDate")}
                  </label>
                  <Input
                    type="date"
                    value={issueDate}
                    disabled={!editable}
                    className="h-9"
                    onChange={(e) => {
                      setIssueDate(e.target.value);
                      markDirty();
                    }}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  {t("settingsHint")}
                </p>
              </div>
            )}
          </PageCard>
        </aside>
      </div>
    </div>

    <div
      ref={printRef}
      className="invoice-print-surface invoice-print-root"
      aria-hidden
    >
      <InvoiceDocument
        mode="preview"
        invoice={invoice}
        title={title}
        issueDate={issueDate}
        dueDate={dueDate}
        notes={notes}
        lines={lines}
        totals={totals}
        className="shadow-none"
      />
    </div>
    </>
  );
}
