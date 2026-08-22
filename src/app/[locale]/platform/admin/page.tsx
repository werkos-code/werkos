import { getTranslations, setRequestLocale } from "next-intl/server";

import { AdminDashboardPanel } from "@/features/platform/components/admin-dashboard-panel";
import { AdminCockpitPage } from "@/features/platform/components/cockpit/admin-cockpit-page";
import { CockpitAlert } from "@/features/platform/components/cockpit/admin-cockpit-ui";
import { loadPlatformDashboard } from "@/features/platform/platform-dashboard-actions";

type Props = { params: Promise<{ locale: string }> };

export default async function PlatformAdminDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.dashboard");

  const pageData = await loadPlatformDashboard();

  return (
    <AdminCockpitPage title={t("title")}>
      {pageData.error ? (
        <CockpitAlert variant="error">{pageData.error}</CockpitAlert>
      ) : pageData.dashboard ? (
        <AdminDashboardPanel dashboard={pageData.dashboard} />
      ) : null}
    </AdminCockpitPage>
  );
}
