"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  computeQuoteTotals,
  formatEuro,
  getLeafLines,
} from "@/features/quotes/lib/quote-line";
import type { AssignmentWizardState } from "@/features/assignments/lib/wizard-state";
import { PageCard } from "@/features/shell/components/page-card";

type StepAfrondenProps = {
  state: AssignmentWizardState;
};

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium">{value}</dd>
    </div>
  );
}

export function StepAfronden({ state }: StepAfrondenProps) {
  const t = useTranslations("assignment.afronden");
  const totals = computeQuoteTotals(
    state.calculation.lines,
    state.calculation.marginPercent,
  );
  const customerLabel =
    state.customer.company.trim() ||
    state.customer.name.trim() ||
    "—";
  const lineCount = getLeafLines(state.calculation.lines).filter((line) =>
    line.title.trim(),
  ).length;

  const checks = [
    { key: "customer", done: Boolean(state.customer.name.trim()) },
    { key: "request", done: Boolean(state.request.projectName.trim()) },
    {
      key: "calculation",
      done: lineCount > 0 || state.calculation.lines.length === 0,
    },
    { key: "quote", done: true },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {checks.map((item) => (
          <li
            key={item.key}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
          >
            <CheckCircle2
              className={
                item.done
                  ? "size-4 shrink-0 text-primary"
                  : "size-4 shrink-0 text-muted-foreground"
              }
            />
            <span className="font-medium">{t(`checks.${item.key}`)}</span>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 md:grid-cols-2">
        <PageCard className="p-4">
          <h3 className="text-sm font-medium">{t("sections.customer")}</h3>
          <dl className="mt-3 space-y-2">
            <SummaryRow label={t("fields.customer")} value={customerLabel} />
            {state.customer.name && state.customer.company ? (
              <SummaryRow
                label={t("fields.contact")}
                value={state.customer.name}
              />
            ) : null}
            {state.customer.phone ? (
              <SummaryRow label={t("fields.phone")} value={state.customer.phone} />
            ) : null}
            {state.customer.email ? (
              <SummaryRow label={t("fields.email")} value={state.customer.email} />
            ) : null}
          </dl>
        </PageCard>

        <PageCard className="p-4">
          <h3 className="text-sm font-medium">{t("sections.request")}</h3>
          <dl className="mt-3 space-y-2">
            <SummaryRow
              label={t("fields.projectName")}
              value={state.request.projectName || "—"}
            />
            {state.request.projectType ? (
              <SummaryRow
                label={t("fields.projectType")}
                value={state.request.projectType}
              />
            ) : null}
            {state.request.location ? (
              <SummaryRow
                label={t("fields.location")}
                value={state.request.location}
              />
            ) : null}
          </dl>
        </PageCard>

        <PageCard className="p-4 md:col-span-2">
          <h3 className="text-sm font-medium">{t("sections.calculation")}</h3>
          <dl className="mt-3 space-y-2">
            <SummaryRow
              label={t("fields.lines")}
              value={t("fields.lineCount", { count: lineCount })}
            />
            <SummaryRow
              label={t("fields.totalExcl")}
              value={formatEuro(totals.net)}
            />
            <SummaryRow
              label={t("fields.totalIncl")}
              value={formatEuro(totals.gross)}
            />
          </dl>
        </PageCard>
      </div>

      <p className="text-sm text-muted-foreground">{t("createHint")}</p>
    </div>
  );
}
