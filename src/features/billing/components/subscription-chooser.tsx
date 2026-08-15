"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  calculateMonthlyTotalCents,
  calculateYearlyMonthlyEquivalentCents,
  calculateYearlyTotalCents,
  formatEurFromCents,
  PRICING,
  type BillingInterval,
} from "@/config/pricing";
import { createOrgSubscriptionCheckoutAction } from "@/features/billing/billing-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { cn } from "@/lib/utils";

type SubscriptionChooserProps = {
  initialOfficeSeats?: number;
  initialFieldSeats?: number;
  canManage: boolean;
  isTrialing?: boolean;
  trialDaysRemaining?: number | null;
};

const INCLUDED_KEYS = [
  "quotesInvoices",
  "projectsWork",
  "planning",
  "workOrders",
  "timeMaterials",
  "people",
  "documents",
  "teamInvite",
] as const;

function SeatStepper({
  title,
  hint,
  value,
  onChange,
  disabled,
}: {
  title: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-8 rounded-full"
          disabled={disabled || value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label="-"
        >
          <Minus className="size-3.5" />
        </Button>
        <span className="w-7 text-center text-sm font-semibold tabular-nums">
          {value}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-8 rounded-full"
          disabled={disabled}
          onClick={() => onChange(value + 1)}
          aria-label="+"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function SubscriptionChooser({
  initialOfficeSeats = 0,
  initialFieldSeats = 0,
  canManage,
  isTrialing = false,
  trialDaysRemaining = null,
}: SubscriptionChooserProps) {
  const t = useTranslations("billing.chooser");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [officeSeats, setOfficeSeats] = useState(initialOfficeSeats);
  const [fieldSeats, setFieldSeats] = useState(initialFieldSeats);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const numberLocale =
    locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : "nl-NL";
  const yearly = interval === "year";

  const monthlyTotal = calculateMonthlyTotalCents(officeSeats, fieldSeats);
  const yearlyTotal = calculateYearlyTotalCents(officeSeats, fieldSeats);
  const yearlyMonthlyEquivalent = calculateYearlyMonthlyEquivalentCents(
    officeSeats,
    fieldSeats,
  );

  const displayBaseCents = yearly
    ? Math.round(PRICING.baseYearlyCents / 12)
    : PRICING.baseMonthlyCents;
  const officeSeatDisplayCents = yearly
    ? Math.round(PRICING.officeSeatYearlyCents / 12)
    : PRICING.officeSeatMonthlyCents;
  const fieldSeatDisplayCents = yearly
    ? Math.round(PRICING.fieldSeatYearlyCents / 12)
    : PRICING.fieldSeatMonthlyCents;

  const baseLabel = formatEurFromCents(displayBaseCents, numberLocale);
  const baseYearlySavingsCents =
    PRICING.baseMonthlyCents * 12 - PRICING.baseYearlyCents;
  const baseYearlySavingsLabel = formatEurFromCents(
    baseYearlySavingsCents,
    numberLocale,
  );
  const officeSeatLabel = formatEurFromCents(officeSeatDisplayCents, numberLocale);
  const fieldSeatLabel = formatEurFromCents(fieldSeatDisplayCents, numberLocale);
  const headlineTotalCents = yearly ? yearlyMonthlyEquivalent : monthlyTotal;
  const headlineTotalLabel = formatEurFromCents(headlineTotalCents, numberLocale);
  const yearlyTotalLabel = formatEurFromCents(yearlyTotal, numberLocale);

  const ctaLabel = isTrialing ? t("ctaWhileTrialing") : t("cta");

  function startCheckout() {
    if (!canManage || pending) return;
    setError(null);
    startTransition(() => {
      void (async () => {
        const result = await createOrgSubscriptionCheckoutAction({
          officeSeats,
          fieldSeats,
          billingInterval: interval,
        });
        if (result.error || !result.url) {
          setError(
            result.error === "stripe_missing"
              ? t("errors.stripeMissing")
              : result.error === "yearly_prices_missing"
                ? t("errors.yearlyPricesMissing")
                : result.error === "already_subscribed"
                  ? t("errors.alreadySubscribed")
                  : result.error === "forbidden"
                    ? t("errors.forbidden")
                    : result.error || tCommon("error"),
          );
          return;
        }
        window.location.href = result.url;
      })();
    });
  }

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {t("eyebrow")}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {t.rich("headline", {
            accent: (chunks) => (
              <span className="text-primary">{chunks}</span>
            ),
          })}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("subheadline")}
        </p>
        {isTrialing && trialDaysRemaining != null ? (
          <p className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {t("trialBadge", { days: trialDaysRemaining })}
          </p>
        ) : null}
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-12">
        <PageCard className="overflow-hidden lg:col-span-5">
          <div className="bg-linear-to-br from-[#09133A] via-[#0B1A4A] to-[#1E3A8A] px-6 py-7 text-white">
            <p className="text-[11px] font-medium tracking-wide text-white/65 uppercase">
              {t("planName")}
            </p>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight tabular-nums">
                {baseLabel}
              </span>
              <span className="text-sm text-white/70">{t("perMonth")}</span>
            </p>
            {yearly ? (
              <p className="mt-2 text-sm text-amber-300">
                {t("yearlyHeroSavings", { amount: baseYearlySavingsLabel })}
              </p>
            ) : (
              <p className="mt-2 text-sm text-white/70">
                {t("staffFrom", { price: fieldSeatLabel })}
              </p>
            )}
          </div>

          <div className="p-6">
            <ul className="space-y-2.5">
              {INCLUDED_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="size-3 stroke-[2.5]" />
                  </span>
                  <span>{t(`included.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </PageCard>

        <PageCard className="overflow-hidden lg:col-span-7">
          <div className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-medium">{t("calculatorTitle")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("calculatorHint")}
            </p>

            <div className="mt-4 inline-flex items-center rounded-lg border border-border bg-card p-0.5">
              <button
                type="button"
                disabled={pending}
                onClick={() => setInterval("month")}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                  interval === "month"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("interval.month")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setInterval("year")}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                  interval === "year"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t("interval.year")}
                <span className="rounded-full bg-[#EA580C] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                  {t("interval.yearlyDiscount", {
                    percent: PRICING.yearlyDiscountPercent,
                  })}
                </span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-border px-5">
            <SeatStepper
              title={t("office")}
              hint={t("officeHint", { price: officeSeatLabel })}
              value={officeSeats}
              onChange={setOfficeSeats}
              disabled={!canManage || pending}
            />
            <SeatStepper
              title={t("field")}
              hint={t("fieldHint", { price: fieldSeatLabel })}
              value={fieldSeats}
              onChange={setFieldSeats}
              disabled={!canManage || pending}
            />
          </div>

          <div className="space-y-4 border-t border-border bg-muted/30 px-5 py-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("monthlyTotal")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("ownerIncluded")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {headlineTotalLabel}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {t("perMonth")}
                  </span>
                </p>
                {yearly ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("yearlyBilledHint", { yearly: yearlyTotalLabel })}
                  </p>
                ) : null}
              </div>
            </div>

            {yearly ? (
              <p className="rounded-lg bg-[#EA580C]/10 px-3 py-2 text-xs font-medium text-[#C2410C]">
                {t("yearlySavingsBanner", {
                  percent: PRICING.yearlyDiscountPercent,
                })}
              </p>
            ) : null}

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}

            {canManage ? (
              <Button
                type="button"
                size="lg"
                className="h-11 w-full text-sm font-medium"
                disabled={pending}
                onClick={startCheckout}
              >
                {pending ? tCommon("loading") : ctaLabel}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">{t("ownerOnly")}</p>
            )}

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              {yearly ? t("ctaHintYearly") : t("ctaHint")}
            </p>
          </div>
        </PageCard>
      </div>
    </div>
  );
}
