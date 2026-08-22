import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { UserDetailPanel } from "@/features/platform/components/user-detail-panel";
import { loadPlatformUserDetail } from "@/features/platform/users-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string; userId: string }>;
};

export default async function PlatformUserDetailPage({ params }: Props) {
  const { locale, userId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.users");

  const pageData = await loadPlatformUserDetail(userId);

  if (pageData.error === "not_found") {
    notFound();
  }

  return (
    <ShellPage
      title={
        pageData.user?.fullName ||
        pageData.user?.email ||
        t("detail.fallbackTitle")
      }
    >
      {pageData.error ? (
        <p className="text-sm text-destructive">{pageData.error}</p>
      ) : pageData.user ? (
        <UserDetailPanel user={pageData.user} locale={locale} />
      ) : null}
    </ShellPage>
  );
}
