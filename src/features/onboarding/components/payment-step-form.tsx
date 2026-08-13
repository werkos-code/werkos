"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  calculateMonthlyTotalCents,
  formatEurFromCents,
} from "@/config/pricing";
import { createCheckoutSessionAction } from "@/features/onboarding/checkout-action";
import { PageCard } from "@/features/shell/components/page-card";

type PaymentStepProps = {
  officeSeats: number;
  fieldSeats: number;
};

export function PaymentStepForm({ officeSeats, fieldSeats }: PaymentStepProps) {
  const t = useTranslations("onboarding.payment");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const numberLocale =
    locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : "nl-NL";
  const total = calculateMonthlyTotalCents(officeSeats, fieldSeats);

  return (
    <div className="flex w-full flex-col gap-5">
      <PageCard className="px-5 py-4 text-sm">
        <p className="text-sm font-medium">{t("plan")}</p>
        <div className="mt-4 space-y-2 text-muted-foreground">
          <p>{t("ownerIncluded")}</p>
          {officeSeats > 0 ? (
            <p>{t("officeSeats", { count: officeSeats })}</p>
          ) : null}
          {fieldSeats > 0 ? (
            <p>{t("fieldSeats", { count: fieldSeats })}</p>
          ) : null}
          <div className="flex justify-between border-t border-border pt-3 text-foreground">
            <span className="font-medium">{t("total")}</span>
            <span className="font-semibold tabular-nums">
              {formatEurFromCents(total, numberLocale)} {tCommon("perMonth")}
            </span>
          </div>
        </div>
        <p className="mt-4 font-medium text-foreground">{t("trial")}</p>
        <p className="mt-1 text-muted-foreground">{t("trialNote")}</p>
      </PageCard>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        className="w-full"
        size="lg"
        disabled={pending}
        onClick={() => {
          setError(null);
          setPending(true);
          void (async () => {
            try {
              const result = await createCheckoutSessionAction();
              if (result.error === "stripe_missing") {
                setError(result.detail ?? t("stripeMissing"));
                setPending(false);
                return;
              }
              if (result.error || !result.url) {
                setError(tCommon("error"));
                setPending(false);
                return;
              }
              window.location.href = result.url;
            } catch (err) {
              setError(err instanceof Error ? err.message : tCommon("error"));
              setPending(false);
            }
          })();
        }}
      >
        {pending ? tCommon("loading") : t("cta")}
      </Button>
    </div>
  );
}
