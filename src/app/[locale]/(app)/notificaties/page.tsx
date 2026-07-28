import { getTranslations, setRequestLocale } from "next-intl/server";

import { NotificationsWorkspace } from "@/features/notifications/components/notifications-workspace";
import { listNotifications } from "@/features/notifications/notifications-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function NotificatiesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("notifications");
  const result = await listNotifications(100);

  return (
    <ShellPage title={t("title")}>
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <NotificationsWorkspace
          notifications={result.notifications ?? []}
          unreadCount={result.unreadCount ?? 0}
        />
      )}
    </ShellPage>
  );
}
