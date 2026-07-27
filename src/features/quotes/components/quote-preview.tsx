"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment } from "react";

import { Button } from "@/components/ui/button";
import {
  childrenOf,
  computeQuoteTotals,
  formatEuro,
  getRootLines,
  isPricedLineType,
  isSectionLine,
  sectionTotalCents,
} from "@/features/quotes/lib/quote-line";
import { lineNetCents } from "@/features/quotes/lib/quote-status";
import type { QuoteDetail, QuoteLineRow } from "@/features/quotes/lib/quote-types";
import { formatLetterheadAddressLines } from "@/features/organization/lib/organization-letterhead";
import { PageCard } from "@/features/shell/components/page-card";
import { cn } from "@/lib/utils";

type QuotePreviewProps = {
  quote: QuoteDetail;
  showToolbar?: boolean;
};

function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function QuotePreview({ quote, showToolbar = true }: QuotePreviewProps) {
  const t = useTranslations("quotes");
  const totals = computeQuoteTotals(quote.lines);
  const roots = getRootLines(quote.lines);
  const org = quote.organization;
  const orgName =
    org?.name?.trim() ||
    quote.organizationName?.trim() ||
    t("preview.organizationFallback");
  const addressLines = org
    ? formatLetterheadAddressLines(org)
    : [];
  const locale =
    typeof document !== "undefined"
      ? document.documentElement.lang || "nl-NL"
      : "nl-NL";

  function renderLine(line: QuoteLineRow, depth: number) {
    const kids = childrenOf(quote.lines, line.id);
    const asSection = isSectionLine(line, quote.lines);
    const priced = isPricedLineType(line.lineType);

    if (asSection) {
      return (
        <Fragment key={line.id}>
          <tr className="border-b border-border/80 bg-muted/30">
            <td
              colSpan={4}
              className="px-3 py-2.5 text-sm font-semibold"
              style={{ paddingLeft: `${0.75 + depth * 1}rem` }}
            >
              {line.title.trim() || t("placeholders.section")}
            </td>
            <td className="px-3 py-2.5 text-right font-mono text-sm tabular-nums">
              {formatEuro(sectionTotalCents(quote.lines, line.id))}
            </td>
          </tr>
          {kids.map((child) => renderLine(child, depth + 1))}
        </Fragment>
      );
    }

    if (line.lineType === "text") {
      return (
        <tr key={line.id} className="border-b border-border/60">
          <td
            colSpan={5}
            className="px-3 py-2 text-sm text-muted-foreground"
            style={{ paddingLeft: `${0.75 + depth * 1}rem` }}
          >
            <p className="font-medium text-foreground">
              {line.title.trim() || "—"}
            </p>
            {line.description?.trim() ? (
              <p className="mt-0.5 whitespace-pre-wrap text-xs">
                {line.description}
              </p>
            ) : null}
          </td>
        </tr>
      );
    }

    const net = priced
      ? lineNetCents({
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          discountCents: line.discountCents,
        })
      : 0;

    return (
      <Fragment key={line.id}>
        <tr className="border-b border-border/60">
          <td
            className="px-3 py-2 align-top text-sm"
            style={{ paddingLeft: `${0.75 + depth * 1}rem` }}
          >
            <p className="font-medium">{line.title.trim() || "—"}</p>
            {line.description?.trim() ? (
              <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">
                {line.description}
              </p>
            ) : null}
          </td>
          <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">
            {line.quantity != null
              ? line.quantity.toLocaleString(locale, {
                  maximumFractionDigits: 2,
                })
              : "—"}
          </td>
          <td className="px-3 py-2 text-center text-sm text-muted-foreground">
            {line.unit || "—"}
          </td>
          <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">
            {line.unitPriceCents != null
              ? formatEuro(line.unitPriceCents)
              : "—"}
          </td>
          <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">
            {formatEuro(net)}
          </td>
        </tr>
        {kids.map((child) => renderLine(child, depth + 1))}
      </Fragment>
    );
  }

  return (
    <div className="space-y-4">
      {showToolbar ? (
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("preview.hint")}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            {t("preview.print")}
          </Button>
        </div>
      ) : null}

      <PageCard className="quote-preview-document overflow-hidden p-6 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
          <div className="max-w-sm space-y-1">
            <p className="text-lg font-semibold tracking-tight">{orgName}</p>
            {addressLines.map((line) => (
              <p key={line} className="text-sm text-muted-foreground">
                {line}
              </p>
            ))}
            {org?.phone ? (
              <p className="text-sm text-muted-foreground">{org.phone}</p>
            ) : null}
            {org?.email ? (
              <p className="text-sm text-muted-foreground">{org.email}</p>
            ) : null}
            <div className="pt-2 space-y-0.5 text-xs text-muted-foreground">
              {org?.kvkNumber ? (
                <p>
                  {t("preview.kvk")}: {org.kvkNumber}
                </p>
              ) : null}
              {org?.vatNumber ? (
                <p>
                  {t("preview.vat")}: {org.vatNumber}
                </p>
              ) : null}
              {org?.iban ? (
                <p>
                  {t("preview.iban")}: {org.iban}
                </p>
              ) : null}
            </div>
            <p className="pt-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("preview.documentLabel")}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {quote.quoteNumber || "—"}
            </p>
            <p className="mt-1 text-base font-semibold tracking-tight">
              {quote.title}
            </p>
            <p className="mt-2 text-muted-foreground">
              {t("fields.validUntil")}: {formatDate(quote.validUntil, locale)}
            </p>
          </div>
        </header>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-1 text-sm">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("preview.customer")}
            </p>
            <p className="font-medium">{quote.customerName || "—"}</p>
            {quote.customerAddress?.trim() ? (
              <p className="whitespace-pre-wrap text-muted-foreground">
                {quote.customerAddress}
              </p>
            ) : null}
            {quote.customerEmail ? (
              <p className="text-muted-foreground">{quote.customerEmail}</p>
            ) : null}
            {quote.customerPhone ? (
              <p className="text-muted-foreground">{quote.customerPhone}</p>
            ) : null}
          </div>
          <div className="space-y-1 text-sm sm:text-right">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("preview.project")}
            </p>
            <p className="font-medium">{quote.projectName}</p>
            {quote.paymentTermsDays != null ? (
              <p className="text-muted-foreground">
                {t("fields.paymentTermsDays")}:{" "}
                {t("paymentTermsDaysOption", {
                  days: quote.paymentTermsDays,
                })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("fields.lineTitle")}
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("fields.quantity")}
                </th>
                <th className="px-3 py-2 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("fields.unit")}
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("fields.unitPrice")}
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("fields.lineTotal")}
                </th>
              </tr>
            </thead>
            <tbody>
              {roots.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    {t("noLines")}
                  </td>
                </tr>
              ) : (
                roots.map((line) => renderLine(line, 0))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-muted-foreground">{t("totals.subtotal")}</dt>
              <dd className="font-mono tabular-nums">
                {formatEuro(totals.subtotal)}
              </dd>
            </div>
            {totals.discount > 0 ? (
              <div className="flex justify-between gap-6">
                <dt className="text-muted-foreground">{t("totals.discount")}</dt>
                <dd className="font-mono tabular-nums">
                  −{formatEuro(totals.discount)}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-6">
              <dt className="text-muted-foreground">{t("totals.net")}</dt>
              <dd className="font-mono tabular-nums">{formatEuro(totals.net)}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-muted-foreground">{t("totals.vat")}</dt>
              <dd className="font-mono tabular-nums">{formatEuro(totals.vat)}</dd>
            </div>
            <div className="flex justify-between gap-6 border-t border-border pt-2 text-base font-semibold">
              <dt>{t("totals.gross")}</dt>
              <dd className="font-mono tabular-nums">
                {formatEuro(totals.gross)}
              </dd>
            </div>
          </dl>
        </div>

        {quote.paymentConditions?.trim() || quote.externalNotes?.trim() ? (
          <div className="mt-8 space-y-4 border-t border-border pt-6 text-sm">
            {quote.paymentConditions?.trim() ? (
              <div className="space-y-1">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("fields.paymentConditions")}
                </p>
                <p className="whitespace-pre-wrap">{quote.paymentConditions}</p>
              </div>
            ) : null}
            {quote.externalNotes?.trim() ? (
              <div className="space-y-1">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("fields.externalNotes")}
                </p>
                <p className="whitespace-pre-wrap">{quote.externalNotes}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <p
          className={cn(
            "mt-10 text-center text-[11px] text-muted-foreground",
          )}
        >
          {t("preview.footer", {
            organization: orgName,
          })}
        </p>
      </PageCard>
    </div>
  );
}
