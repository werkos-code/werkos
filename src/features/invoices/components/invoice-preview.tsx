"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { InvoiceDetail } from "@/features/invoices/invoices-actions";
import { lineNetCents } from "@/features/invoices/lib/invoice-pricing";
import { formatLetterheadAddressLines } from "@/features/organization/lib/organization-letterhead";
import { PageCard } from "@/features/shell/components/page-card";

type InvoicePreviewProps = {
  invoice: InvoiceDetail;
  showToolbar?: boolean;
};

function formatEuro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

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

export function InvoicePreview({
  invoice,
  showToolbar = true,
}: InvoicePreviewProps) {
  const t = useTranslations("invoices");
  const tEditor = useTranslations("invoices.editor");
  const org = invoice.organization;
  const orgName =
    org?.name?.trim() ||
    invoice.organizationName?.trim() ||
    t("preview.organizationFallback");
  const addressLines = org ? formatLetterheadAddressLines(org) : [];
  const locale =
    typeof document !== "undefined"
      ? document.documentElement.lang || "nl-NL"
      : "nl-NL";
  const lines = [...invoice.lines].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-4">
      {showToolbar ? (
        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t("preview.hint")}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="size-3.5" />
            {t("preview.print")}
          </Button>
        </div>
      ) : null}

      <PageCard className="document-preview-print overflow-hidden p-6 sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
          <div className="flex max-w-md items-start gap-4">
            {org?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logoUrl}
                alt={orgName}
                className="h-14 w-auto max-w-[9rem] object-contain"
              />
            ) : null}
            <div className="space-y-1">
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
              <div className="space-y-0.5 pt-2 text-xs text-muted-foreground">
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
          </div>
          <div className="text-right text-sm">
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {invoice.invoiceNumber}
            </p>
            <p className="mt-1 text-base font-semibold tracking-tight">
              {invoice.title}
            </p>
            <p className="mt-2 text-muted-foreground">
              {tEditor("fields.issueDate")}:{" "}
              {formatDate(invoice.issueDate, locale)}
            </p>
            <p className="text-muted-foreground">
              {tEditor("fields.dueDate")}: {formatDate(invoice.dueDate, locale)}
            </p>
          </div>
        </header>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-1 text-sm">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("preview.customer")}
            </p>
            <p className="font-medium">{invoice.customerName || "—"}</p>
            {invoice.customerAddress?.trim() ? (
              <p className="whitespace-pre-wrap text-muted-foreground">
                {invoice.customerAddress}
              </p>
            ) : null}
            {invoice.customerEmail ? (
              <p className="text-muted-foreground">{invoice.customerEmail}</p>
            ) : null}
            {invoice.customerPhone ? (
              <p className="text-muted-foreground">{invoice.customerPhone}</p>
            ) : null}
          </div>
          <div className="space-y-1 text-sm sm:text-right">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("preview.project")}
            </p>
            <p className="font-medium">{invoice.projectName}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {invoice.projectNumber}
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {tEditor("fields.lineTitle")}
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {tEditor("fields.quantity")}
                </th>
                <th className="px-3 py-2 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {tEditor("fields.unit")}
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {tEditor("fields.unitPrice")}
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {tEditor("fields.lineTotal")}
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    {tEditor("noLines")}
                  </td>
                </tr>
              ) : (
                lines.map((line) => {
                  const net = lineNetCents({
                    quantity: line.quantity,
                    unitPriceCents: line.unitPriceCents,
                    discountCents: line.discountCents,
                  });
                  return (
                    <tr key={line.id} className="border-b border-border/60">
                      <td className="px-3 py-2 align-top text-sm">
                        <p className="font-medium">
                          {line.title.trim() || "—"}
                        </p>
                        {line.description?.trim() ? (
                          <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">
                            {line.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">
                        {line.quantity.toLocaleString(locale, {
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-muted-foreground">
                        {line.unit || "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">
                        {formatEuro(line.unitPriceCents)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm tabular-nums">
                        {formatEuro(net)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between gap-6">
              <dt className="text-muted-foreground">
                {tEditor("totals.subtotal")}
              </dt>
              <dd className="font-mono tabular-nums">
                {formatEuro(invoice.subtotalCents)}
              </dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="text-muted-foreground">{tEditor("totals.vat")}</dt>
              <dd className="font-mono tabular-nums">
                {formatEuro(invoice.vatCents)}
              </dd>
            </div>
            <div className="flex justify-between gap-6 border-t border-border pt-2 text-base font-semibold">
              <dt>{tEditor("totals.gross")}</dt>
              <dd className="font-mono tabular-nums">
                {formatEuro(invoice.totalCents)}
              </dd>
            </div>
          </dl>
        </div>

        {invoice.notes?.trim() ? (
          <div className="mt-8 space-y-1 border-t border-border pt-6 text-sm">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {tEditor("tabs.notes")}
            </p>
            <p className="whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        ) : null}

        <p className="mt-10 text-center text-[11px] text-muted-foreground">
          {t("preview.footer", { organization: orgName })}
        </p>
      </PageCard>
    </div>
  );
}
