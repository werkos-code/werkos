import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdministrationWorkspace } from "@/features/platform/components/administration-workspace";
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
        <AdministrationWorkspace page={pageData.page} />
      ) : null}
    </ShellPage>
  );
}
