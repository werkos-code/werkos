"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { ExternalLink, Loader2, Plus, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  computeBillingPlan,
  defaultBillingTemplate,
  formatEuro,
  type ComputedBillingPhase,
} from "@/features/quotes/lib/quote-billing";
import type { QuoteLineRow } from "@/features/quotes/quotes-actions";
import { cn } from "@/lib/utils";

type QuoteBillingTimelineProps = {
  quoteId: string;
  lines: QuoteLineRow[];
  editable: boolean;
  onOpenEditor?: () => void;
};

export function QuoteBillingTimeline({
  quoteId,
  lines,
  editable,
  onOpenEditor,
}: QuoteBillingTimelineProps) {
  const t = useTranslations("quotes.financialPlanning");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [phases, setPhases] = useState<ComputedBillingPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
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
      setPhases(data.phases ?? []);
    } catch {
      setError(tCommon("error"));
    } finally {
      setLoading(false);
    }
  }, [quoteId, tCommon]);

  useEffect(() => {
    void load();
  }, [load, lines]);

  async function applyTemplate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/billing-phases`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phases: defaultBillingTemplate() }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? tCommon("error"));
        return;
      }
      await load();
    } catch {
      setError(tCommon("error"));
    } finally {
      setBusy(false);
    }
  }

  async function invoicePhase(phaseId: string) {
    setBusy(true);
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
        setError(data.error ?? tCommon("error"));
        return;
      }
      router.push(`/facturen/${data.invoiceId}`);
    } catch {
      setError(tCommon("error"));
    } finally {
      setBusy(false);
    }
  }

  const plan = computeBillingPlan(
    phases.map((p) => ({
      id: p.id,
      sortOrder: p.sortOrder,
      title: p.title,
      kind: p.kind,
      amountType: p.amountType,
      amountValue: p.amountValue,
      invoiceId: p.invoiceId,
      invoiceNumber: p.invoiceNumber,
      invoicedAt: p.invoicedAt,
    })),
    lines,
  );

  if (loading) {
    return (
      <div className="flex justify-center py-6 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{t("title")}</h3>
        {editable ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-primary"
            disabled={busy}
            onClick={() => {
              if (phases.length === 0) void applyTemplate();
              else onOpenEditor?.();
            }}
          >
            <Plus className="size-3.5" />
            {t("addPhase")}
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}

      {plan.phases.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("empty")}</p>
      ) : (
        <ol className="space-y-0">
          {plan.phases.map((phase, index) => {
            const isLast = index === plan.phases.length - 1;
            return (
              <li key={phase.id} className="relative flex gap-3 pb-4 last:pb-0">
                {!isLast ? (
                  <span
                    aria-hidden
                    className="absolute top-3 left-[0.4rem] h-[calc(100%-0.25rem)] w-px bg-border"
                  />
                ) : null}
                <span
                  className={cn(
                    "relative z-10 mt-1 size-2 shrink-0 rounded-full",
                    phase.isInvoiced ? "bg-primary" : "bg-primary/40",
                  )}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {phase.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {phase.percentLabel ??
                          (phase.kind === "final" ? t("finalAuto") : "—")}
                        {phase.isInvoiced && phase.invoiceNumber
                          ? ` · ${phase.invoiceNumber}`
                          : null}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-sm tabular-nums">
                      {formatEuro(phase.grossCents)}
                    </p>
                  </div>
                  {!phase.isInvoiced && editable && phase.netCents > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-0 text-xs text-primary"
                      disabled={busy}
                      onClick={() => void invoicePhase(phase.id)}
                    >
                      <Receipt className="size-3.5" />
                      {t("invoice")}
                    </Button>
                  ) : null}
                  {phase.isInvoiced && phase.invoiceId ? (
                    <Link
                      href={`/facturen/${phase.invoiceId}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {t("status.invoiced")}
                      <ExternalLink className="size-3" />
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {plan.phases.length > 0 ? (
        <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-medium">
          <span>100%</span>
          <span className="font-mono tabular-nums">
            {formatEuro(plan.summary.quoteGrossCents)}
          </span>
        </div>
      ) : null}

      {onOpenEditor ? (
        <button
          type="button"
          className="text-xs font-medium text-primary hover:underline"
          onClick={onOpenEditor}
        >
          {t("editPlanning")}
        </button>
      ) : null}
    </div>
  );
}
