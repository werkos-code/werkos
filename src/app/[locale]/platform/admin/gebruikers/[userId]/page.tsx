import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { UserDetailPanel } from "@/features/platform/components/user-detail-panel";
import { AdminCockpitPage } from "@/features/platform/components/cockpit/admin-cockpit-page";
import { CockpitAlert } from "@/features/platform/components/cockpit/admin-cockpit-ui";
import { loadPlatformUserDetail } from "@/features/platform/users-actions";

type Props = {
  params: Promise<{ locale: string; userId: string }>;
};

export default async function PlatformUserDetailPage({ params }: Props) {
  const { locale, userId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.users");
  const tShell = await getTranslations("shell");

  const pageData = await loadPlatformUserDetail(userId);

  if (pageData.error === "not_found") {
    notFound();
  }

  return (
    <AdminCockpitPage
      title={
        pageData.user?.fullName ||
        pageData.user?.email ||
        t("detail.fallbackTitle")
      }
      backHref="/platform/admin/gebruikers"
      backLabel={tShell("back")}
    >
      {pageData.error ? (
        <CockpitAlert variant="error">{pageData.error}</CockpitAlert>
      ) : pageData.user ? (
        <UserDetailPanel user={pageData.user} locale={locale} />
      ) : null}
    </AdminCockpitPage>
  );
}
