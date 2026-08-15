import { getTranslations, setRequestLocale } from "next-intl/server";

import { DashboardWorkspace } from "@/features/dashboard/components/dashboard-workspace";
import { loadDashboardSnapshot } from "@/features/dashboard/dashboard-actions";
import { firstNameFromDisplayName } from "@/features/dashboard/lib/greeting";
import { getAppSession } from "@/features/shell/lib/require-organization";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function WerkDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const [session, result] = await Promise.all([
    getAppSession(),
    loadDashboardSnapshot(),
  ]);
  const firstName = firstNameFromDisplayName(session?.userName ?? "");

  if (result.error) {
    return (
      <div className="flex min-h-dvh flex-col bg-background px-6 py-8 lg:px-8">
        <div className="mx-auto w-[90%]">
          <p className="text-sm text-destructive">{result.error}</p>
        </div>
      </div>
    );
  }

  if (!result.snapshot) return null;

  return (
    <DashboardWorkspace
      snapshot={result.snapshot}
      firstName={firstName || t("greetingFallback")}
    />
  );
}
