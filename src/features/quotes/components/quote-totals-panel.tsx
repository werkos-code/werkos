"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  computeQuoteTotals,
  formatEuro,
  type QuoteTotals,
} from "@/features/quotes/lib/quote-line";
import type { QuoteLineRow } from "@/features/quotes/quotes-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { cn } from "@/lib/utils";

type QuoteTotalsPanelProps = {
  lines: QuoteLineRow[];
  marginPercent?: number;
  onMarginPercentChange?: (value: number) => void;
  showMargin?: boolean;
  showInclVatToggle?: boolean;
  title?: string;
  footer?: React.ReactNode;
  /** Render without PageCard wrapper (for nesting in rail). */
  embedded?: boolean;
};

export function QuoteTotalsPanel({
  lines,
  marginPercent = 0,
  onMarginPercentChange,
  showMargin = false,
  showInclVatToggle = true,
  title,
  footer,
  embedded = false,
}: QuoteTotalsPanelProps) {
  const t = useTranslations("quotes");
  const [showInclVat, setShowInclVat] = useState(true);

  const totals: QuoteTotals = useMemo(
    () => computeQuoteTotals(lines, marginPercent),
    [lines, marginPercent],
  );

  const body = (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{title ?? t("totalsTitle")}</h2>
        {showInclVatToggle ? (
          <div className="grid grid-cols-2 gap-0.5 rounded-lg border border-border p-0.5">
            <button
              type="button"
              className={cn(
                "rounded-md px-2 py-1 text-[11px] transition-colors",
                showInclVat
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setShowInclVat(true)}
            >
              {t("totals.inclShort")}
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md px-2 py-1 text-[11px] transition-colors",
                !showInclVat
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setShowInclVat(false)}
            >
              {t("totals.exclShort")}
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-3">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {showInclVat ? t("totals.gross") : t("totals.net")}
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
          {formatEuro(showInclVat ? totals.gross : totals.net)}
        </p>
      </div>

      <dl className="space-y-2 text-sm">
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
            <dd className="flex items-center gap-1">
              <input
                inputMode="decimal"
                value={String(marginPercent)}
                className="border-input h-8 w-14 rounded-lg border bg-background px-2 text-right font-mono text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                onChange={(event) => {
                  const n = Number(event.target.value.replace(",", "."));
                  onMarginPercentChange(
                    Number.isNaN(n) ? 0 : Math.max(0, n),
                  );
                }}
              />
              <span className="text-xs text-muted-foreground">%</span>
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
      </dl>
      {footer ? <div className="pt-1">{footer}</div> : null}
    </div>
  );

  if (embedded) return body;
  return <PageCard className="p-4">{body}</PageCard>;
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
