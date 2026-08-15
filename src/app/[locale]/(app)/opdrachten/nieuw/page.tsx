import { getTranslations, setRequestLocale } from "next-intl/server";

import { NewAssignmentWizard } from "@/features/assignments/components/new-assignment-wizard";
import { getOrganizationAccess } from "@/features/billing/lib/get-organization-access";
import { ShellPage } from "@/features/shell/components/shell-page";
import { requireTenantOrganization } from "@/features/shell/lib/require-organization";
import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function NieuweOpdrachtPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await requireTenantOrganization(locale);
  const access = await getOrganizationAccess(session.organizationId, {
    isSuperAdmin: session.isSuperAdmin,
    userId: session.user.id,
  });
  if (!access.canWrite) {
    redirect({ href: "/projecten?paywall=1", locale });
  }

  const t = await getTranslations("assignment");

  return (
    <ShellPage
      title={t("pageTitle")}
      backHref="/projecten"
      contentClassName="max-w-none w-[94%]"
    >
      <NewAssignmentWizard />
    </ShellPage>
  );
}
