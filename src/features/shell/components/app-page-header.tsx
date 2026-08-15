"use client";

import { Bell, CircleHelp, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useShellChrome } from "@/features/shell/components/shell-chrome-provider";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";

type AppPageHeaderProps = {
  title: string;
  backHref?: string;
  status?: React.ReactNode;
  actions?: React.ReactNode;
};

export function AppPageHeader({
  title,
  backHref,
  status,
  actions,
}: AppPageHeaderProps) {
  const t = useTranslations("shell");
  const chrome = useShellChrome();

  return (
    <header className="no-print sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-4 px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {backHref ? (
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={t("back")}
            >
              <Link href={backHref}>
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          ) : null}
          <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {status}
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={t("searchButton")}
              onClick={chrome.openSearch}
            >
              <Search className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="relative text-muted-foreground"
              aria-label={t("notificationsButton")}
              onClick={chrome.openNotifications}
            >
              <Bell className="size-4" />
              {chrome.unreadCount > 0 ? (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {chrome.unreadCount > 9 ? "9+" : chrome.unreadCount}
                </span>
              ) : null}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={t("helpButton")}
              onClick={chrome.openHelp}
            >
              <CircleHelp className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
