"use client";

import { CalendarDays, Clock3, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatEurFromCents } from "@/config/pricing";
import { routing, type AppLocale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<AppLocale, string> = {
  nl: "NL",
  en: "EN",
  de: "DE",
};

function useLiveClock(locale: string) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(now);

  const timeLabel = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);

  return { dateLabel, timeLabel };
}

function DashboardLocalePicker({ className }: { className?: string }) {
  const t = useTranslations("dashboard.hero");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1.5 px-2 text-white/85 hover:bg-white/10 hover:text-white",
            className,
          )}
          aria-label={t("language")}
        >
          <Globe className="size-3.5" />
          <span className="text-xs font-medium tabular-nums">
            {LOCALE_LABELS[locale]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-28">
        {routing.locales.map((item) => (
          <DropdownMenuItem
            key={item}
            onSelect={() => {
              router.replace(pathname, { locale: item });
            }}
          >
            {LOCALE_LABELS[item]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type DashboardHeroProps = {
  firstName: string;
  revenueCents: number;
  chrome: React.ReactNode;
};

export function DashboardHero({
  firstName,
  revenueCents,
  chrome,
}: DashboardHeroProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { dateLabel, timeLabel } = useLiveClock(locale);
  const revenueLabel = formatEurFromCents(revenueCents, locale);

  return (
    <div className="relative overflow-hidden bg-linear-to-br from-[#09133A] via-[#0B1A4A] to-[#1E3A8A] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.22),transparent_55%)]"
      />
      <div className="relative mx-auto w-[90%] px-0 pt-5 pb-20 lg:pt-6 lg:pb-24">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("hero.hello", { name: firstName })}
            </h1>
            <div className="shrink-0 rounded-2xl bg-white px-4 py-3 text-[#09133A] shadow-[0_8px_24px_rgba(15,23,42,0.18)]">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("hero.revenueLabel")}
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">
                {revenueLabel}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 sm:justify-end">
            <span className="inline-flex h-8 items-center gap-1.5 px-2 text-xs text-white/80">
              <CalendarDays className="size-3.5 opacity-80" />
              <span className="capitalize">{dateLabel}</span>
            </span>
            <span className="inline-flex h-8 items-center gap-1.5 px-2 text-xs tabular-nums text-white/80">
              <Clock3 className="size-3.5 opacity-80" />
              {timeLabel}
            </span>
            <DashboardLocalePicker />
            <span
              aria-hidden
              className="mx-1 hidden h-5 w-px bg-white/25 sm:block"
            />
            <div className="flex items-center gap-0.5">{chrome}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
