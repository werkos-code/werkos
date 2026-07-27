"use client";

import { Link, useRouter } from "@/i18n/navigation";
import {
  Activity,
  Check,
  Ellipsis,
  Eye,
  FileText,
  Paperclip,
  Pencil,
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
import { QuoteEditorRail } from "@/features/quotes/components/quote-editor-rail";
import { QuoteFinancialPlanning } from "@/features/quotes/components/quote-financial-planning";
import { QuoteLinesWorkspace } from "@/features/quotes/components/quote-lines-workspace";
import {
  collectDescendants,
  computeQuoteTotals,
  formatEuro,
  getLeafLines,
} from "@/features/quotes/lib/quote-line";
import { isQuoteEditable } from "@/features/quotes/lib/quote-status";
import type { QuoteDetail, QuoteLineRow } from "@/features/quotes/quotes-actions";
import {
  MetaStatCard,
  PageCard,
} from "@/features/shell/components/page-card";
import type { QuoteStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type QuoteEditorProps = {
  quote: QuoteDetail;
};

type EditorTab =
  | "overview"
  | "editor"
  | "terms"
  | "attachments"
  | "notes"
  | "activity";

export function QuoteEditor({ quote }: QuoteEditorProps) {
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            title={t("stubs.more")}
          >
            {t("actions.menu")}
            <Ellipsis className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            title={t("stubs.preview")}
          >
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
          value={<span className="text-muted-foreground">—</span>}
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
                  onChange={(next) => {
                    setLines(next);
                    markDirty();
                  }}
                  editable={editable}
                  busy={busy}
                  onAddLine={addLine}
                  onDeleteLine={deleteLine}
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
                <div className="space-y-2">
                  <Label htmlFor="externalNotes">
                    {t("fields.externalNotes")}
                  </Label>
                  <textarea
                    id="externalNotes"
                    rows={10}
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
            onSave={() => void saveAll()}
            onOpenPlanningEditor={() => setPlanningOpen(true)}
            onValidUntilChange={(value) => {
              setValidUntil(value);
              markDirty();
            }}
          />
        ) : null}
      </div>

      <Dialog open={planningOpen} onOpenChange={setPlanningOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("financialPlanning.title")}</DialogTitle>
            <DialogDescription>
              {t("financialPlanning.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <QuoteFinancialPlanning
            quoteId={quote.id}
            lines={lines}
            quoteNumber={quote.quoteNumber}
            editable={editable}
          />
        </DialogContent>
      </Dialog>

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
