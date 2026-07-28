"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { notificationHref } from "@/features/notifications/lib/notification-links";
import type { NotificationRow } from "@/features/notifications/notifications-actions";
import { Link, useRouter } from "@/i18n/navigation";

type NotificationPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

export function NotificationPanel({
  open,
  onOpenChange,
  onChanged,
}: NotificationPanelProps) {
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/notifications", {
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as {
            notifications?: NotificationRow[];
            error?: string;
          };
          if (!response.ok || result.error) {
            setError(result.error || tCommon("error"));
            return;
          }
          setError(null);
          setNotifications(result.notifications ?? []);
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }, [open, tCommon]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle>{t("panelTitle")}</SheetTitle>
        </SheetHeader>
        <div className="flex items-center justify-between gap-2 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => {
              startTransition(() => {
                void (async () => {
                  await fetch("/api/notifications", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ all: true }),
                  });
                  onChanged();
                  setNotifications((items) =>
                    items.map((item) => ({
                      ...item,
                      readAt: item.readAt ?? new Date().toISOString(),
                    })),
                  );
                })();
              });
            }}
          >
            {t("markAllRead")}
          </Button>
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href="/notificaties">{t("openCenter")}</Link>
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : notifications.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="space-y-2">
              {notifications.slice(0, 20).map((notification) => {
                const href = notificationHref(notification);
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={`w-full rounded-lg border px-3 py-2 text-left ${
                        notification.readAt
                          ? "border-border/70 bg-background"
                          : "border-primary/20 bg-primary/5"
                      }`}
                      onClick={() => {
                        startTransition(() => {
                          void (async () => {
                            await fetch("/api/notifications", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: notification.id }),
                            });
                            onChanged();
                            onOpenChange(false);
                            if (href) router.push(href);
                          })();
                        });
                      }}
                    >
                      <p className="text-sm font-medium">{notification.title}</p>
                      {notification.body ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {notification.body}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {notification.createdAt.slice(0, 16).replace("T", " ")}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
