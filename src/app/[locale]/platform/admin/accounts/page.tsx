import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccountsWorkspace } from "@/features/platform/components/accounts-workspace";
import { loadPlatformAccountsPage } from "@/features/platform/accounts-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function PlatformAccountsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.accounts");

  const pageData = await loadPlatformAccountsPage();

  return (
    <ShellPage title={t("title")}>
      {pageData.error ? (
        <p className="text-sm text-destructive">{pageData.error}</p>
      ) : (
        <AccountsWorkspace accounts={pageData.accounts ?? []} />
      )}
    </ShellPage>
  );
}
