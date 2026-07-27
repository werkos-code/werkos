"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  computeCalculationTotals,
  formatEuro,
  lineNetCents,
} from "@/features/assignments/lib/calculation";
import type { AssignmentWizardState, CalculationLine } from "@/features/assignments/lib/wizard-state";
import { createCalculationLine } from "@/features/assignments/lib/wizard-state";
import { PageCard } from "@/features/shell/components/page-card";

type StepCalculatieProps = {
  state: AssignmentWizardState;
  onChangeLines: (lines: CalculationLine[]) => void;
  onChangeMargin: (marginPercent: number) => void;
};

function centsToDraft(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function draftToCents(value: string): number {
  const trimmed = value.trim().replace(",", ".");
  const n = Number(trimmed);
  return Number.isNaN(n) ? 0 : Math.round(n * 100);
}

function MoneyInput({
  cents,
  onCommit,
}: {
  cents: number;
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
      value={focused ? draft : centsToDraft(cents)}
      className="h-8 font-mono text-right tabular-nums"
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

export function StepCalculatie({
  state,
  onChangeLines,
  onChangeMargin,
}: StepCalculatieProps) {
  const t = useTranslations("assignment.calculatie");
  const lines = state.calculation.lines;
  const totals = computeCalculationTotals(lines, state.calculation.marginPercent);

  function updateLine(id: string, patch: Partial<CalculationLine>) {
    onChangeLines(
      lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(id: string) {
    onChangeLines(lines.filter((line) => line.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <PageCard className="overflow-hidden">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-primary/30 text-primary"
                onClick={() =>
                  onChangeLines([...lines, createCalculationLine()])
                }
              >
                <Plus className="size-3.5" />
                {t("addLine")}
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="hidden bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[minmax(0,1fr)_4rem_4rem_5.5rem_5rem_2rem] md:gap-2">
                <span>{t("columns.description")}</span>
                <span>{t("columns.unit")}</span>
                <span className="text-right">{t("columns.qty")}</span>
                <span className="text-right">{t("columns.price")}</span>
                <span className="text-right">{t("columns.total")}</span>
                <span />
              </div>
              {lines.map((line) => (
                <div
                  key={line.id}
                  className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_4rem_4rem_5.5rem_5rem_2rem] md:items-center"
                >
                  <Input
                    value={line.title}
                    placeholder={t("linePlaceholder")}
                    className="h-8"
                    onChange={(e) =>
                      updateLine(line.id, { title: e.target.value })
                    }
                  />
                  <Input
                    value={line.unit}
                    className="h-8"
                    onChange={(e) =>
                      updateLine(line.id, { unit: e.target.value })
                    }
                  />
                  <Input
                    inputMode="decimal"
                    value={String(line.quantity).replace(".", ",")}
                    className="h-8 font-mono text-right tabular-nums"
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(",", "."));
                      updateLine(line.id, {
                        quantity: Number.isNaN(n) ? 0 : n,
                      });
                    }}
                  />
                  <MoneyInput
                    cents={line.unitPriceCents}
                    onCommit={(cents) =>
                      updateLine(line.id, { unitPriceCents: cents })
                    }
                  />
                  <div className="flex h-8 items-center justify-end font-mono text-sm tabular-nums">
                    {formatEuro(lineNetCents(line))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive justify-self-end"
                    onClick={() => removeLine(line.id)}
                    aria-label={t("removeLine")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <div className="px-4 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-primary/30 text-primary"
                  onClick={() =>
                    onChangeLines([...lines, createCalculationLine()])
                  }
                >
                  <Plus className="size-3.5" />
                  {t("addLine")}
                </Button>
              </div>
            </div>
          )}
        </PageCard>

        <aside className="space-y-3">
          <PageCard className="p-4">
            <h3 className="text-sm font-medium">{t("totalsTitle")}</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("subtotal")}</dt>
                <dd className="tabular-nums">
                  {formatEuro(totals.subtotalCents)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{t("margin")}</dt>
                <dd>
                  <Input
                    inputMode="decimal"
                    value={String(state.calculation.marginPercent)}
                    className="h-8 w-16 font-mono text-right tabular-nums"
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(",", "."));
                      onChangeMargin(Number.isNaN(n) ? 0 : Math.max(0, n));
                    }}
                  />
                </dd>
              </div>
              {totals.marginCents > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("marginAmount")}</dt>
                  <dd className="tabular-nums">
                    {formatEuro(totals.marginCents)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("vat")}</dt>
                <dd className="tabular-nums">{formatEuro(totals.vatCents)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-2 font-medium">
                <dt>{t("total")}</dt>
                <dd className="tabular-nums">{formatEuro(totals.totalCents)}</dd>
              </div>
            </dl>
          </PageCard>
          <PageCard className="border-dashed p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("futureTitle")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {t("futureHint")}
            </p>
          </PageCard>
        </aside>
      </div>
    </div>
  );
}
