"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { formatEurFromCents } from "@/config/pricing";
import {
  createBillingPortalSession,
  type SubscriptionSummary,
} from "@/features/billing/billing-actions";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";

type SubscriptionSettingsProps = {
  subscription: SubscriptionSummary;
};

export function SubscriptionSettings({
  subscription,
}: SubscriptionSettingsProps) {
  const t = useTranslations("billingSettings");
  const tCommon = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const statusLabel =
    subscription.status === "missing"
      ? t("status.missing")
      : t(`status.${subscription.status}`);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaStatCard label={t("kpi.status")} value={statusLabel} />
        <MetaStatCard
          label={t("kpi.officeSeats")}
          value={String(subscription.officeSeats)}
        />
        <MetaStatCard
          label={t("kpi.fieldSeats")}
          value={String(subscription.fieldSeats)}
        />
        <MetaStatCard
          label={t("kpi.monthly")}
          value={subscription.monthlyTotalLabel}
        />
      </div>

      <PageCard className="max-w-2xl space-y-4 p-5">
        <div>
          <h2 className="text-sm font-medium">{t("planTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("planHint")}</p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("fields.base")}
            </dt>
            <dd className="mt-1 text-sm">
              {formatEurFromCents(subscription.pricing.baseCents)}
              {t("perMonth")}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("fields.officeSeat")}
            </dt>
            <dd className="mt-1 text-sm">
              {formatEurFromCents(subscription.pricing.officeSeatCents)}
              {t("perMonth")}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("fields.fieldSeat")}
            </dt>
            <dd className="mt-1 text-sm">
              {formatEurFromCents(subscription.pricing.fieldSeatCents)}
              {t("perMonth")}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("fields.trial")}
            </dt>
            <dd className="mt-1 text-sm">
              {subscription.trialEndsAt
                ? subscription.trialEndsAt.slice(0, 10)
                : t("noTrial")}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("fields.periodEnd")}
            </dt>
            <dd className="mt-1 text-sm">
              {subscription.currentPeriodEnd
                ? subscription.currentPeriodEnd.slice(0, 10)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("fields.cancel")}
            </dt>
            <dd className="mt-1 text-sm">
              {subscription.cancelAtPeriodEnd ? t("yes") : t("no")}
            </dd>
          </div>
        </dl>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {subscription.canManage ? (
          <div className="space-y-2">
            <Button
              type="button"
              disabled={pending || !subscription.hasStripeCustomer}
              onClick={() => {
                setError(null);
                startTransition(() => {
                  void (async () => {
                    const result = await createBillingPortalSession();
                    if (result.error || !result.url) {
                      setError(
                        result.error === "no_stripe_customer"
                          ? t("errors.noStripeCustomer")
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
              {pending ? tCommon("loading") : t("manage")}
            </Button>
            {!subscription.hasStripeCustomer ? (
              <p className="text-xs text-muted-foreground">
                {t("noPortalHint")}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("ownerOnly")}</p>
        )}
      </PageCard>
    </div>
  );
}
