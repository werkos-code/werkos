"use client";

import { FileText, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateInvoiceFromProjectDialog } from "@/features/invoices/components/create-invoice-from-project-dialog";
import type { InvoiceListItem } from "@/features/invoices/invoices-actions";
import { QuoteFinancialPlanning } from "@/features/quotes/components/quote-financial-planning";
import type { QuotePlanningSource } from "@/features/quotes/quotes-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { Link, useRouter } from "@/i18n/navigation";
import type { InvoiceStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type ProjectFinancialPanelProps = {
  projectId: string;
  projectName: string;
  invoices: InvoiceListItem[];
  planningQuotes?: QuotePlanningSource[];
  onOpenQuotes?: () => void;
};

function formatEuro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function statusBadgeClass(status: InvoiceStatus) {
  switch (status) {
    case "draft":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "open":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "sent":
      return "border-primary/20 bg-primary/10 text-primary";
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    default:
      return "";
  }
}

function canEditBillingPlan(status: QuotePlanningSource["status"]) {
  return status !== "cancelled" && status !== "rejected";
}

export function ProjectFinancialPanel({
  projectId,
  projectName,
  invoices,
  planningQuotes = [],
  onOpenQuotes,
}: ProjectFinancialPanelProps) {
  const t = useTranslations("invoices.project");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [createFromProjectOpen, setCreateFromProjectOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreateTransition] = useTransition();
  const defaultQuoteId = planningQuotes[0]?.id ?? "";
  const [quoteId, setQuoteId] = useState(defaultQuoteId);

  const selectedQuote = useMemo(
    () => planningQuotes.find((quote) => quote.id === quoteId) ?? planningQuotes[0],
    [planningQuotes, quoteId],
  );

  const outstanding = invoices
    .filter((row) => row.status !== "paid" && row.status !== "draft")
    .reduce((sum, row) => sum + row.totalCents, 0);

  function createCustomInvoice() {
    setCreateError(null);
    startCreateTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: projectName,
              projectId,
              status: "draft",
              issueDate: new Date().toISOString().slice(0, 10),
              editorMode: true,
            }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as {
            error?: string;
            invoiceId?: string;
          };
          if (!response.ok || !result.invoiceId) {
            setCreateError(result.error || tCommon("error"));
            return;
          }
          router.push(`/facturen/${result.invoiceId}`);
        } catch {
          setCreateError(tCommon("error"));
        }
      })();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("outstanding")}
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatEuro(outstanding)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setCreateFromProjectOpen(true)}
          >
            <Plus className="size-3.5" />
            {t("createFromProject")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isCreating}
            onClick={createCustomInvoice}
          >
            <Plus className="size-3.5" />
            {isCreating ? tCommon("loading") : t("createCustom")}
          </Button>
        </div>
      </div>
      {createError ? (
        <p className="text-sm text-destructive">{createError}</p>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium">{t("planningTitle")}</h3>
          {planningQuotes.length > 1 ? (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t("planningPickQuote")}</span>
              <select
                value={selectedQuote?.id ?? ""}
                onChange={(event) => setQuoteId(event.target.value)}
                className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm outline-none"
              >
                {planningQuotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>
                    {quote.quoteNumber
                      ? `${quote.quoteNumber} · ${quote.title}`
                      : quote.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        {selectedQuote ? (
          <PageCard className="overflow-hidden p-0">
            <QuoteFinancialPlanning
              key={selectedQuote.id}
              quoteId={selectedQuote.id}
              lines={selectedQuote.lines}
              quoteNumber={selectedQuote.quoteNumber}
              editable={canEditBillingPlan(selectedQuote.status)}
            />
          </PageCard>
        ) : (
          <PageCard className="flex flex-col items-start gap-3 p-8">
            <FileText className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("planningEmpty")}</p>
            {onOpenQuotes ? (
              <Button type="button" variant="outline" size="sm" onClick={onOpenQuotes}>
                {t("openQuotes")}
              </Button>
            ) : null}
          </PageCard>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">{t("invoicesTitle")}</h3>
        <PageCard className="overflow-hidden">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-start gap-3 p-8">
              <FileText className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[36rem]">
                <thead>
                  <tr>
                    <th>{t("columns.invoice")}</th>
                    <th>{t("columns.date")}</th>
                    <th className="text-right">{t("columns.amount")}</th>
                    <th>{t("columns.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <Link
                          href={`/facturen/${invoice.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                          {invoice.title}
                        </p>
                      </td>
                      <td className="text-muted-foreground">
                        {formatDate(invoice.issueDate)}
                      </td>
                      <td className="text-right font-medium tabular-nums">
                        {formatEuro(invoice.totalCents)}
                      </td>
                      <td>
                        <Badge
                          variant="outline"
                          className={cn("rounded-full", statusBadgeClass(invoice.status))}
                        >
                          {t(`status.${invoice.status}`)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PageCard>
      </section>

      <CreateInvoiceFromProjectDialog
        open={createFromProjectOpen}
        onOpenChange={setCreateFromProjectOpen}
        projectId={projectId}
        projectName={projectName}
      />
    </div>
  );
}
