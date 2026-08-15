"use client";

import { Check, Minus, Plus, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  calculateMonthlyTotalCents,
  formatEurFromCents,
  PRICING,
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

const EXCLUDED_KEYS = [
  "accounting",
  "clientPortal",
  "fieldApp",
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
  const [officeSeats, setOfficeSeats] = useState(initialOfficeSeats);
  const [fieldSeats, setFieldSeats] = useState(initialFieldSeats);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const numberLocale =
    locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : "nl-NL";
  const total = calculateMonthlyTotalCents(officeSeats, fieldSeats);
  const baseLabel = formatEurFromCents(PRICING.baseMonthlyCents, numberLocale);
  const officeSeatLabel = formatEurFromCents(
    PRICING.officeSeatMonthlyCents,
    numberLocale,
  );
  const fieldSeatLabel = formatEurFromCents(
    PRICING.fieldSeatMonthlyCents,
    numberLocale,
  );
  const totalLabel = formatEurFromCents(total, numberLocale);

  const ctaLabel = isTrialing
    ? t("ctaWhileTrialing")
    : t("cta");

  function startCheckout() {
    if (!canManage || pending) return;
    setError(null);
    startTransition(() => {
      void (async () => {
        const result = await createOrgSubscriptionCheckoutAction({
          officeSeats,
          fieldSeats,
        });
        if (result.error || !result.url) {
          setError(
            result.error === "stripe_missing"
              ? t("errors.stripeMissing")
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
            <p className="mt-2 text-sm text-white/70">
              {t("staffFrom", { price: fieldSeatLabel })}
            </p>
          </div>

          <div className="space-y-5 p-6">
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
              {t("ctaHint")}
            </p>
          </div>
        </PageCard>

        <div className="space-y-5 lg:col-span-7">
          <PageCard className="overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-sm font-medium">{t("calculatorTitle")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("calculatorHint")}
              </p>
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

            <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-4">
              <div>
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("monthlyTotal")}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("ownerIncluded")}
                </p>
              </div>
              <p className="text-2xl font-semibold tracking-tight tabular-nums">
                {totalLabel}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {t("perMonth")}
                </span>
              </p>
            </div>
          </PageCard>

          <PageCard className="p-5">
            <h3 className="text-sm font-medium">{t("excludedTitle")}</h3>
            <ul className="mt-3 space-y-2.5">
              {EXCLUDED_KEYS.map((key) => (
                <li
                  key={key}
                  className="flex items-start gap-2.5 text-sm text-muted-foreground"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <X className="size-3 stroke-[2.5]" />
                  </span>
                  <span>{t(`excluded.${key}`)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {t("excludedHint")}
            </p>
          </PageCard>

          <div
            className={cn(
              "rounded-xl border border-dashed border-border/80 px-5 py-4 text-sm text-muted-foreground",
            )}
          >
            {t("billingNote")}
          </div>
        </div>
      </div>
    </div>
  );
}
