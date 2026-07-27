"use client";

import { useTranslations } from "next-intl";

import { QuoteLinesWorkspace } from "@/features/quotes/components/quote-lines-workspace";
import { QuoteTotalsPanel } from "@/features/quotes/components/quote-totals-panel";
import type { QuoteLineRow } from "@/features/quotes/quotes-actions";
import { PageCard } from "@/features/shell/components/page-card";

type StepCalculatieProps = {
  lines: QuoteLineRow[];
  marginPercent: number;
  onChangeLines: (lines: QuoteLineRow[]) => void;
  onChangeMargin: (marginPercent: number) => void;
};

export function StepCalculatie({
  lines,
  marginPercent,
  onChangeLines,
  onChangeMargin,
}: StepCalculatieProps) {
  const t = useTranslations("assignment.calculatie");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <PageCard className="overflow-hidden">
          <QuoteLinesWorkspace
            lines={lines}
            onChange={onChangeLines}
            showToolbarExtras={false}
            emptyMessage={t("empty")}
          />
        </PageCard>

        <aside className="space-y-3 xl:sticky xl:top-20 xl:self-start">
          <QuoteTotalsPanel
            lines={lines}
            marginPercent={marginPercent}
            onMarginPercentChange={onChangeMargin}
            showMargin
            showInclVatToggle
            title={t("totalsTitle")}
          />
        </aside>
      </div>
    </div>
  );
}
