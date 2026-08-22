import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccountsWorkspace } from "@/features/platform/components/accounts-workspace";
import { AdminCockpitPage } from "@/features/platform/components/cockpit/admin-cockpit-page";
import { CockpitAlert } from "@/features/platform/components/cockpit/admin-cockpit-ui";
import { loadPlatformAccountsPage } from "@/features/platform/accounts-actions";

type Props = { params: Promise<{ locale: string }> };

export default async function PlatformAccountsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.accounts");

  const pageData = await loadPlatformAccountsPage();

  return (
    <AdminCockpitPage title={t("title")}>
      {pageData.error ? (
        <CockpitAlert variant="error">{pageData.error}</CockpitAlert>
      ) : (
        <AccountsWorkspace accounts={pageData.accounts ?? []} />
      )}
    </AdminCockpitPage>
  );
}
