"use client";

import { FileText, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateInvoiceFromProjectDialog } from "@/features/invoices/components/create-invoice-from-project-dialog";
import type { InvoiceListItem } from "@/features/invoices/invoices-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { Link } from "@/i18n/navigation";
import type { InvoiceStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type ProjectFinancialPanelProps = {
  projectId: string;
  projectName: string;
  invoices: InvoiceListItem[];
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

export function ProjectFinancialPanel({
  projectId,
  projectName,
  invoices,
}: ProjectFinancialPanelProps) {
  const t = useTranslations("invoices.project");
  const [createOpen, setCreateOpen] = useState(false);

  const outstanding = invoices
    .filter((row) => row.status !== "paid" && row.status !== "draft")
    .reduce((sum, row) => sum + row.totalCents, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("outstanding")}
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatEuro(outstanding)}
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          {t("createFromProject")}
        </Button>
      </div>

      <PageCard className="overflow-hidden">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-start gap-3 p-8">
            <FileText className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-3.5" />
              {t("createFromProject")}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5">{t("columns.invoice")}</th>
                  <th className="px-4 py-2.5">{t("columns.date")}</th>
                  <th className="px-4 py-2.5 text-right">{t("columns.amount")}</th>
                  <th className="px-4 py-2.5">{t("columns.status")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(invoice.issueDate)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatEuro(invoice.totalCents)}
                    </td>
                    <td className="px-4 py-3">
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

      <CreateInvoiceFromProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        projectName={projectName}
      />
    </div>
  );
}
