"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { notificationHref } from "@/features/notifications/lib/notification-links";
import type { NotificationRow } from "@/features/notifications/notifications-actions";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";
import { Link, useRouter } from "@/i18n/navigation";

type NotificationsWorkspaceProps = {
  notifications: NotificationRow[];
  unreadCount: number;
};

export function NotificationsWorkspace({
  notifications,
  unreadCount,
}: NotificationsWorkspaceProps) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetaStatCard label={t("kpiTotal")} value={String(notifications.length)} />
        <MetaStatCard label={t("kpiUnread")} value={String(unreadCount)} />
        <MetaStatCard
          label={t("kpiRead")}
          value={String(notifications.length - unreadCount)}
        />
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          disabled={isPending || unreadCount === 0}
          onClick={() => {
            startTransition(() => {
              void (async () => {
                await fetch("/api/notifications", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ all: true }),
                });
                router.refresh();
              })();
            });
          }}
        >
          {t("markAllRead")}
        </Button>
      </div>

      {notifications.length === 0 ? (
        <PageCard className="px-5 py-8 text-sm text-muted-foreground">
          {t("empty")}
        </PageCard>
      ) : (
        <PageCard className="overflow-hidden">
          <ul>
            {notifications.map((notification) => {
              const href = notificationHref(notification);
              return (
                <li
                  key={notification.id}
                  className="border-b border-border/70 last:border-0"
                >
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="font-medium">{notification.title}</p>
                      {notification.body ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {notification.body}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {notification.createdAt.slice(0, 16).replace("T", " ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {!notification.readAt ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {t("unread")}
                        </span>
                      ) : null}
                      {href ? (
                        <Link
                          href={href}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {t("open")}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </PageCard>
      )}

      <PageCard className="px-5 py-4 text-sm text-muted-foreground">
        {t("preferencesHint")}
      </PageCard>
    </div>
  );
}
