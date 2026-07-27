"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  computeQuoteTotals,
  formatEuro,
  type QuoteTotals,
} from "@/features/quotes/lib/quote-line";
import type { QuoteLineRow } from "@/features/quotes/quotes-actions";
import { PageCard } from "@/features/shell/components/page-card";

type QuoteTotalsPanelProps = {
  lines: QuoteLineRow[];
  marginPercent?: number;
  onMarginPercentChange?: (value: number) => void;
  showMargin?: boolean;
  showInclVatToggle?: boolean;
  title?: string;
  footer?: React.ReactNode;
};

export function QuoteTotalsPanel({
  lines,
  marginPercent = 0,
  onMarginPercentChange,
  showMargin = false,
  showInclVatToggle = true,
  title,
  footer,
}: QuoteTotalsPanelProps) {
  const t = useTranslations("quotes");
  const [showInclVat, setShowInclVat] = useState(true);

  const totals: QuoteTotals = useMemo(
    () => computeQuoteTotals(lines, marginPercent),
    [lines, marginPercent],
  );

  return (
    <PageCard className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          {title ?? t("totalsTitle")}
        </h2>
        {showInclVatToggle ? (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowInclVat((value) => !value)}
          >
            {showInclVat ? t("totals.showExcl") : t("totals.showIncl")}
          </button>
        ) : null}
      </div>
      <dl className="space-y-2.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t("totals.subtotal")}</dt>
          <dd className="font-mono tabular-nums">
            {formatEuro(totals.subtotal)}
          </dd>
        </div>
        {totals.discount > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t("totals.discount")}</dt>
            <dd className="font-mono tabular-nums text-emerald-700">
              − {formatEuro(totals.discount)}
            </dd>
          </div>
        ) : null}
        {showMargin && onMarginPercentChange ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">
              {t("totals.marginPercent")}
            </dt>
            <dd>
              <Input
                inputMode="decimal"
                value={String(marginPercent)}
                className="h-8 w-16 font-mono text-right tabular-nums"
                onChange={(event) => {
                  const n = Number(event.target.value.replace(",", "."));
                  onMarginPercentChange(
                    Number.isNaN(n) ? 0 : Math.max(0, n),
                  );
                }}
              />
            </dd>
          </div>
        ) : null}
        {showMargin && totals.marginCents > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t("totals.margin")}</dt>
            <dd className="font-mono tabular-nums">
              {formatEuro(totals.marginCents)}
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t("totals.net")}</dt>
          <dd className="font-mono tabular-nums">{formatEuro(totals.net)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t("totals.vat")}</dt>
          <dd className="font-mono tabular-nums">{formatEuro(totals.vat)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-border pt-3 text-base font-semibold">
          <dt>{showInclVat ? t("totals.gross") : t("totals.net")}</dt>
          <dd className="font-mono tabular-nums">
            {formatEuro(showInclVat ? totals.gross : totals.net)}
          </dd>
        </div>
      </dl>
      {footer ? <div className="pt-1">{footer}</div> : null}
    </PageCard>
  );
}

export function QuoteTotalsPanelFooterButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      className="w-full"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
