import { getTranslations, setRequestLocale } from "next-intl/server";

import { DashboardWorkspace } from "@/features/dashboard/components/dashboard-workspace";
import { loadDashboardSnapshot } from "@/features/dashboard/dashboard-actions";
import { firstNameFromDisplayName } from "@/features/dashboard/lib/greeting";
import { getAppSession } from "@/features/shell/lib/require-organization";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function WerkDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const [session, result] = await Promise.all([
    getAppSession(),
    loadDashboardSnapshot(),
  ]);
  const firstName = firstNameFromDisplayName(session?.userName ?? "");

  return (
    <ShellPage title={t("title")}>
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : result.snapshot ? (
        <DashboardWorkspace
          snapshot={result.snapshot}
          firstName={firstName || t("greetingFallback")}
        />
      ) : null}
    </ShellPage>
  );
}
