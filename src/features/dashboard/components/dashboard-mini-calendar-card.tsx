"use client";

import { CalendarDays } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import {
  DashboardEmptyCta,
  DashboardSurface,
  DashboardSurfaceHeader,
} from "@/features/dashboard/components/dashboard-surface";
import type { DashboardCalendarDay } from "@/features/dashboard/dashboard-actions";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function DashboardMiniCalendarCard({
  days,
}: {
  days: DashboardCalendarDay[];
}) {
  const t = useTranslations("dashboard.private.calendar");
  const locale = useLocale();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of days) map.set(day.date, day.count);
    return map;
  }, [days]);

  const todayKey = dateKey(year, month, now.getDate());
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ day: null, key: null });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, key: dateKey(year, month, day) });
  }

  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(now);

  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, 1 + index);
    return new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(date);
  });

  const hasAny = days.some((day) => day.count > 0);

  return (
    <DashboardSurface className="flex min-h-72 flex-col">
      <DashboardSurfaceHeader
        title={t("title")}
        action={
          <span className="text-xs font-medium capitalize text-muted-foreground">
            {monthLabel}
          </span>
        }
      />
      {!hasAny ? (
        <DashboardEmptyCta
          icon={CalendarDays}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          ctaLabel={t("cta")}
          href="/planning"
        />
      ) : (
        <div className="flex flex-1 flex-col px-5 pb-5">
          <div className="mb-2 grid grid-cols-7 gap-1">
            {weekdayLabels.map((label, index) => (
              <span
                key={`${label}-${index}`}
                className="text-center text-[10px] font-medium text-muted-foreground"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, index) => {
              if (cell.day == null || !cell.key) {
                return <span key={`empty-${index}`} className="aspect-square" />;
              }
              const count = countByDate.get(cell.key) ?? 0;
              const isToday = cell.key === todayKey;
              return (
                <Link
                  key={cell.key}
                  href="/planning"
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-lg text-xs tabular-nums transition-colors hover:bg-muted",
                    isToday && "bg-primary/10 font-semibold text-primary",
                    count > 0 && !isToday && "font-medium",
                  )}
                >
                  {cell.day}
                  {count > 0 ? (
                    <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
                  ) : null}
                </Link>
              );
            })}
          </div>
          <Link
            href="/planning"
            className="mt-auto pt-3 text-xs text-primary hover:underline"
          >
            {t("openPlanning")}
          </Link>
        </div>
      )}
    </DashboardSurface>
  );
}
