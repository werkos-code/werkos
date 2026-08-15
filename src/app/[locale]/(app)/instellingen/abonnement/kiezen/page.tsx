import { getTranslations, setRequestLocale } from "next-intl/server";

import { SubscriptionChooser } from "@/features/billing/components/subscription-chooser";
import { getSubscriptionSummary } from "@/features/billing/billing-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function SubscriptionChooserPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("billing.chooser");
  const result = await getSubscriptionSummary();

  return (
    <ShellPage title={t("pageTitle")} backHref="/instellingen/abonnement">
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : result.subscription ? (
        <SubscriptionChooser
          initialOfficeSeats={result.subscription.officeSeats}
          initialFieldSeats={result.subscription.fieldSeats}
          canManage={result.subscription.canManage}
        />
      ) : null}
    </ShellPage>
  );
}
