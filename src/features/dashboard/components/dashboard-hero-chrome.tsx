"use client";

import { Bell, CircleHelp, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useShellChrome } from "@/features/shell/components/shell-chrome-provider";

/** White chrome icons for the dashboard hero only. */
export function DashboardHeroChrome() {
  const t = useTranslations("shell");
  const chrome = useShellChrome();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8 text-white/85 hover:bg-white/10 hover:text-white"
        aria-label={t("searchButton")}
        onClick={chrome.openSearch}
      >
        <Search className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="relative size-8 text-white/85 hover:bg-white/10 hover:text-white"
        aria-label={t("notificationsButton")}
        onClick={chrome.openNotifications}
      >
        <Bell className="size-4" />
        {chrome.unreadCount > 0 ? (
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-white text-[10px] font-medium text-[#09133A]">
            {chrome.unreadCount > 9 ? "9+" : chrome.unreadCount}
          </span>
        ) : null}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8 text-white/85 hover:bg-white/10 hover:text-white"
        aria-label={t("helpButton")}
        onClick={chrome.openHelp}
      >
        <CircleHelp className="size-4" />
      </Button>
    </>
  );
}
