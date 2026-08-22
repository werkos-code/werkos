import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdminDashboardPanel } from "@/features/platform/components/admin-dashboard-panel";
import { loadPlatformDashboard } from "@/features/platform/platform-dashboard-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function PlatformAdminDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.dashboard");

  const pageData = await loadPlatformDashboard();

  return (
    <ShellPage title={t("title")}>
      {pageData.error ? (
        <p className="text-sm text-destructive">{pageData.error}</p>
      ) : pageData.dashboard ? (
        <AdminDashboardPanel dashboard={pageData.dashboard} />
      ) : null}
    </ShellPage>
  );
}
