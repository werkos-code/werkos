"use client";

import { Download, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEurFromCents } from "@/config/pricing";
import {
  administrationMonthKey,
  PLATFORM_COST_CATEGORIES,
} from "@/features/platform/lib/administration-month";
import {
  createPlatformOperatingCost,
  deletePlatformOperatingCost,
  exportPlatformAdministrationCsv,
  type PlatformAdministrationData,
} from "@/features/platform/platform-administration-actions";
import {
  CockpitAlert,
  CockpitCard,
  CockpitKpi,
  CockpitSection,
} from "@/features/platform/components/cockpit/admin-cockpit-ui";
import { useRouter } from "@/i18n/navigation";
import type { PlatformCostCategory } from "@/types/database";

type AdministrationWorkspaceProps = {
  page: PlatformAdministrationData;
};

function displayMoney(label: string | null): string {
  return label ?? "—";
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AdministrationWorkspace({ page }: AdministrationWorkspaceProps) {
  const t = useTranslations("platform.administration");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const monthValue = administrationMonthKey(page.year, page.month);

  const defaultInvoiceDate = useMemo(() => {
    const today = new Date();
    if (
      today.getFullYear() === page.year &&
      today.getMonth() + 1 === page.month
    ) {
      return today.toISOString().slice(0, 10);
    }
    return `${page.year}-${String(page.month).padStart(2, "0")}-01`;
  }, [page.month, page.year]);

  return (
    <div className="space-y-10">
      <CockpitCard className="flex flex-col gap-4 p-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Label htmlFor="administration-month" className="text-slate-400">
            {t("period")}
          </Label>
          <Input
            id="administration-month"
            type="month"
            value={monthValue}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) return;
              router.push(`/platform/admin/administratie?month=${value}`);
            }}
            className="max-w-[12rem] border-white/10 bg-slate-950/50 text-slate-100"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          className="border-white/15 bg-white/5 text-slate-200 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-100"
          onClick={() => {
            setError(null);
            startTransition(() => {
              void (async () => {
                const result = await exportPlatformAdministrationCsv({
                  year: page.year,
                  month: page.month,
                });
                if (result.error || !result.csv || !result.filename) {
                  setError(result.error ?? t("exportFailed"));
                  return;
                }
                downloadCsv(result.filename, result.csv);
              })();
            });
          }}
        >
          <Download className="size-4" />
          {t("exportCsv")}
        </Button>
      </CockpitCard>

      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {!page.stripe.configured ? (
        <CockpitAlert>{t("stripeNotConfigured")}</CockpitAlert>
      ) : page.stripe.error ? (
        <CockpitAlert variant="error">
          {t("stripeError", { message: page.stripe.error })}
        </CockpitAlert>
      ) : null}

      <CockpitSection title={t("sections.stripe")} hint={t("stripeHint")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CockpitKpi
            label={t("kpi.gross")}
            value={displayMoney(page.stripe.grossLabel)}
            muted={page.stripe.grossLabel == null}
            variant="hero"
            accent="cyan"
          />
          <CockpitKpi
            label={t("kpi.net")}
            value={displayMoney(page.stripe.netLabel)}
            muted={page.stripe.netLabel == null}
            variant="hero"
            accent="emerald"
          />
          <CockpitKpi
            label={t("kpi.tax")}
            value={displayMoney(page.stripe.taxLabel)}
            muted={page.stripe.taxLabel == null}
          />
          <CockpitKpi
            label={t("kpi.fees")}
            value={displayMoney(page.stripe.feesLabel)}
            muted={page.stripe.feesLabel == null}
          />
        </div>

        <CockpitCard className="overflow-hidden">
          {page.stripe.invoices.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400">
              {t("stripeInvoicesEmpty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[48rem]">
                <thead>
                  <tr>
                    <th>{t("columns.invoiceNumber")}</th>
                    <th>{t("columns.customer")}</th>
                    <th>{t("columns.paidAt")}</th>
                    <th>{t("columns.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {page.stripe.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="text-slate-100">
                        {invoice.number || "—"}
                      </td>
                      <td className="text-slate-400">
                        {invoice.customerEmail || "—"}
                      </td>
                      <td className="text-slate-400">
                        {invoice.paidAt?.slice(0, 10) ?? "—"}
                      </td>
                      <td className="text-slate-400">
                        {formatEurFromCents(invoice.totalCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CockpitCard>
      </CockpitSection>

      <CockpitSection title={t("sections.costs")} hint={t("costsHint")}>
        <div className="grid gap-4 sm:grid-cols-3">
          <CockpitKpi label={t("kpi.costsExcl")} value={page.costTotalsLabels.excl} />
          <CockpitKpi label={t("kpi.costsVat")} value={page.costTotalsLabels.vat} />
          <CockpitKpi label={t("kpi.costsIncl")} value={page.costTotalsLabels.incl} />
        </div>

        <CockpitCard className="overflow-hidden">
          {page.costs.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400">{t("costsEmpty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table min-w-[48rem]">
                <thead>
                  <tr>
                    <th>{t("columns.date")}</th>
                    <th>{t("columns.description")}</th>
                    <th>{t("columns.vendor")}</th>
                    <th>{t("columns.category")}</th>
                    <th>{t("columns.amountExcl")}</th>
                    <th aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {page.costs.map((cost) => (
                    <tr key={cost.id}>
                      <td className="text-slate-400">{cost.invoiceDate}</td>
                      <td className="text-slate-100">{cost.description}</td>
                      <td className="text-slate-400">{cost.vendor || "—"}</td>
                      <td className="text-slate-400">
                        {t(`categories.${cost.category}`)}
                      </td>
                      <td className="text-slate-400">
                        {formatEurFromCents(cost.amountCents)}
                      </td>
                      <td>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-300 hover:bg-red-500/10 hover:text-red-200"
                          disabled={isPending}
                          onClick={() => {
                            if (!window.confirm(t("deleteConfirm"))) return;
                            setError(null);
                            startTransition(() => {
                              void (async () => {
                                const result = await deletePlatformOperatingCost(
                                  cost.id,
                                );
                                if (result.error) {
                                  setError(result.error);
                                  return;
                                }
                                router.refresh();
                              })();
                            });
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CockpitCard>

        <CockpitCard className="p-5">
          <h3 className="text-[11px] font-medium tracking-[0.2em] text-slate-300 uppercase">
            {t("addCostTitle")}
          </h3>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const amountRaw = String(form.get("amount") ?? "").replace(",", ".");
              const amount = Number(amountRaw);
              if (!Number.isFinite(amount) || amount < 0) {
                setError(t("invalidAmount"));
                return;
              }

              setError(null);
              startTransition(() => {
                void (async () => {
                  const result = await createPlatformOperatingCost({
                    description: String(form.get("description") ?? ""),
                    vendor: String(form.get("vendor") ?? "") || undefined,
                    category: String(
                      form.get("category") ?? "other",
                    ) as PlatformCostCategory,
                    amountCents: Math.round(amount * 100),
                    vatRateBps: Math.round(
                      Number(form.get("vatRate") ?? 21) * 100,
                    ),
                    invoiceDate: String(form.get("invoiceDate") ?? ""),
                    invoiceReference:
                      String(form.get("invoiceReference") ?? "") || undefined,
                    notes: String(form.get("notes") ?? "") || undefined,
                  });

                  if (result.error) {
                    setError(
                      result.error === "invalid_input"
                        ? t("invalidInput")
                        : result.error,
                    );
                    return;
                  }

                  event.currentTarget.reset();
                  router.refresh();
                })();
              });
            }}
          >
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cost-description">{t("fields.description")}</Label>
              <Input id="cost-description" name="description" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-vendor">{t("fields.vendor")}</Label>
              <Input id="cost-vendor" name="vendor" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-category">{t("fields.category")}</Label>
              <select
                id="cost-category"
                name="category"
                defaultValue="software"
                className="flex h-9 w-full rounded-md border border-white/10 bg-slate-950/50 px-3 py-1 text-sm text-slate-100"
              >
                {PLATFORM_COST_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {t(`categories.${category}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-amount">{t("fields.amountExcl")}</Label>
              <Input
                id="cost-amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-vat">{t("fields.vatRate")}</Label>
              <Input
                id="cost-vat"
                name="vatRate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue="21"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-date">{t("fields.invoiceDate")}</Label>
              <Input
                id="cost-date"
                name="invoiceDate"
                type="date"
                defaultValue={defaultInvoiceDate}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost-reference">{t("fields.invoiceReference")}</Label>
              <Input id="cost-reference" name="invoiceReference" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cost-notes">{t("fields.notes")}</Label>
              <Input id="cost-notes" name="notes" />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              >
                {t("addCost")}
              </Button>
            </div>
          </form>
        </CockpitCard>
      </CockpitSection>
    </div>
  );
}
