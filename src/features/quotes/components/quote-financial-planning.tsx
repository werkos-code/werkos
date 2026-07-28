"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { ExternalLink, Loader2, Plus, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  computeBillingPlan,
  defaultBillingTemplate,
  formatEuro,
  type BillingPlanSummary,
  type ComputedBillingPhase,
  type QuoteBillingPhaseInput,
} from "@/features/quotes/lib/quote-billing";
import type { QuoteLineRow } from "@/features/quotes/quotes-actions";
import { PageCard } from "@/features/shell/components/page-card";

const selectClass =
  "border-input bg-background h-8 rounded-lg border px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type DraftPhase = QuoteBillingPhaseInput & { id?: string };

type QuoteFinancialPlanningProps = {
  quoteId: string;
  lines: QuoteLineRow[];
  quoteNumber: string | null;
  editable: boolean;
};

export function QuoteFinancialPlanning({
  quoteId,
  lines,
  quoteNumber,
  editable,
}: QuoteFinancialPlanningProps) {
  const t = useTranslations("quotes.financialPlanning");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [draftPhases, setDraftPhases] = useState<DraftPhase[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoicingId, setInvoicingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPhases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/billing-phases`, {
        signal: AbortSignal.timeout(20_000),
      });
      const data = (await res.json()) as {
        error?: string;
        phases?: ComputedBillingPhase[];
      };
      if (!res.ok || data.error) {
        setError(data.error ?? tCommon("error"));
        return;
      }
      setDraftPhases(
        (data.phases ?? []).map((phase) => ({
          id: phase.id,
          title: phase.title,
          kind: phase.kind,
          amountType: phase.amountType,
          amountValue: phase.amountValue,
        })),
      );
      setDirty(false);
      setLoaded(true);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }, [quoteId, tCommon]);

  useEffect(() => {
    void loadPhases();
  }, [loadPhases]);

  const preview = useMemo(() => {
    const rows = draftPhases.map((phase, index) => ({
      id: phase.id ?? `draft-${index}`,
      sortOrder: index,
      title: phase.title,
      kind: phase.kind ?? "standard",
      amountType: phase.amountType,
      amountValue: phase.amountValue,
      invoiceId: null,
      invoiceNumber: null,
      invoicedAt: null,
    }));
    return computeBillingPlan(rows, lines);
  }, [draftPhases, lines]);

  function updatePhase(index: number, patch: Partial<DraftPhase>) {
    setDraftPhases((prev) =>
      prev.map((phase, i) => (i === index ? { ...phase, ...patch } : phase)),
    );
    setDirty(true);
  }

  function addPhase() {
    setDraftPhases((prev) => [
      ...prev,
      {
        title: t("newPhaseTitle"),
        kind: "standard",
        amountType: "percent",
        amountValue: 0,
      },
    ]);
    setDirty(true);
  }

  function addTemplate() {
    setDraftPhases(defaultBillingTemplate());
    setDirty(true);
  }

  function removePhase(index: number) {
    setDraftPhases((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  async function savePhases() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/billing-phases`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phases: draftPhases }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok || data.error) {
        setError(mapError(data.error, t));
        return;
      }
      await loadPhases();
    } catch {
      setError(tCommon("error"));
    } finally {
      setSaving(false);
    }
  }

  async function invoicePhase(phaseId: string) {
    if (dirty) {
      setError(t("saveBeforeInvoice"));
      return;
    }
    setInvoicingId(phaseId);
    setError(null);
    try {
      const res = await fetch(
        `/api/quotes/${quoteId}/billing-phases/${phaseId}/invoice`,
        { method: "POST", signal: AbortSignal.timeout(30_000) },
      );
      const data = (await res.json()) as {
        error?: string;
        invoiceId?: string;
      };
      if (!res.ok || data.error || !data.invoiceId) {
        setError(mapError(data.error, t));
        return;
      }
      await loadPhases();
      router.push(`/facturen/${data.invoiceId}`);
    } catch {
      setError(tCommon("error"));
    } finally {
      setInvoicingId(null);
    }
  }

  if (loading && !loaded) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{t("title")}</h3>
          <p className="max-w-xl text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        {editable ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addTemplate}
            >
              {t("addTemplate")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addPhase}>
              <Plus className="size-3.5" />
              {t("addPhase")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!dirty || saving}
              onClick={() => void savePhases()}
            >
              {saving ? tCommon("loading") : t("save")}
            </Button>
          </div>
        ) : null}
      </div>

      <PlanningSummaryBar summary={preview.summary} quoteNumber={quoteNumber} />

      {error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {draftPhases.length === 0 ? (
        <PageCard className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <Receipt className="size-8 text-primary/70" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
          {editable ? (
            <Button type="button" variant="outline" size="sm" onClick={addTemplate}>
              {t("addTemplate")}
            </Button>
          ) : null}
        </PageCard>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                <th className="px-2 py-2">{t("columns.title")}</th>
                <th className="px-2 py-2">{t("columns.type")}</th>
                <th className="px-2 py-2 text-right">{t("columns.amount")}</th>
                <th className="px-2 py-2 text-right">{t("columns.net")}</th>
                <th className="px-2 py-2">{t("columns.status")}</th>
                <th className="px-2 py-2 text-right">{t("columns.action")}</th>
              </tr>
            </thead>
            <tbody>
              {preview.phases.map((phase, index) => (
                <PhaseRow
                  key={phase.id}
                  phase={phase}
                  index={index}
                  editable={editable}
                  draft={draftPhases[index]}
                  invoicing={invoicingId === phase.id}
                  onChange={(patch) => updatePhase(index, patch)}
                  onRemove={() => removePhase(index)}
                  onInvoice={() => void invoicePhase(phase.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!preview.summary.isBalanced && draftPhases.length > 0 ? (
        <p className="text-sm text-amber-800">{t("unbalanced")}</p>
      ) : null}
    </div>
  );
}

function PlanningSummaryBar({
  summary,
  quoteNumber,
}: {
  summary: BillingPlanSummary;
  quoteNumber: string | null;
}) {
  const t = useTranslations("quotes.financialPlanning");
  const progress =
    summary.quoteNetCents > 0
      ? Math.min(100, (summary.invoicedNetCents / summary.quoteNetCents) * 100)
      : 0;

  return (
    <PageCard className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label={t("summary.quoteTotal")} value={formatEuro(summary.quoteGrossCents)} />
      <Stat
        label={t("summary.planned")}
        value={formatEuro(summary.plannedNetCents)}
        hint={
          quoteNumber
            ? `${summary.plannedPercentBps / 100}%`
            : undefined
        }
      />
      <Stat
        label={t("summary.invoiced")}
        value={formatEuro(summary.invoicedNetCents)}
      />
      <div className="space-y-2">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {t("summary.progress")}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="font-mono text-sm tabular-nums">
          {formatEuro(summary.remainingNetCents)} {t("summary.remaining")}
        </p>
      </div>
    </PageCard>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-medium tabular-nums">{value}</p>
      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function PhaseRow({
  phase,
  index,
  editable,
  draft,
  invoicing,
  onChange,
  onRemove,
  onInvoice,
}: {
  phase: ComputedBillingPhase;
  index: number;
  editable: boolean;
  draft?: DraftPhase;
  invoicing: boolean;
  onChange: (patch: Partial<DraftPhase>) => void;
  onRemove: () => void;
  onInvoice: () => void;
}) {
  const t = useTranslations("quotes.financialPlanning");
  const locked = phase.isInvoiced;

  return (
    <tr className="border-b border-border/60">
      <td className="px-2 py-3">
        {editable && !locked ? (
          <Input
            value={draft?.title ?? phase.title}
            className="h-8"
            onChange={(e) => onChange({ title: e.target.value })}
          />
        ) : (
          <span className="font-medium">{phase.title}</span>
        )}
      </td>
      <td className="px-2 py-3">
        {editable && !locked ? (
          <select
            className={`${selectClass} w-full min-w-0`}
            value={draft?.kind ?? "standard"}
            onChange={(e) =>
              onChange({
                kind: e.target.value as "standard" | "final",
              })
            }
          >
            <option value="standard">{t("kinds.standard")}</option>
            <option value="final">{t("kinds.final")}</option>
          </select>
        ) : (
          <span className="text-muted-foreground">
            {phase.kind === "final" ? t("kinds.final") : t("kinds.standard")}
          </span>
        )}
      </td>
      <td className="px-2 py-3 text-right">
        {phase.kind === "final" ? (
          <span className="text-muted-foreground">{t("finalAuto")}</span>
        ) : editable && !locked ? (
          <div className="flex items-center justify-end gap-1">
            <select
              className={`${selectClass} w-[4.75rem]`}
              value={draft?.amountType ?? "percent"}
              onChange={(e) =>
                onChange({
                  amountType: e.target.value as "percent" | "fixed_cents",
                })
              }
            >
              <option value="percent">%</option>
              <option value="fixed_cents">€</option>
            </select>
            <Input
              inputMode="decimal"
              className="h-8 w-16 font-mono text-right tabular-nums"
              value={
                draft?.amountType === "fixed_cents"
                  ? String((draft.amountValue / 100).toFixed(2)).replace(".", ",")
                  : String((draft?.amountValue ?? 0) / 100).replace(".", ",")
              }
              onChange={(e) => {
                const raw = e.target.value.replace(",", ".");
                const n = Number(raw);
                if (Number.isNaN(n)) return;
                onChange({
                  amountValue:
                    draft?.amountType === "fixed_cents"
                      ? Math.round(n * 100)
                      : Math.round(n * 100),
                });
              }}
            />
          </div>
        ) : (
          <span className="font-mono tabular-nums">
            {phase.percentLabel ?? formatEuro(phase.amountValue)}
          </span>
        )}
      </td>
      <td className="px-2 py-3 text-right font-mono tabular-nums">
        {formatEuro(phase.netCents)}
      </td>
      <td className="px-2 py-3">
        {locked ? (
          <span className="inline-flex items-center gap-1 text-xs text-primary">
            {phase.invoiceNumber ?? t("status.invoiced")}
            {phase.invoiceId ? (
              <Link
                href={`/facturen/${phase.invoiceId}`}
                className="text-primary hover:underline"
              >
                <ExternalLink className="size-3.5" />
              </Link>
            ) : null}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {t("status.planned")}
          </span>
        )}
      </td>
      <td className="px-2 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {editable && !locked ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={onRemove}
            >
              {t("remove")}
            </Button>
          ) : null}
          {!locked ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-primary/30 text-primary"
              disabled={invoicing || phase.netCents <= 0}
              onClick={onInvoice}
            >
              {invoicing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Receipt className="size-3.5" />
              )}
              {t("invoice")}
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function mapError(
  code: string | undefined,
  t: ReturnType<typeof useTranslations>,
) {
  const known: Record<string, string> = {
    generic: t("errors.generic"),
    percent_over_100: t("errors.percentOver100"),
    multiple_final_phases: t("errors.multipleFinal"),
    already_invoiced: t("errors.alreadyInvoiced"),
    zero_amount: t("errors.zeroAmount"),
    saveBeforeInvoice: t("saveBeforeInvoice"),
  };
  return known[code ?? ""] ?? code ?? t("errors.generic");
}
