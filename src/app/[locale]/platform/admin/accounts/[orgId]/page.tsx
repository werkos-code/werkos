import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { AccountDetailPanel } from "@/features/platform/components/account-detail-panel";
import { AdminCockpitPage } from "@/features/platform/components/cockpit/admin-cockpit-page";
import { CockpitAlert } from "@/features/platform/components/cockpit/admin-cockpit-ui";
import { loadPlatformAccountDetail } from "@/features/platform/accounts-actions";

type Props = {
  params: Promise<{ locale: string; orgId: string }>;
};

export default async function PlatformAccountDetailPage({ params }: Props) {
  const { locale, orgId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.accounts");
  const tShell = await getTranslations("shell");

  const pageData = await loadPlatformAccountDetail(orgId);

  if (pageData.error === "not_found") {
    notFound();
  }

  return (
    <AdminCockpitPage
      title={pageData.account?.name ?? t("detail.fallbackTitle")}
      backHref="/platform/admin/accounts"
      backLabel={tShell("back")}
    >
      {pageData.error ? (
        <CockpitAlert variant="error">{pageData.error}</CockpitAlert>
      ) : pageData.account ? (
        <AccountDetailPanel account={pageData.account} locale={locale} />
      ) : null}
    </AdminCockpitPage>
  );
}
