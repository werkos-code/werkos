import { getTranslations, setRequestLocale } from "next-intl/server";

import { CustomerForm } from "@/features/customers/components/customer-form";
import { getOrganizationAccess } from "@/features/billing/lib/get-organization-access";
import { PageCard } from "@/features/shell/components/page-card";
import { ShellPage } from "@/features/shell/components/shell-page";
import { requireTenantOrganization } from "@/features/shell/lib/require-organization";
import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function NewCustomerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireTenantOrganization(locale);
  const access = await getOrganizationAccess(session.organizationId, {
    isSuperAdmin: session.isSuperAdmin,
    userId: session.user.id,
  });
  if (!access.canWrite) {
    redirect({ href: "/klanten?paywall=1", locale });
  }

  const t = await getTranslations("customers");

  return (
    <ShellPage title={t("newTitle")} backHref="/klanten">
      <PageCard className="max-w-lg p-5">
        <CustomerForm mode="create" />
      </PageCard>
    </ShellPage>
  );
}
