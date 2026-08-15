"use client";

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

type SubscriptionChooserProps = {
  initialOfficeSeats?: number;
  initialFieldSeats?: number;
  canManage: boolean;
};

function SeatCounter({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled}
          onClick={() => onChange(Math.max(0, value - 1))}
          aria-label="-"
        >
          −
        </Button>
        <span className="w-6 text-center tabular-nums">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          disabled={disabled}
          onClick={() => onChange(value + 1)}
          aria-label="+"
        >
          +
        </Button>
      </div>
    </div>
  );
}

export function SubscriptionChooser({
  initialOfficeSeats = 0,
  initialFieldSeats = 0,
  canManage,
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

  return (
    <PageCard className="max-w-xl space-y-5 p-5">
      <div>
        <h2 className="text-sm font-medium">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="space-y-2">
        <SeatCounter
          label={t("office")}
          value={officeSeats}
          onChange={setOfficeSeats}
          disabled={!canManage || pending}
        />
        <SeatCounter
          label={t("field")}
          value={fieldSeats}
          onChange={setFieldSeats}
          disabled={!canManage || pending}
        />
      </div>

      <div className="rounded-lg border border-border bg-muted/20 px-4 py-4 text-sm">
        <p className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {t("priceTitle")}
        </p>
        <div className="space-y-2 text-muted-foreground">
          <div className="flex justify-between">
            <span>{t("base")}</span>
            <span className="tabular-nums">
              {formatEurFromCents(PRICING.baseMonthlyCents, numberLocale)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t("officeLine", { count: officeSeats })}</span>
            <span className="tabular-nums">
              {formatEurFromCents(
                officeSeats * PRICING.officeSeatMonthlyCents,
                numberLocale,
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t("fieldLine", { count: fieldSeats })}</span>
            <span className="tabular-nums">
              {formatEurFromCents(
                fieldSeats * PRICING.fieldSeatMonthlyCents,
                numberLocale,
              )}
            </span>
          </div>
          <div className="mt-3 flex justify-between border-t border-border pt-3 text-foreground">
            <span className="font-medium">{t("total")}</span>
            <span className="font-semibold tabular-nums">
              {formatEurFromCents(total, numberLocale)} {tCommon("perMonth")}
            </span>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {canManage ? (
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={() => {
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
          }}
        >
          {pending ? tCommon("loading") : t("cta")}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">{t("ownerOnly")}</p>
      )}
    </PageCard>
  );
}
