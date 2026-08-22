import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { AccountDetailPanel } from "@/features/platform/components/account-detail-panel";
import { loadPlatformAccountDetail } from "@/features/platform/accounts-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string; orgId: string }>;
};

export default async function PlatformAccountDetailPage({ params }: Props) {
  const { locale, orgId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.accounts");

  const pageData = await loadPlatformAccountDetail(orgId);

  if (pageData.error === "not_found") {
    notFound();
  }

  return (
    <ShellPage title={pageData.account?.name ?? t("detail.fallbackTitle")}>
      {pageData.error ? (
        <p className="text-sm text-destructive">{pageData.error}</p>
      ) : pageData.account ? (
        <AccountDetailPanel account={pageData.account} locale={locale} />
      ) : null}
    </ShellPage>
  );
}
