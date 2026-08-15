"use client";

import { useTranslations } from "next-intl";

import { AssignmentCalculator } from "@/features/assignments/components/assignment-calculator";
import type { QuoteLineRow } from "@/features/quotes/quotes-actions";

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

      <AssignmentCalculator
        lines={lines}
        marginPercent={marginPercent}
        onChangeLines={onChangeLines}
        onChangeMargin={onChangeMargin}
      />
    </div>
  );
}
