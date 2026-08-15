"use client";

import { Link } from "@/i18n/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { InvoiceDetail } from "@/features/invoices/invoices-actions";
import type { InvoiceLineRow } from "@/features/invoices/lib/invoice-lines";
import { lineNetCents } from "@/features/invoices/lib/invoice-pricing";
import { formatLetterheadAddressLines } from "@/features/organization/lib/organization-letterhead";
import {
  MoneyField,
  QuantityField,
} from "@/features/quotes/components/pricing-fields";
import { PageCard } from "@/features/shell/components/page-card";
import { cn } from "@/lib/utils";

const VAT_PRESETS = [
  { bps: 2100, label: "21%" },
  { bps: 900, label: "9%" },
  { bps: 0, label: "0%" },
] as const;

const ghostInputClass =
  "h-8 border-transparent bg-transparent px-1 shadow-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-input focus-visible:bg-background focus-visible:px-2";

const ghostTextareaClass =
  "w-full resize-y rounded-md border border-transparent bg-transparent px-1 py-1 text-xs text-muted-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-input focus-visible:bg-background focus-visible:px-2";

export function formatInvoiceEuro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function formatInvoiceDate(value: string | null, locale: string) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export type InvoiceDocumentTotals = {
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
};

export type InvoiceDocumentProps = {
  mode: "edit" | "preview";
  invoice: InvoiceDetail;
  title: string;
  issueDate: string;
  dueDate: string;
  notes: string;
  lines: InvoiceLineRow[];
  totals: InvoiceDocumentTotals;
  editable?: boolean;
  busy?: boolean;
  className?: string;
  onTitleChange?: (value: string) => void;
  onIssueDateChange?: (value: string) => void;
  onDueDateChange?: (value: string) => void;
  onNotesChange?: (value: string) => void;
  onLineChange?: (lineId: string, patch: Partial<InvoiceLineRow>) => void;
  onAddLine?: () => void;
  onDeleteLine?: (lineId: string) => void;
};

export function InvoiceDocument({
  mode,
  invoice,
  title,
  issueDate,
  dueDate,
  notes,
  lines,
  totals,
  editable = false,
  busy = false,
  className,
  onTitleChange,
  onIssueDateChange,
  onDueDateChange,
  onNotesChange,
  onLineChange,
  onAddLine,
  onDeleteLine,
}: InvoiceDocumentProps) {
  const t = useTranslations("invoices");
  const tEditor = useTranslations("invoices.editor");
  const isEdit = mode === "edit" && editable;
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
  const sortedLines = [...lines].sort((a, b) => a.sortOrder - b.sortOrder);
  const letterheadThin =
    !org?.logoUrl &&
    addressLines.length === 0 &&
    !org?.kvkNumber &&
    !org?.iban;

  return (
    <PageCard
      className={cn(
        "document-preview-print overflow-hidden",
        mode === "edit" ? "p-6 sm:p-8 lg:p-10" : "p-6 sm:p-8",
        className,
      )}
    >
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
            {mode === "edit" && letterheadThin ? (
              <p className="pt-2 text-xs text-muted-foreground">
                {tEditor("letterheadHint")}{" "}
                <Link
                  href="/instellingen/bedrijf"
                  className="font-medium text-primary hover:underline"
                >
                  {tEditor("letterheadLink")}
                </Link>
              </p>
            ) : null}
            <p className="pt-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("preview.documentLabel")}
            </p>
          </div>
        </div>

        <div className="min-w-[12rem] space-y-2 text-right text-sm">
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {invoice.invoiceNumber}
          </p>
          {isEdit ? (
            <Input
              value={title}
              placeholder={tEditor("placeholders.title")}
              className={cn(
                ghostInputClass,
                "h-9 text-right text-base font-semibold tracking-tight",
              )}
              onChange={(e) => onTitleChange?.(e.target.value)}
            />
          ) : (
            <p className="text-base font-semibold tracking-tight">
              {title.trim() || "—"}
            </p>
          )}
          <div className="space-y-1 pt-1">
            <label className="flex items-center justify-end gap-2 text-muted-foreground">
              <span className="text-xs">{tEditor("fields.issueDate")}</span>
              {isEdit ? (
                <Input
                  type="date"
                  value={issueDate}
                  className="h-8 w-[9.5rem] border-border/60 bg-background font-mono text-xs"
                  onChange={(e) => onIssueDateChange?.(e.target.value)}
                />
              ) : (
                <span>{formatInvoiceDate(issueDate, locale)}</span>
              )}
            </label>
            <label className="flex items-center justify-end gap-2 text-muted-foreground">
              <span className="text-xs">{tEditor("fields.dueDate")}</span>
              {isEdit ? (
                <Input
                  type="date"
                  value={dueDate}
                  className="h-8 w-[9.5rem] border-border/60 bg-background font-mono text-xs"
                  onChange={(e) => onDueDateChange?.(e.target.value)}
                />
              ) : (
                <span>{formatInvoiceDate(dueDate || null, locale)}</span>
              )}
            </label>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="space-y-1 text-sm">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {t("preview.customer")}
          </p>
          {invoice.customerId ? (
            <Link
              href={`/klanten/${invoice.customerId}`}
              className="font-medium hover:text-primary hover:underline"
            >
              {invoice.customerName || "—"}
            </Link>
          ) : (
            <p className="font-medium">{invoice.customerName || "—"}</p>
          )}
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
          <Link
            href={`/projecten/${invoice.projectId}`}
            className="font-medium hover:text-primary hover:underline"
          >
            {invoice.projectName}
          </Link>
          <p className="font-mono text-xs text-muted-foreground">
            {invoice.projectNumber}
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto">
        <div className="min-w-[40rem]">
        <div
          className={cn(
            "grid gap-2 border-b border-border pb-2 text-xs font-medium text-muted-foreground",
            isEdit
              ? "grid-cols-[minmax(0,1.6fr)_4.5rem_3.5rem_5.5rem_4rem_5.5rem_2rem]"
              : "grid-cols-[minmax(0,1.6fr)_4.5rem_3.5rem_5.5rem_5.5rem]",
          )}
        >
          <span>{tEditor("fields.lineTitle")}</span>
          <span className="text-right">{tEditor("fields.quantity")}</span>
          <span className="text-center">{tEditor("fields.unit")}</span>
          <span className="text-right">{tEditor("fields.unitPrice")}</span>
          {isEdit ? (
            <span className="text-right">{tEditor("fields.vat")}</span>
          ) : null}
          <span className="text-right">{tEditor("fields.lineTotal")}</span>
          {isEdit ? <span /> : null}
        </div>

        {sortedLines.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {tEditor("noLines")}
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {sortedLines.map((line) => {
              const net = lineNetCents({
                quantity: line.quantity,
                unitPriceCents: line.unitPriceCents,
                discountCents: line.discountCents,
              });

              if (!isEdit) {
                return (
                  <li
                    key={line.id}
                    className="grid grid-cols-[minmax(0,1.6fr)_4.5rem_3.5rem_5.5rem_5.5rem] gap-2 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {line.title.trim() || "—"}
                      </p>
                      {line.description?.trim() ? (
                        <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">
                          {line.description}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-right font-mono text-sm tabular-nums">
                      {line.quantity.toLocaleString(locale, {
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-center text-sm text-muted-foreground">
                      {line.unit || "—"}
                    </p>
                    <p className="text-right font-mono text-sm tabular-nums">
                      {formatInvoiceEuro(line.unitPriceCents)}
                    </p>
                    <p className="text-right font-mono text-sm tabular-nums">
                      {formatInvoiceEuro(net)}
                    </p>
                  </li>
                );
              }

              return (
                <li
                  key={line.id}
                  className="group grid grid-cols-1 gap-2 py-3 sm:grid-cols-[minmax(0,1.6fr)_4.5rem_3.5rem_5.5rem_4rem_5.5rem_2rem] sm:items-start"
                >
                  <div className="min-w-0 space-y-1">
                    <Input
                      value={line.title}
                      placeholder={tEditor("placeholders.line")}
                      className={cn(ghostInputClass, "font-medium")}
                      onChange={(e) =>
                        onLineChange?.(line.id, { title: e.target.value })
                      }
                    />
                    <textarea
                      rows={1}
                      value={line.description ?? ""}
                      placeholder={tEditor("placeholders.description")}
                      className={ghostTextareaClass}
                      onChange={(e) =>
                        onLineChange?.(line.id, {
                          description: e.target.value || null,
                        })
                      }
                    />
                    <div className="flex items-center gap-2 pt-0.5 opacity-70 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <span className="text-[11px] text-muted-foreground">
                        {tEditor("fields.discount")}
                      </span>
                      <MoneyField
                        cents={line.discountCents}
                        className="h-7 max-w-[6.5rem] border-border/50"
                        onCommit={(cents) =>
                          onLineChange?.(line.id, {
                            discountCents: cents ?? 0,
                          })
                        }
                      />
                    </div>
                  </div>
                  <QuantityField
                    value={line.quantity}
                    onCommit={(quantity) =>
                      onLineChange?.(line.id, {
                        quantity: quantity ?? 0,
                      })
                    }
                  />
                  <Input
                    value={line.unit ?? ""}
                    className={cn(ghostInputClass, "text-center")}
                    onChange={(e) =>
                      onLineChange?.(line.id, {
                        unit: e.target.value || null,
                      })
                    }
                  />
                  <MoneyField
                    cents={line.unitPriceCents}
                    className={cn(ghostInputClass, "border-border/40")}
                    onCommit={(cents) =>
                      onLineChange?.(line.id, {
                        unitPriceCents: cents ?? 0,
                      })
                    }
                  />
                  <select
                    value={line.vatRateBps}
                    className="h-8 rounded-md border border-transparent bg-transparent px-1 text-right font-mono text-xs tabular-nums outline-none focus:border-input focus:bg-background"
                    onChange={(e) =>
                      onLineChange?.(line.id, {
                        vatRateBps: Number(e.target.value),
                      })
                    }
                  >
                    {VAT_PRESETS.map((preset) => (
                      <option key={preset.bps} value={preset.bps}>
                        {preset.label}
                      </option>
                    ))}
                    {!VAT_PRESETS.some((p) => p.bps === line.vatRateBps) ? (
                      <option value={line.vatRateBps}>
                        {(line.vatRateBps / 100).toFixed(0)}%
                      </option>
                    ) : null}
                  </select>
                  <div className="flex h-8 items-center justify-end font-mono text-sm tabular-nums">
                    {formatInvoiceEuro(net)}
                  </div>
                  <div className="flex h-8 items-center justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                      disabled={busy}
                      aria-label={tEditor("deleteLine")}
                      onClick={() => onDeleteLine?.(line.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {isEdit ? (
          <div className="no-print border-t border-dashed border-border pt-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-primary"
              disabled={busy}
              onClick={() => onAddLine?.()}
            >
              <Plus className="size-3.5" />
              {tEditor("addLine")}
            </Button>
          </div>
        ) : null}
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <dl className="w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">
              {tEditor("totals.subtotal")}
            </dt>
            <dd className="font-mono tabular-nums">
              {formatInvoiceEuro(totals.subtotalCents)}
            </dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">{tEditor("totals.vat")}</dt>
            <dd className="font-mono tabular-nums">
              {formatInvoiceEuro(totals.vatCents)}
            </dd>
          </div>
          <div className="flex justify-between gap-6 border-t border-border pt-2 text-base font-semibold">
            <dt>{tEditor("totals.gross")}</dt>
            <dd className="font-mono tabular-nums">
              {formatInvoiceEuro(totals.totalCents)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 space-y-1 border-t border-border pt-6 text-sm">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {tEditor("tabs.notes")}
        </p>
        {isEdit ? (
          <textarea
            rows={3}
            value={notes}
            placeholder={tEditor("placeholders.notes")}
            className={cn(ghostTextareaClass, "min-h-[4.5rem] text-sm")}
            onChange={(e) => onNotesChange?.(e.target.value)}
          />
        ) : notes.trim() ? (
          <p className="whitespace-pre-wrap">{notes}</p>
        ) : mode === "preview" ? null : (
          <p className="text-muted-foreground">—</p>
        )}
      </div>

      <p className="mt-10 text-center text-[11px] text-muted-foreground">
        {t("preview.footer", { organization: orgName })}
      </p>
    </PageCard>
  );
}
