"use client";

import { Link, useRouter } from "@/i18n/navigation";
import {
  Activity,
  Check,
  Copy,
  Ellipsis,
  Eye,
  FileText,
  Paperclip,
  Pencil,
  Send,
  X,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuoteEditorRail } from "@/features/quotes/components/quote-editor-rail";
import { QuoteFinancialPlanning } from "@/features/quotes/components/quote-financial-planning";
import { QuoteLinesWorkspace } from "@/features/quotes/components/quote-lines-workspace";
import {
  collectDescendants,
  computeQuoteMarginStats,
  computeQuoteTotals,
  formatEuro,
  getLeafLines,
} from "@/features/quotes/lib/quote-line";
import { isQuoteEditable, PAYMENT_TERMS_DAY_OPTIONS } from "@/features/quotes/lib/quote-status";
import type { QuoteDetail, QuoteLineRow } from "@/features/quotes/quotes-actions";
import type { ArticleRow } from "@/features/materials/lib/materials";
import {
  MetaStatCard,
  PageCard,
} from "@/features/shell/components/page-card";
import type { QuoteStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type QuoteEditorProps = {
  quote: QuoteDetail;
  articles?: ArticleRow[];
};

type EditorTab =
  | "overview"
  | "editor"
  | "terms"
  | "attachments"
  | "notes"
  | "activity";

export function QuoteEditor({ quote, articles = [] }: QuoteEditorProps) {
  const t = useTranslations("quotes");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [status, setStatusState] = useState<QuoteStatus>(quote.status);
  const editable = isQuoteEditable(status);
  const [tab, setTab] = useState<EditorTab>("editor");
  const [title, setTitle] = useState(quote.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [internalNotes, setInternalNotes] = useState(quote.internalNotes ?? "");
  const [externalNotes, setExternalNotes] = useState(quote.externalNotes ?? "");
  const [validUntil, setValidUntil] = useState(quote.validUntil ?? "");
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(
    quote.paymentTermsDays ?? 30,
  );
  const [paymentConditions, setPaymentConditions] = useState(
    quote.paymentConditions ?? "",
  );
  const [lines, setLines] = useState(quote.lines);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [pendingAction, setPendingAction] = useState(false);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [setExecution, setSetExecution] = useState(true);

  useEffect(() => {
    setStatusState(quote.status);
    setTitle(quote.title);
    setInternalNotes(quote.internalNotes ?? "");
    setExternalNotes(quote.externalNotes ?? "");
    setValidUntil(quote.validUntil ?? "");
    setPaymentTermsDays(quote.paymentTermsDays ?? 30);
    setPaymentConditions(quote.paymentConditions ?? "");
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

  const leafLines = useMemo(() => getLeafLines(lines), [lines]);
  const totals = useMemo(() => computeQuoteTotals(lines), [lines]);
  const margin = useMemo(() => computeQuoteMarginStats(lines), [lines]);

  function markDirty() {
    setDirty(true);
    setSaveState("idle");
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
          paymentTermsDays,
          paymentConditions: paymentConditions || null,
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
              lineType: line.lineType,
              articleId: line.articleId,
              quantity: line.quantity,
              unit: line.unit,
              unitPriceCents: line.unitPriceCents,
              costPriceCents: line.costPriceCents,
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
      if (next === "sent" && quote.customerEmail?.trim()) {
        const openMail = window.confirm(t("send.openMailConfirm"));
        if (openMail) {
          const subject = encodeURIComponent(
            `${t("preview.documentLabel")} ${quote.quoteNumber ?? quote.title}`,
          );
          const body = encodeURIComponent(
            t("send.mailBody", {
              title: quote.title,
              number: quote.quoteNumber ?? "—",
            }),
          );
          window.open(
            `mailto:${quote.customerEmail.trim()}?subject=${subject}&body=${body}`,
            "_blank",
          );
        }
      }
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPendingAction(false);
    }
  }

  async function duplicateQuote() {
    if (dirty) {
      const leave = window.confirm(t("actions.duplicateUnsaved"));
      if (!leave) return;
    }
    setPendingAction(true);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/duplicate`, {
        method: "POST",
        signal: AbortSignal.timeout(30_000),
      });
      const result = (await response.json()) as {
        error?: string;
        quoteId?: string;
        projectId?: string;
      };
      if (!response.ok || result.error || !result.quoteId || !result.projectId) {
        setError(result.error || tCommon("error"));
        return;
      }
      setDirty(false);
      router.push(`/projecten/${result.projectId}/offertes/${result.quoteId}`);
      router.refresh();
    } catch {
      setError(tCommon("error"));
    } finally {
      setPendingAction(false);
    }
  }

  async function addLine(
    parentId: string | null,
    options?: { asSection?: boolean; lineType?: QuoteLineRow["lineType"] },
  ) {
    if (!editable) return;
    setPendingAction(true);
    setError(null);
    const asSection = options?.asSection || options?.lineType === "section";
    const lineType = asSection
      ? "section"
      : (options?.lineType ?? "article");
    try {
      const response = await fetch(`/api/quotes/${quote.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId,
          lineType,
          title: asSection ? t("placeholders.section") : "",
          quantity: asSection || lineType === "text" ? null : 1,
          unit:
            asSection || lineType === "text"
              ? null
              : lineType === "hours" || lineType === "labor"
                ? "uur"
                : "st",
          unitPriceCents: asSection || lineType === "text" ? null : 0,
          vatRateBps: lineType === "text" ? 0 : 2100,
          discountCents: 0,
          estimatedMinutes:
            lineType === "hours" || lineType === "labor" ? 60 : null,
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
      setTab("editor");
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

  async function deleteLines(lineIds: string[]) {
    if (!editable || lineIds.length === 0) return;
    setPendingAction(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/quotes/${quote.id}/lines?ids=${encodeURIComponent(lineIds.join(","))}`,
        { method: "DELETE", signal: AbortSignal.timeout(20_000) },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok || result.error) {
        setError(mapApiError(result.error));
        return;
      }
      const removeIds = new Set(
        lineIds.flatMap((id) => collectDescendants(lines, id)),
      );
      setLines((prev) => prev.filter((line) => !removeIds.has(line.id)));
      setDirty(true);
      setSaveState("idle");
    } catch {
      setError(tCommon("error"));
    } finally {
      setPendingAction(false);
    }
  }

  async function duplicateLine(lineId: string) {
    if (!editable) return;
    const source = lines.find((line) => line.id === lineId);
    if (!source) return;
    setPendingAction(true);
    setError(null);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: source.parentId,
          lineType: source.lineType,
          articleId: source.articleId,
          title: source.title ? `${source.title} (kopie)` : "",
          description: source.description,
          quantity: source.quantity,
          unit: source.unit,
          unitPriceCents: source.unitPriceCents,
          costPriceCents: source.costPriceCents,
          vatRateBps: source.vatRateBps,
          discountCents: source.discountCents,
          estimatedMinutes: source.estimatedMinutes,
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
    } catch {
      setError(tCommon("error"));
    } finally {
      setPendingAction(false);
    }
  }

  async function reorderLines(
    items: Array<{ id: string; sortOrder: number; parentId: string | null }>,
  ) {
    if (!editable) return;
    try {
      await fetch(`/api/quotes/${quote.id}/lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder: items }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      // Local order already applied; server sync can retry on save.
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
  const saveLabel =
    saveState === "saving" ? tCommon("loading") : t("save");

  const tabs: { id: EditorTab; label: string }[] = [
    { id: "overview", label: t("tabs.overview") },
    { id: "editor", label: t("tabs.editor") },
    { id: "terms", label: t("tabs.terms") },
    { id: "attachments", label: t("tabs.attachments") },
    { id: "notes", label: t("tabs.notes") },
    { id: "activity", label: t("tabs.activity") },
  ];

  const showRail = tab === "overview" || tab === "editor";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">
              {quote.quoteNumber ?? t("meta.numberPending")}
            </span>
            <Badge
              variant={status === "draft" ? "success" : "secondary"}
              className="h-5 px-2"
            >
              {t(`status.${status}`)}
            </Badge>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            {editingTitle && editable ? (
              <Input
                autoFocus
                value={title}
                className="h-9 max-w-xl text-lg font-semibold"
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditingTitle(false);
                }}
              />
            ) : (
              <h2 className="truncate text-xl font-semibold tracking-tight">
                {title || t("untitledQuote")}
              </h2>
            )}
            {editable ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setEditingTitle(true)}
                aria-label={t("fields.title")}
              >
                <Pencil className="size-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {quote.customerId ? (
              <Link
                href={`/klanten/${quote.customerId}`}
                className="hover:text-primary hover:underline"
              >
                {quote.customerName ?? "—"}
              </Link>
            ) : (
              <span>{quote.customerName ?? "—"}</span>
            )}
            <span aria-hidden>·</span>
            <Link
              href={`/projecten/${quote.projectId}`}
              className="hover:text-primary hover:underline"
            >
              {quote.projectName}
            </Link>
          </div>

          {dirty ? (
            <span className="text-xs text-amber-700">{t("unsaved")}</span>
          ) : saveState === "saved" ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="size-3.5" />
              {t("savedJustNow")}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {editable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || !dirty}
              onClick={() => void saveAll()}
            >
              {saveLabel}
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
              >
                {t("actions.menu")}
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem
                disabled={busy}
                onClick={() => void duplicateQuote()}
              >
                <Copy className="size-3.5" />
                {t("actions.duplicate")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link
              href={`/projecten/${quote.projectId}/offertes/${quote.id}/voorbeeld`}
              target="_blank"
            >
              <Eye className="size-3.5" />
              {t("actions.preview")}
            </Link>
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
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={openAccept}
            >
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

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetaStatCard
          label={t("kpi.net")}
          value={
            <span className="font-mono tabular-nums">
              {formatEuro(totals.net)}
            </span>
          }
        />
        <MetaStatCard
          label={t("kpi.vat")}
          value={
            <span className="font-mono tabular-nums">
              {formatEuro(totals.vat)}
            </span>
          }
        />
        <MetaStatCard
          label={t("kpi.gross")}
          value={
            <span className="font-mono tabular-nums">
              {formatEuro(totals.gross)}
            </span>
          }
        />
        <MetaStatCard
          label={t("kpi.margin")}
          value={
            margin.hasCost && margin.marginPercent != null ? (
              <span className="font-mono tabular-nums">
                {margin.marginPercent.toLocaleString("nl-NL", {
                  maximumFractionDigits: 1,
                })}
                %
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
      </div>

      {/* Tabs + body */}
      <div
        className={cn(
          "grid gap-5",
          showRail ? "xl:grid-cols-[minmax(0,1fr)_20rem]" : "",
        )}
      >
        <div className="min-w-0 space-y-4">
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

            {tab === "overview" ? (
              <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <OverviewRow
                    label={t("meta.customer")}
                    value={quote.customerName ?? "—"}
                  />
                  <OverviewRow
                    label={t("meta.project")}
                    value={quote.projectName}
                  />
                  <OverviewRow
                    label={t("meta.number")}
                    value={quote.quoteNumber ?? t("meta.numberPending")}
                  />
                  <OverviewRow
                    label={t("fields.validUntil")}
                    value={validUntil || "—"}
                  />
                  <OverviewRow
                    label={t("kpi.net")}
                    value={formatEuro(totals.net)}
                  />
                  <OverviewRow
                    label={t("kpi.gross")}
                    value={formatEuro(totals.gross)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("overview.hint")}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTab("editor")}
                >
                  <FileText className="size-3.5" />
                  {t("overview.openEditor")}
                </Button>
              </div>
            ) : null}

            {tab === "editor" ? (
              <div className="space-y-0">
                <QuoteLinesWorkspace
                  lines={lines}
                  articles={articles}
                  onChange={(next) => {
                    setLines(next);
                    markDirty();
                  }}
                  editable={editable}
                  busy={busy}
                  onAddLine={addLine}
                  onDeleteLine={deleteLine}
                  onDeleteLines={deleteLines}
                  onDuplicateLine={duplicateLine}
                  onReorder={reorderLines}
                />
                {editable ? (
                  <div className="border-t border-border px-4 py-3">
                    <Label
                      htmlFor="internalNotes-inline"
                      className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
                    >
                      {t("fields.internalNotes")}
                    </Label>
                    <textarea
                      id="internalNotes-inline"
                      rows={2}
                      value={internalNotes}
                      onChange={(e) => {
                        setInternalNotes(e.target.value);
                        markDirty();
                      }}
                      placeholder={t("placeholders.internalNotesShort")}
                      className="border-input bg-background mt-1.5 w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === "terms" ? (
              <div className="space-y-4 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="paymentTermsDays">
                      {t("fields.paymentTermsDays")}
                    </Label>
                    <select
                      id="paymentTermsDays"
                      disabled={!editable}
                      value={paymentTermsDays}
                      onChange={(e) => {
                        setPaymentTermsDays(Number(e.target.value));
                        markDirty();
                      }}
                      className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {PAYMENT_TERMS_DAY_OPTIONS.map((days) => (
                        <option key={days} value={days}>
                          {t("paymentTermsDaysOption", { days })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="validUntilTerms">
                      {t("fields.validUntil")}
                    </Label>
                    <Input
                      id="validUntilTerms"
                      type="date"
                      disabled={!editable}
                      value={validUntil}
                      onChange={(e) => {
                        setValidUntil(e.target.value);
                        markDirty();
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentConditions">
                    {t("fields.paymentConditions")}
                  </Label>
                  <textarea
                    id="paymentConditions"
                    rows={3}
                    value={paymentConditions}
                    disabled={!editable}
                    placeholder={t("placeholders.paymentConditions")}
                    onChange={(e) => {
                      setPaymentConditions(e.target.value);
                      markDirty();
                    }}
                    className="border-input bg-background w-full resize-y rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="externalNotes">
                    {t("fields.externalNotes")}
                  </Label>
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
              </div>
            ) : null}

            {tab === "attachments" ? (
              <ComingSoon
                icon={<Paperclip className="size-6 text-primary" />}
                title={t("stubs.attachmentsTitle")}
                hint={t("stubs.attachmentsHint")}
              />
            ) : null}

            {tab === "notes" ? (
              <div className="space-y-2 p-5">
                <Label htmlFor="internalNotes">
                  {t("fields.internalNotes")}
                </Label>
                <textarea
                  id="internalNotes"
                  rows={10}
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

            {tab === "activity" ? (
              <ComingSoon
                icon={<Activity className="size-6 text-primary" />}
                title={t("activity.title")}
                hint={t("activity.hint")}
              />
            ) : null}
          </PageCard>
        </div>

        {showRail ? (
          <QuoteEditorRail
            quoteId={quote.id}
            lines={lines}
            status={status}
            editable={editable}
            busy={busy}
            dirty={dirty}
            saveLabel={saveLabel}
            validUntil={validUntil}
            paymentTermsDays={paymentTermsDays}
            paymentConditions={paymentConditions}
            onSave={() => void saveAll()}
            onOpenPlanningEditor={() => setPlanningOpen(true)}
            onValidUntilChange={(value) => {
              setValidUntil(value);
              markDirty();
            }}
            onPaymentTermsDaysChange={(value) => {
              setPaymentTermsDays(value);
              markDirty();
            }}
            onPaymentConditionsChange={(value) => {
              setPaymentConditions(value);
              markDirty();
            }}
          />
        ) : null}
      </div>

      <Sheet open={planningOpen} onOpenChange={setPlanningOpen}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="h-full w-[min(100%,70vw)] gap-0 overflow-hidden p-0 data-[side=right]:w-[min(100%,70vw)] data-[side=right]:sm:max-w-[70vw]"
        >
          <SheetHeader className="flex-row items-start justify-between space-y-0 border-b border-border px-5 py-3">
            <div className="space-y-1">
              <SheetTitle className="text-sm font-medium">
                {t("financialPlanning.title")}
              </SheetTitle>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {t("financialPlanning.subtitle")}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setPlanningOpen(false)}
              aria-label={tCommon("close")}
            >
              <X className="size-4" />
            </Button>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <QuoteFinancialPlanning
              quoteId={quote.id}
              lines={lines}
              quoteNumber={quote.quoteNumber}
              editable={editable}
            />
          </div>
        </SheetContent>
      </Sheet>

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

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function ComingSoon({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      {icon}
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
