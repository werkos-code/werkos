"use client";

import { Bell, CircleHelp, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
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

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-sm">
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
              aria-label={t("search")}
            >
              <Search className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={t("notifications")}
            >
              <Bell className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={t("help")}
            >
              <CircleHelp className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
