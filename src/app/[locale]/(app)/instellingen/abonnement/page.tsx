import { getTranslations, setRequestLocale } from "next-intl/server";

import { SubscriptionSettings } from "@/features/billing/components/subscription-settings";
import { getSubscriptionSummary } from "@/features/billing/billing-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function BillingSettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("billingSettings");
  const result = await getSubscriptionSummary();

  return (
    <ShellPage title={t("title")} backHref="/instellingen">
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : result.subscription ? (
        <SubscriptionSettings subscription={result.subscription} />
      ) : null}
    </ShellPage>
  );
}
