import { getTranslations, setRequestLocale } from "next-intl/server";

import { DashboardWorkspace } from "@/features/dashboard/components/dashboard-workspace";
import { loadDashboardSnapshot } from "@/features/dashboard/dashboard-actions";
import { firstNameFromDisplayName } from "@/features/dashboard/lib/greeting";
import { GuidedSetupHost } from "@/features/guided-setup/components/guided-setup-host";
import { getGuidedSetupState } from "@/features/guided-setup/guided-setup-actions";
import { getAppSession } from "@/features/shell/lib/require-organization";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ welcome?: string }>;
};

export default async function WerkDashboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { welcome } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const [session, result, guided] = await Promise.all([
    getAppSession(),
    loadDashboardSnapshot(),
    getGuidedSetupState(),
  ]);
  const firstName = firstNameFromDisplayName(session?.userName ?? "");
  const forceIntro = welcome === "1";

  return (
    <ShellPage title={t("title")}>
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : result.snapshot ? (
        <div className="space-y-6">
          {guided.state ? (
            <GuidedSetupHost state={guided.state} forceIntro={forceIntro} />
          ) : null}
          <DashboardWorkspace
            snapshot={result.snapshot}
            firstName={firstName || t("greetingFallback")}
          />
        </div>
      ) : null}
    </ShellPage>
  );
}
