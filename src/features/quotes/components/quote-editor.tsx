"use client";

import { Link, useRouter } from "@/i18n/navigation";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Ellipsis,
  Eye,
  ExternalLink,
  FileUp,
  MoreVertical,
  Plus,
  Send,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isQuoteEditable,
  lineNetCents,
  lineVatCents,
} from "@/features/quotes/lib/quote-status";
import type { QuoteDetail, QuoteLineRow } from "@/features/quotes/quotes-actions";
import {
  hoursInputToMinutes,
  minutesToHoursInput,
} from "@/features/time/lib/time-entry";
import {
  MetaStatCard,
  PageCard,
} from "@/features/shell/components/page-card";
import type { QuoteStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type QuoteEditorProps = {
  quote: QuoteDetail;
};

type EditorTab = "lines" | "info" | "terms" | "notes";

/** Shared line table grid — header and rows must use the exact same template. */
const LINE_GRID_CLASS =
  "lg:grid-cols-[1.75rem_minmax(0,1fr)_4.5rem_5.5rem_4.5rem_6rem_6.5rem_7rem]";


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

function parseQuantity(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : n;
}

function MoneyField({
  cents,
  disabled,
  className,
  onCommit,
}: {
  cents: number | null;
  disabled?: boolean;
  className?: string;
  onCommit: (cents: number | null) => void;
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
      className={cn("h-8 border-border/70 bg-background font-mono text-right tabular-nums", className)}
      onFocus={() => {
        setFocused(true);
        setDraft(centsToDraft(cents));
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        onCommit(draftToCents(draft));
      }}
    />
  );
}

function QuantityField({
  value,
  disabled,
  onCommit,
}: {
  value: number | null;
  disabled?: boolean;
  onCommit: (value: number | null) => void;
}) {
  const display =
    value === null || value === undefined ? "" : String(value).replace(".", ",");
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

function HoursField({
  minutes,
  disabled,
  onCommit,
}: {
  minutes: number | null;
  disabled?: boolean;
  onCommit: (minutes: number | null) => void;
}) {
  const display = minutesToHoursInput(minutes).replace(".", ",");
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
        onCommit(hoursInputToMinutes(draft.replace(",", ".")));
      }}
    />
  );
}

function collectDescendants(lines: QuoteLineRow[], rootId: string): string[] {
  const ids = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const line of lines) {
      if (line.parentId === current) {
        ids.push(line.id);
        queue.push(line.id);
      }
    }
  }
  return ids;
}

function sectionTotalCents(lines: QuoteLineRow[], sectionId: string): number {
  const leafIds = new Set(
    lines.filter((l) => !lines.some((c) => c.parentId === l.id)).map((l) => l.id),
  );
  const descendants = collectDescendants(lines, sectionId).filter(
    (id) => id !== sectionId && leafIds.has(id),
  );
  return descendants.reduce((sum, id) => {
    const line = lines.find((l) => l.id === id);
    if (!line) return sum;
    return (
      sum +
      lineNetCents({
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        discountCents: line.discountCents,
      })
    );
  }, 0);
}

export function QuoteEditor({ quote }: QuoteEditorProps) {
  const t = useTranslations("quotes");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [status, setStatusState] = useState<QuoteStatus>(quote.status);
  const editable = isQuoteEditable(status);
  const [tab, setTab] = useState<EditorTab>("lines");
  const [title, setTitle] = useState(quote.title);
  const [internalNotes, setInternalNotes] = useState(quote.internalNotes ?? "");
  const [externalNotes, setExternalNotes] = useState(quote.externalNotes ?? "");
  const [validUntil, setValidUntil] = useState(quote.validUntil ?? "");
  const [lines, setLines] = useState(quote.lines);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [pendingAction, setPendingAction] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [setExecution, setSetExecution] = useState(true);
  const [showInclVat, setShowInclVat] = useState(true);

  useEffect(() => {
    setStatusState(quote.status);
    setTitle(quote.title);
    setInternalNotes(quote.internalNotes ?? "");
    setExternalNotes(quote.externalNotes ?? "");
    setValidUntil(quote.validUntil ?? "");
    setLines(quote.lines);
    setDirty(false);
    setSaveState("idle");
  }, [quote]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest("a");
      if (!target) return;
      if (target.getAttribute("target") === "_blank") return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (!window.confirm(t("unsavedLeave"))) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty, t]);

  const leafLines = useMemo(() => {
    const parentIds = new Set(
      lines.map((l) => l.parentId).filter(Boolean) as string[],
    );
    return lines.filter(
      (l) =>
        !parentIds.has(l.id) &&
        !(l.quantity === null && l.unitPriceCents === null),
    );
  }, [lines]);

  const totals = useMemo(() => {
    let net = 0;
    let vat = 0;
    let discount = 0;
    for (const line of leafLines) {
      discount += line.discountCents || 0;
      const lineNet = lineNetCents({
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        discountCents: line.discountCents,
      });
      net += lineNet;
      vat += lineVatCents(lineNet, line.vatRateBps);
    }
    const grossBeforeDiscount = net + discount;
    return {
      subtotal: grossBeforeDiscount,
      discount,
      net,
      vat,
      gross: net + vat,
    };
  }, [leafLines]);

  const roots = useMemo(
    () =>
      [...lines]
        .filter((l) => !l.parentId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [lines],
  );

  const childrenOf = (parentId: string) =>
    lines
      .filter((l) => l.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  function markDirty() {
    setDirty(true);
    setSaveState("idle");
  }

  function updateLocalLine(id: string, patch: Partial<QuoteLineRow>) {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
    markDirty();
  }

  function mapApiError(code?: string) {
    if (!code) return tCommon("error");
    if (code === "not_editable") return t("errors.notEditable");
    if (code === "not_found") return t("errors.notFound");
    if (code === "unauthorized" || code === "forbidden") {
      return t("errors.forbidden");
    }
    return code;
  }

  async function saveAll(): Promise<boolean> {
    if (!editable) return true;
    setSaveState("saving");
    setError(null);
    try {
      const metaResponse = await fetch("/api/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: quote.id,
          title,
          internalNotes,
          externalNotes,
          validUntil: validUntil || null,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const metaResult = (await metaResponse.json()) as { error?: string };
      if (!metaResponse.ok || metaResult.error) {
        setError(mapApiError(metaResult.error));
        setSaveState("idle");
        return false;
      }

      const lineResults = await Promise.all(
        lines.map(async (line) => {
          const response = await fetch(`/api/quotes/${quote.id}/lines`, {
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
              estimatedMinutes: line.estimatedMinutes,
              sortOrder: line.sortOrder,
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

  async function setStatus(next: "sent" | "rejected" | "cancelled") {
    if (dirty && editable) {
      const saved = await saveAll();
      if (!saved) return;
    }
    setPendingAction(true);
    setError(null);
    try {
      const response = await fetch("/api/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quote.id, status: next }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok || result.error) {
        setError(mapApiError(result.error));
        return;
      }
      setStatusState(next);
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPendingAction(false);
    }
  }

  async function addLine(parentId: string | null, asSection = false) {
    if (!editable) return;
    setPendingAction(true);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId,
          title: asSection ? t("placeholders.section") : "",
          quantity: asSection ? null : 1,
          unit: asSection ? null : "st",
          unitPriceCents: asSection ? null : 0,
          vatRateBps: 2100,
          discountCents: 0,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await response.json()) as {
        error?: string;
        line?: QuoteLineRow;
      };
      if (!response.ok || !result.line) {
        setError(mapApiError(result.error));
        return;
      }
      setLines((prev) => [...prev, result.line!]);
      setDirty(true);
      setSaveState("idle");
      setTab("lines");
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
        `/api/quotes/${quote.id}/lines?id=${encodeURIComponent(lineId)}`,
        { method: "DELETE", signal: AbortSignal.timeout(20_000) },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok || result.error) {
        setError(mapApiError(result.error));
        return;
      }
      const removeIds = new Set(collectDescendants(lines, lineId));
      setLines((prev) => prev.filter((line) => !removeIds.has(line.id)));
      setDirty(true);
      setSaveState("idle");
    } catch {
      setError(tCommon("error"));
    } finally {
      setPendingAction(false);
    }
  }

  async function acceptQuote() {
    setPendingAction(true);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineIds: selectedLineIds,
          setProjectExecution: setExecution,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok || result.error) {
        setError(mapApiError(result.error));
        return;
      }
      setAcceptOpen(false);
      setStatusState("accepted");
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPendingAction(false);
    }
  }

  function openAccept() {
    setSelectedLineIds(leafLines.map((l) => l.id));
    setAcceptOpen(true);
  }

  const busy = saveState === "saving" || pendingAction;
  const tabs: { id: EditorTab; label: string }[] = [
    { id: "lines", label: t("tabs.lines") },
    { id: "info", label: t("tabs.info") },
    { id: "terms", label: t("tabs.terms") },
    { id: "notes", label: t("tabs.notes") },
  ];

  function renderLineRow(line: QuoteLineRow, depth: number, indexLabel: string) {
    const kids = childrenOf(line.id);
    const showAsSection =
      kids.length > 0 ||
      (line.quantity === null && line.unitPriceCents === null);
    const net = lineNetCents({
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      discountCents: line.discountCents,
    });
    const isCollapsed = collapsed[line.id];

    if (showAsSection) {
      const total = sectionTotalCents(lines, line.id);
      return (
        <div key={line.id} className="border-b border-border/70 last:border-0">
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-2.5">
            <button
              type="button"
              className="text-muted-foreground"
              onClick={() =>
                setCollapsed((prev) => ({ ...prev, [line.id]: !prev[line.id] }))
              }
            >
              {isCollapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
            <span className="w-6 text-xs tabular-nums text-muted-foreground">
              {indexLabel}
            </span>
            <Input
              value={line.title}
              disabled={!editable}
              className="h-8 flex-1 border-transparent bg-transparent font-medium shadow-none focus-visible:border-input focus-visible:bg-background"
              onChange={(e) =>
                updateLocalLine(line.id, { title: e.target.value })
              }
            />
            <span className="font-mono text-sm tabular-nums text-foreground">
              {formatEuro(total)}
            </span>
            {editable ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                disabled={busy}
                onClick={() => void deleteLine(line.id)}
              >
                <MoreVertical className="size-4" />
              </Button>
            ) : null}
          </div>
          {!isCollapsed
            ? kids.map((child, i) =>
                renderLineRow(child, depth + 1, `${indexLabel}.${i + 1}`),
              )
            : null}
          {!isCollapsed && editable ? (
            <div className="bg-card px-3 py-2 pl-12">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                disabled={busy}
                onClick={() => void addLine(line.id)}
              >
                <Plus className="size-3.5" />
                {t("addLine")}
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div key={line.id}>
        <div
          className={cn(
            "group grid grid-cols-1 items-start gap-x-2 gap-y-1 border-b border-border/60 px-3 py-3 lg:items-center",
            LINE_GRID_CLASS,
          )}
        >
          <span
            className="hidden pt-2 text-[11px] tabular-nums text-muted-foreground lg:block"
            style={{ paddingLeft: depth * 12 }}
          >
            {indexLabel}
          </span>
          <div
            className="min-w-0 space-y-1"
            style={{ paddingLeft: depth * 12 }}
          >
            <div className="flex items-center gap-2 lg:block">
              <span className="w-6 shrink-0 text-[11px] tabular-nums text-muted-foreground lg:hidden">
                {indexLabel}
              </span>
              <Input
                value={line.title}
                disabled={!editable}
                placeholder={t("placeholders.line")}
                className="h-8 border-transparent bg-transparent px-0 font-medium shadow-none focus-visible:border-input focus-visible:bg-background focus-visible:px-2"
                onChange={(e) =>
                  updateLocalLine(line.id, { title: e.target.value })
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
              updateLocalLine(line.id, { unit: e.target.value || null })
            }
          />
          <QuantityField
            value={line.quantity}
            disabled={!editable}
            onCommit={(quantity) => updateLocalLine(line.id, { quantity })}
          />
          <HoursField
            minutes={line.estimatedMinutes}
            disabled={!editable}
            onCommit={(estimatedMinutes) =>
              updateLocalLine(line.id, { estimatedMinutes })
            }
          />
          <MoneyField
            cents={line.unitPriceCents}
            disabled={!editable}
            onCommit={(cents) =>
              updateLocalLine(line.id, { unitPriceCents: cents ?? 0 })
            }
          />
          <div className="flex h-8 items-center justify-end font-mono text-sm tabular-nums">
            {formatEuro(net)}
          </div>
          <div className="flex h-8 items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
            {editable ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  disabled={busy}
                  onClick={() => void addLine(line.id)}
                >
                  {t("addChildLine")}
                </Button>
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
              </>
            ) : null}
          </div>
        </div>
        {kids.map((child, i) =>
          renderLineRow(child, depth + 1, `${indexLabel}.${i + 1}`),
        )}
      </div>
    );
  }

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
          <Button type="button" variant="outline" size="icon-sm" disabled title={t("stubs.more")}>
            <Ellipsis className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" disabled title={t("stubs.preview")}>
            <Eye className="size-3.5" />
            {t("actions.preview")}
          </Button>
          {editable ? (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => void setStatus("sent")}
            >
              <Send className="size-3.5" />
              {t("actions.send")}
            </Button>
          ) : null}
          {status === "sent" || status === "draft" ? (
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={openAccept}>
              {t("actions.accept")}
            </Button>
          ) : null}
          {status === "sent" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void setStatus("rejected")}
            >
              {t("actions.reject")}
            </Button>
          ) : null}
          {editable || status === "sent" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void setStatus("cancelled")}
            >
              {t("actions.cancel")}
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
          muted
          label={t("meta.number")}
          value={t("meta.numberPending")}
          icon={<Copy className="size-3.5 opacity-40" />}
        />
        <MetaStatCard
          label={t("meta.customer")}
          value={
            quote.customerId ? (
              <Link
                href={`/klanten/${quote.customerId}`}
                className="hover:text-primary hover:underline"
              >
                {quote.customerName ?? "—"}
              </Link>
            ) : (
              (quote.customerName ?? "—")
            )
          }
          icon={<ExternalLink className="size-3.5" />}
        />
        <MetaStatCard
          label={t("meta.project")}
          value={
            <Link
              href={`/projecten/${quote.projectId}`}
              className="hover:text-primary hover:underline"
            >
              {quote.projectName}
            </Link>
          }
          icon={<ExternalLink className="size-3.5" />}
        />
        <MetaStatCard
          label={t("fields.validUntil")}
          value={
            editable ? (
              <Input
                type="date"
                value={validUntil}
                className="h-7 border-0 bg-transparent px-0 shadow-none"
                onChange={(e) => {
                  setValidUntil(e.target.value);
                  markDirty();
                }}
              />
            ) : (
              validUntil || "—"
            )
          }
          icon={<Calendar className="size-3.5" />}
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
                      onClick={() => void addLine(null)}
                    >
                      <Plus className="size-3.5" />
                      {t("addLine")}
                    </Button>
                  ) : null}
                  {editable ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void addLine(null, true)}
                    >
                      {t("addSection")}
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" size="sm" disabled>
                    {t("stubs.textLine")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled>
                    {t("stubs.discount")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled>
                    {t("stubs.image")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    disabled
                  >
                    {t("stubs.import")}
                  </Button>
                </div>

                <div
                  className={cn(
                    "hidden gap-x-2 border-b border-border px-3 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase lg:grid",
                    LINE_GRID_CLASS,
                  )}
                >
                  <span aria-hidden className="block" />
                  <span>{t("fields.lineTitle")}</span>
                  <span className="text-center">{t("fields.unit")}</span>
                  <span className="text-right">{t("fields.quantity")}</span>
                  <span className="text-right">{t("fields.hours")}</span>
                  <span className="text-right">{t("fields.unitPrice")}</span>
                  <span className="text-right">{t("fields.lineTotal")}</span>
                  <span aria-hidden className="block" />
                </div>

                {roots.length === 0 ? (
                  <p className="px-4 py-10 text-sm text-muted-foreground">
                    {t("noLines")}
                  </p>
                ) : (
                  roots.map((line, i) => renderLineRow(line, 0, String(i + 1)))
                )}

                <div className="border-t border-dashed border-border px-4 py-6">
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center opacity-60">
                    <FileUp className="size-6 text-primary" />
                    <p className="text-sm font-medium text-foreground">
                      {t("stubs.attachmentsTitle")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("stubs.attachmentsHint")}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "info" ? (
              <div className="space-y-4 p-5">
                <div className="space-y-2">
                  <Label htmlFor="quote-title">{t("fields.title")}</Label>
                  <Input
                    id="quote-title"
                    value={title}
                    disabled={!editable}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-valid">{t("fields.validUntil")}</Label>
                  <Input
                    id="quote-valid"
                    type="date"
                    value={validUntil}
                    disabled={!editable}
                    onChange={(e) => {
                      setValidUntil(e.target.value);
                      markDirty();
                    }}
                  />
                </div>
              </div>
            ) : null}

            {tab === "terms" ? (
              <div className="space-y-4 p-5">
                <div className="space-y-2">
                  <Label htmlFor="externalNotes">{t("fields.externalNotes")}</Label>
                  <textarea
                    id="externalNotes"
                    rows={8}
                    value={externalNotes}
                    disabled={!editable}
                    onChange={(e) => {
                      setExternalNotes(e.target.value);
                      markDirty();
                    }}
                    className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 opacity-60">
                    <Label>{t("stubs.paymentTerm")}</Label>
                    <Input disabled value={t("stubs.paymentTermValue")} />
                  </div>
                  <div className="space-y-2 opacity-60">
                    <Label>{t("stubs.paymentTerms")}</Label>
                    <Input disabled value={t("stubs.paymentTermsValue")} />
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "notes" ? (
              <div className="space-y-2 p-5">
                <Label htmlFor="internalNotes">{t("fields.internalNotes")}</Label>
                <textarea
                  id="internalNotes"
                  rows={8}
                  value={internalNotes}
                  disabled={!editable}
                  onChange={(e) => {
                    setInternalNotes(e.target.value);
                    markDirty();
                  }}
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            ) : null}
          </PageCard>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <PageCard className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">{t("totalsTitle")}</h2>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowInclVat((v) => !v)}
              >
                {showInclVat ? t("totals.showExcl") : t("totals.showIncl")}
              </button>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("totals.subtotal")}</dt>
                <dd className="font-mono tabular-nums">
                  {formatEuro(totals.subtotal)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("totals.discount")}</dt>
                <dd className="font-mono tabular-nums text-emerald-700">
                  {totals.discount > 0
                    ? `− ${formatEuro(totals.discount)}`
                    : formatEuro(0)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("totals.net")}</dt>
                <dd className="font-mono tabular-nums">
                  {formatEuro(totals.net)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("totals.vat")}</dt>
                <dd className="font-mono tabular-nums">
                  {formatEuro(totals.vat)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-3 text-base font-semibold">
                <dt>
                  {showInclVat ? t("totals.gross") : t("totals.net")}
                </dt>
                <dd className="font-mono tabular-nums">
                  {formatEuro(showInclVat ? totals.gross : totals.net)}
                </dd>
              </div>
            </dl>
            {editable ? (
              <Button
                type="button"
                className="w-full"
                disabled={busy || !dirty}
                onClick={() => void saveAll()}
              >
                {saveState === "saving" ? tCommon("loading") : t("save")}
              </Button>
            ) : null}
          </PageCard>

          <PageCard className="space-y-3 p-4 opacity-70">
            <h3 className="text-sm font-medium">{t("stubs.attachmentsList")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("stubs.attachmentsEmpty")}
            </p>
          </PageCard>
        </aside>
      </div>

      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>{t("acceptTitle")}</DialogTitle>
            <DialogDescription>{t("acceptDescription")}</DialogDescription>
          </DialogHeader>
          <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
            {leafLines.map((line) => (
              <li key={line.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedLineIds.includes(line.id)}
                  onChange={(e) => {
                    setSelectedLineIds((prev) =>
                      e.target.checked
                        ? [...prev, line.id]
                        : prev.filter((id) => id !== line.id),
                    );
                  }}
                />
                <span>{line.title || t("untitledLine")}</span>
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={setExecution}
              onChange={(e) => setSetExecution(e.target.checked)}
            />
            {t("setProjectExecution")}
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAcceptOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void acceptQuote()}
            >
              {pendingAction ? tCommon("loading") : t("confirmAccept")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
