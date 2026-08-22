import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdministrationWorkspace } from "@/features/platform/components/administration-workspace";
import { GoogleAdsMarketingShell } from "@/features/platform/components/google-ads-marketing-shell";
import { parseAdministrationMonth } from "@/features/platform/lib/administration-month";
import { loadPlatformAdministrationPage } from "@/features/platform/platform-administration-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ month?: string }>;
};

export default async function PlatformAdministrationPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const { month } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("platform.administration");

  const { year, month: monthNumber } = parseAdministrationMonth(month);
  const pageData = await loadPlatformAdministrationPage({
    year,
    month: monthNumber,
  });

  return (
    <ShellPage title={t("title")}>
      {pageData.error ? (
        <p className="text-sm text-destructive">{pageData.error}</p>
      ) : pageData.page ? (
        <div className="space-y-6">
          <AdministrationWorkspace page={pageData.page} />
          <GoogleAdsMarketingShell
            metrics={pageData.page.googleAds}
            attribution={pageData.page.attribution}
            variant="administration"
          />
        </div>
      ) : null}
    </ShellPage>
  );
}
