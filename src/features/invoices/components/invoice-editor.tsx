"use client";

import { Link, useRouter } from "@/i18n/navigation";
import {
  Calendar,
  Check,
  Ellipsis,
  ExternalLink,
  MoreVertical,
  Plus,
  Send,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InvoiceDetail } from "@/features/invoices/invoices-actions";
import type { InvoiceLineRow } from "@/features/invoices/lib/invoice-lines";
import {
  computeInvoiceTotals,
  isInvoiceEditable,
  lineNetCents,
} from "@/features/invoices/lib/invoice-pricing";
import {
  MetaStatCard,
  PageCard,
} from "@/features/shell/components/page-card";
import type { InvoiceStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type InvoiceEditorProps = {
  invoice: InvoiceDetail;
};

type EditorTab = "lines" | "notes";

const LINE_GRID_CLASS =
  "lg:grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_5.5rem_6rem_6.5rem_7rem]";

function formatEuro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function centsToDraft(cents: number | null): string {
  if (cents === null || Number.isNaN(cents)) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

function draftToCents(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

function parseQuantity(value: string): number {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return 0;
  const n = Number(trimmed);
  return Number.isNaN(n) ? 0 : n;
}

function MoneyField({
  cents,
  disabled,
  onCommit,
}: {
  cents: number;
  disabled?: boolean;
  onCommit: (cents: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(centsToDraft(cents));

  useEffect(() => {
    if (!focused) setDraft(centsToDraft(cents));
  }, [cents, focused]);

  return (
    <Input
      inputMode="decimal"
      disabled={disabled}
      value={focused ? draft : centsToDraft(cents)}
      className="h-8 border-border/70 bg-background font-mono text-right tabular-nums"
      onFocus={() => {
        setFocused(true);
        setDraft(centsToDraft(cents));
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        onCommit(draftToCents(draft) ?? 0);
      }}
    />
  );
}

function QuantityField({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  const display = String(value).replace(".", ",");
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(display);

  useEffect(() => {
    if (!focused) setDraft(display);
  }, [display, focused]);

  return (
    <Input
      inputMode="decimal"
      disabled={disabled}
      value={focused ? draft : display}
      className="h-8 border-border/70 bg-background font-mono text-right tabular-nums"
      onFocus={() => {
        setFocused(true);
        setDraft(display);
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        onCommit(parseQuantity(draft));
      }}
    />
  );
}

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
  const [tab, setTab] = useState<EditorTab>("lines");
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [pendingAction, setPendingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editable = isInvoiceEditable(status);

  const totals = useMemo(
    () =>
      computeInvoiceTotals(
        lines.map((line) => ({
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          discountCents: line.discountCents,
          vatRateBps: line.vatRateBps,
        })),
      ),
    [lines],
  );

  function mapApiError(code?: string) {
    if (code === "not_editable") return t("errors.notEditable");
    if (code === "not_found") return t("errors.notFound");
  if (code === "forbidden") return t("errors.forbidden");
    return code || tCommon("error");
  }

  function markDirty() {
    setDirty(true);
    setSaveState("idle");
  }

  function updateLocalLine(
    lineId: string,
    patch: Partial<InvoiceLineRow>,
  ) {
    setLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    );
    markDirty();
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
          const response = await fetch(
            `/api/invoices/${invoice.id}/lines`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: line.id,
                title: line.title,
                description: line.description,
                quantity: line.quantity,
                unit: line.unit,
                unitPriceCents: line.unitPriceCents,
                vatRateBps: line.vatRateBps,
                discountCents: line.discountCents,
                sortOrder: line.sortOrder,
              }),
              signal: AbortSignal.timeout(20_000),
            },
          );
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

  async function addLine() {
    if (!editable) return;
    setPendingAction(true);
    setError(null);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "",
          quantity: 1,
          unit: "st",
          unitPriceCents: 0,
          vatRateBps: 2100,
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
      setLines((prev) => [...prev, result.line!]);
      setTab("lines");
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPendingAction(false);
    }
  }

  async function deleteLine(lineId: string) {
    if (!editable) return;
    if (!window.confirm(t("deleteLineConfirm"))) return;
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
      setLines((prev) => prev.filter((line) => line.id !== lineId));
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPendingAction(false);
    }
  }

  const busy = saveState === "saving" || pendingAction;
  const tabs: { id: EditorTab; label: string }[] = [
    { id: "lines", label: t("tabs.lines") },
    { id: "notes", label: t("tabs.notes") },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge
          variant={status === "draft" ? "success" : "secondary"}
          className="h-6 px-2.5"
        >
          {t(`status.${status}`)}
        </Badge>
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
          <Button type="button" variant="outline" size="icon-sm" disabled>
            <Ellipsis className="size-4" />
          </Button>
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
          label={t("meta.number")}
          value={invoice.invoiceNumber}
        />
        <MetaStatCard
          label={t("meta.customer")}
          value={
            invoice.customerId ? (
              <Link
                href={`/klanten/${invoice.customerId}`}
                className="hover:text-primary hover:underline"
              >
                {invoice.customerName ?? "—"}
              </Link>
            ) : (
              (invoice.customerName ?? "—")
            )
          }
          icon={<ExternalLink className="size-3.5" />}
        />
        <MetaStatCard
          label={t("meta.project")}
          value={
            <Link
              href={`/projecten/${invoice.projectId}`}
              className="hover:text-primary hover:underline"
            >
              {invoice.projectName}
            </Link>
          }
          icon={<ExternalLink className="size-3.5" />}
        />
        <MetaStatCard
          label={t("fields.issueDate")}
          value={
            editable ? (
              <Input
                type="date"
                value={issueDate}
                className="h-7 border-0 bg-transparent px-0 shadow-none"
                onChange={(e) => {
                  setIssueDate(e.target.value);
                  markDirty();
                }}
              />
            ) : (
              issueDate || "—"
            )
          }
          icon={<Calendar className="size-3.5" />}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("fields.title")}
        </label>
        <Input
          value={title}
          disabled={!editable}
          className="h-10 max-w-xl font-medium"
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
          }}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <PageCard className="overflow-hidden">
            <div className="flex flex-wrap gap-1 border-b border-border px-2 pt-2">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "rounded-t-lg px-3 py-2 text-sm transition-colors",
                    tab === item.id
                      ? "border-b-2 border-primary font-medium text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === "lines" ? (
              <div className="space-y-0">
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
                  {editable ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-primary/30 text-primary"
                      disabled={busy}
                      onClick={() => void addLine()}
                    >
                      <Plus className="size-3.5" />
                      {t("addLine")}
                    </Button>
                  ) : null}
                </div>

                {lines.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-muted-foreground">
                    {t("noLines")}
                  </p>
                ) : (
                  <>
                    <div
                      className={cn(
                        "hidden border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground lg:grid lg:gap-x-2",
                        LINE_GRID_CLASS,
                      )}
                    >
                      <span>#</span>
                      <span>{t("fields.lineTitle")}</span>
                      <span>{t("fields.unit")}</span>
                      <span className="text-right">{t("fields.quantity")}</span>
                      <span className="text-right">{t("fields.unitPrice")}</span>
                      <span className="text-right">{t("fields.lineTotal")}</span>
                      <span />
                    </div>
                    {lines.map((line, index) => {
                      const net = lineNetCents({
                        quantity: line.quantity,
                        unitPriceCents: line.unitPriceCents,
                        discountCents: line.discountCents,
                      });
                      return (
                        <div
                          key={line.id}
                          className={cn(
                            "group grid grid-cols-1 items-start gap-x-2 gap-y-1 border-b border-border/60 px-3 py-3 lg:items-center",
                            LINE_GRID_CLASS,
                          )}
                        >
                          <span className="hidden pt-2 text-[11px] tabular-nums text-muted-foreground lg:block">
                            {index + 1}
                          </span>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 lg:block">
                              <span className="w-6 shrink-0 text-[11px] tabular-nums text-muted-foreground lg:hidden">
                                {index + 1}
                              </span>
                              <Input
                                value={line.title}
                                disabled={!editable}
                                placeholder={t("placeholders.line")}
                                className="h-8 border-transparent bg-transparent px-0 font-medium shadow-none focus-visible:border-input focus-visible:bg-background focus-visible:px-2"
                                onChange={(e) =>
                                  updateLocalLine(line.id, {
                                    title: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <textarea
                              rows={1}
                              value={line.description ?? ""}
                              disabled={!editable}
                              placeholder={t("placeholders.description")}
                              className="text-muted-foreground placeholder:text-muted-foreground/70 focus-visible:border-input w-full resize-y rounded-lg border border-transparent bg-transparent px-0 py-1 text-xs outline-none focus-visible:bg-background focus-visible:px-2"
                              onChange={(e) =>
                                updateLocalLine(line.id, {
                                  description: e.target.value || null,
                                })
                              }
                            />
                          </div>
                          <Input
                            disabled={!editable}
                            value={line.unit ?? ""}
                            className="h-8 border-border/70 bg-background"
                            onChange={(e) =>
                              updateLocalLine(line.id, {
                                unit: e.target.value || null,
                              })
                            }
                          />
                          <QuantityField
                            value={line.quantity}
                            disabled={!editable}
                            onCommit={(quantity) =>
                              updateLocalLine(line.id, { quantity })
                            }
                          />
                          <MoneyField
                            cents={line.unitPriceCents}
                            disabled={!editable}
                            onCommit={(cents) =>
                              updateLocalLine(line.id, {
                                unitPriceCents: cents,
                              })
                            }
                          />
                          <div className="flex h-8 items-center justify-end font-mono text-sm tabular-nums">
                            {formatEuro(net)}
                          </div>
                          <div className="flex h-8 items-center justify-end">
                            {editable ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive"
                                disabled={busy}
                                onClick={() => void deleteLine(line.id)}
                              >
                                <MoreVertical className="size-4" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ) : (
              <div className="p-4">
                <textarea
                  rows={6}
                  value={notes}
                  disabled={!editable}
                  placeholder={t("placeholders.notes")}
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  onChange={(e) => {
                    setNotes(e.target.value);
                    markDirty();
                  }}
                />
              </div>
            )}
          </PageCard>
        </div>

        <aside className="space-y-3">
          <PageCard className="sticky top-4 p-4">
            <h3 className="text-sm font-medium">{t("totalsTitle")}</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("totals.subtotal")}</dt>
                <dd className="tabular-nums">{formatEuro(totals.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("totals.vat")}</dt>
                <dd className="tabular-nums">{formatEuro(totals.vatCents)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-2 font-medium">
                <dt>{t("totals.gross")}</dt>
                <dd className="tabular-nums">{formatEuro(totals.totalCents)}</dd>
              </div>
            </dl>
            <div className="mt-4 space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
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
            </div>
          </PageCard>
        </aside>
      </div>
    </div>
  );
}
