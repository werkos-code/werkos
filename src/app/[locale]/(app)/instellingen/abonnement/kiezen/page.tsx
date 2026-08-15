import { getTranslations, setRequestLocale } from "next-intl/server";

import { getSubscriptionSummary } from "@/features/billing/billing-actions";
import { SubscriptionChooser } from "@/features/billing/components/subscription-chooser";
import { getOrganizationAccess } from "@/features/billing/lib/get-organization-access";
import { ShellPage } from "@/features/shell/components/shell-page";
import { requireTenantOrganization } from "@/features/shell/lib/require-organization";

type Props = { params: Promise<{ locale: string }> };

export default async function SubscriptionChooserPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("billing.chooser");
  const session = await requireTenantOrganization(locale);
  const [result, access] = await Promise.all([
    getSubscriptionSummary(),
    getOrganizationAccess(session.organizationId, {
      isSuperAdmin: session.isSuperAdmin,
      userId: session.user.id,
    }),
  ]);

  return (
    <ShellPage
      title={t("pageTitle")}
      backHref="/instellingen/abonnement"
      contentClassName="max-w-5xl"
    >
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : result.subscription ? (
        <SubscriptionChooser
          initialOfficeSeats={result.subscription.officeSeats}
          initialFieldSeats={result.subscription.fieldSeats}
          canManage={result.subscription.canManage}
          isTrialing={access.isTrialing}
          trialDaysRemaining={access.trialDaysRemaining}
        />
      ) : null}
    </ShellPage>
  );
}
