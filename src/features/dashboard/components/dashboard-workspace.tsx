"use client";

import {
  CalendarPlus,
  CheckSquare,
  FileText,
  FolderKanban,
  FolderPlus,
  Receipt,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { DashboardCalculatorCard } from "@/features/dashboard/components/dashboard-calculator-card";
import { DashboardHero } from "@/features/dashboard/components/dashboard-hero";
import { DashboardHeroChrome } from "@/features/dashboard/components/dashboard-hero-chrome";
import { DashboardKpiStrip } from "@/features/dashboard/components/dashboard-kpi-strip";
import { DashboardMiniCalendarCard } from "@/features/dashboard/components/dashboard-mini-calendar-card";
import { DashboardNotesCard } from "@/features/dashboard/components/dashboard-notes-card";
import { DashboardPrivateTodosCard } from "@/features/dashboard/components/dashboard-private-todos-card";
import { DashboardQuickActions } from "@/features/dashboard/components/dashboard-quick-actions";
import {
  DashboardEmptyCta,
  DashboardSurface,
  DashboardSurfaceHeader,
} from "@/features/dashboard/components/dashboard-surface";
import type { DashboardSnapshot } from "@/features/dashboard/dashboard-actions";
import {
  dayDelta,
  formatShortDate,
  formatTime,
} from "@/features/dashboard/lib/dates";
import { Link } from "@/i18n/navigation";
import type { ProjectStatus } from "@/types/database";
import { cn } from "@/lib/utils";

type DashboardWorkspaceProps = {
  snapshot: DashboardSnapshot;
  firstName: string;
};

function statusBadgeVariant(
  status: ProjectStatus,
): "default" | "secondary" | "success" | "outline" {
  switch (status) {
    case "preparation":
      return "default";
    case "execution":
      return "success";
    case "completed":
      return "success";
    case "archived":
      return "outline";
    default:
      return "secondary";
  }
}

function AttentionMeta({
  iso,
  overdue,
  locale,
}: {
  iso: string | null;
  overdue: boolean;
  locale: string;
}) {
  const t = useTranslations("dashboard");
  if (!iso) return <span className="text-xs text-muted-foreground">—</span>;
  const delta = dayDelta(iso);
  let label = formatShortDate(iso, locale);
  if (delta === 0) label = t("relative.today");
  else if (delta === -1) label = t("relative.yesterday");
  else if (delta != null && delta < -1 && delta >= -14) {
    label = t("relative.daysAgo", { count: Math.abs(delta) });
  }
  return (
    <span
      className={cn(
        "shrink-0 text-xs",
        overdue ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export function DashboardWorkspace({
  snapshot,
  firstName,
}: DashboardWorkspaceProps) {
  const t = useTranslations("dashboard");
  const tProjects = useTranslations("projects");
  const locale = useLocale();

  const attentionHref = snapshot.attention.some((item) => item.kind === "invoice")
    ? "/facturen"
    : "/werkzaamheden";

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <DashboardHero
        firstName={firstName}
        chrome={<DashboardHeroChrome />}
      />

      <div className="relative z-10 -mt-12 flex-1 px-6 pb-10 lg:-mt-14 lg:px-8 lg:pb-12">
        <div className="mx-auto w-[90%] space-y-10">
          {/* Section 1 — KPIs overlap banner */}
          <DashboardKpiStrip kpis={snapshot.kpis} />

          {/* Section 2 — Quick actions */}
          <DashboardQuickActions
            projects={snapshot.projectOptions}
            workItems={snapshot.workItemOptions}
            currentUserId={snapshot.currentUserId}
          />

          {/* Section 3 — Daily operations */}
          <section className="space-y-3">
            <div className="px-1">
              <h2 className="text-sm font-semibold tracking-tight">
                {t("operations.title")}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("operations.subtitle")}
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <DashboardSurface className="flex min-h-72 flex-col">
                <DashboardSurfaceHeader
                  title={t("projects.title")}
                  action={
                    snapshot.projects.length > 0 ? (
                      <Link
                        href="/projecten"
                        className="text-xs text-primary hover:underline"
                      >
                        {t("projects.viewAll")}
                      </Link>
                    ) : null
                  }
                />
                {snapshot.projects.length === 0 ? (
                  <DashboardEmptyCta
                    icon={FolderPlus}
                    title={t("projects.emptyTitle")}
                    description={t("projects.emptyDescription")}
                    ctaLabel={t("projects.cta")}
                    href="/opdrachten/nieuw"
                  />
                ) : (
                  <ul className="flex-1 divide-y divide-border/60">
                    {snapshot.projects.map((project) => (
                      <li key={project.id}>
                        <Link
                          href={`/projecten/${project.id}`}
                          className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
                            {project.coverUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={project.coverUrl}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <FolderKanban className="size-4" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {project.name}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {project.customerName || project.projectNumber}
                            </span>
                            {project.progressPercent != null ? (
                              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{
                                    width: `${project.progressPercent}%`,
                                  }}
                                />
                              </div>
                            ) : null}
                          </span>
                          <Badge variant={statusBadgeVariant(project.status)}>
                            {tProjects(`status.${project.status}`)}
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardSurface>

              <DashboardSurface className="flex min-h-72 flex-col">
                <DashboardSurfaceHeader
                  title={t("attention.title")}
                  action={
                    snapshot.attention.length > 0 ? (
                      <Link
                        href={attentionHref}
                        className="text-xs text-primary hover:underline"
                      >
                        {t("attention.viewAll")}
                      </Link>
                    ) : null
                  }
                />
                {snapshot.attention.length === 0 ? (
                  <DashboardEmptyCta
                    icon={CheckSquare}
                    title={t("attention.emptyTitle")}
                    description={t("attention.emptyDescription")}
                    ctaLabel={t("attention.cta")}
                    href="/werkzaamheden"
                  />
                ) : (
                  <ul className="flex-1 divide-y divide-border/60">
                    {snapshot.attention.map((item) => {
                      const Icon =
                        item.kind === "invoice"
                          ? Receipt
                          : item.kind === "quote"
                            ? FileText
                            : CheckSquare;
                      const tone =
                        item.kind === "invoice"
                          ? "bg-destructive/10 text-destructive"
                          : item.kind === "quote"
                            ? "bg-primary/10 text-primary"
                            : "bg-amber-500/10 text-amber-700";
                      return (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-muted/30"
                          >
                            <span
                              className={cn(
                                "flex size-8 shrink-0 items-center justify-center rounded-full",
                                tone,
                              )}
                            >
                              <Icon className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">
                                {item.title}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {item.subtitle}
                              </span>
                            </span>
                            <AttentionMeta
                              iso={item.dueDate}
                              overdue={item.overdue}
                              locale={locale}
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </DashboardSurface>

              <DashboardSurface className="flex min-h-72 flex-col">
                <DashboardSurfaceHeader
                  title={t("today.title")}
                  action={
                    snapshot.today.length > 0 ? (
                      <Link
                        href="/planning"
                        className="text-xs text-primary hover:underline"
                      >
                        {t("today.viewAll")}
                      </Link>
                    ) : null
                  }
                />
                {snapshot.today.length === 0 ? (
                  <DashboardEmptyCta
                    icon={CalendarPlus}
                    title={t("today.emptyTitle")}
                    description={t("today.emptyDescription")}
                    ctaLabel={t("today.cta")}
                    href="/planning"
                  />
                ) : (
                  <ul className="flex-1 divide-y divide-border/60">
                    {snapshot.today.map((item, index) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className="flex items-start gap-3 px-5 py-2.5 transition-colors hover:bg-muted/30"
                        >
                          <span className="w-12 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">
                            {item.allDay
                              ? t("today.allDay")
                              : formatTime(item.startsAt, locale)}
                          </span>
                          <span className="relative mt-1.5 flex w-3 shrink-0 justify-center">
                            <span
                              className={cn(
                                "size-2 rounded-full",
                                index === 0 ? "bg-primary" : "bg-border",
                              )}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {item.title}
                            </span>
                            {item.context ? (
                              <span className="block truncate text-xs text-muted-foreground">
                                {item.context}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardSurface>
            </div>
          </section>

          {/* Divider — Private workspace */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-sm font-semibold tracking-tight text-foreground">
                {t("private.title")}
              </span>
            </div>
          </div>

          {/* Section 4 — Personal tools */}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DashboardNotesCard initialBody={snapshot.personalNote} />
            <DashboardCalculatorCard />
            <DashboardPrivateTodosCard
              personalTodos={snapshot.personalTodos}
            />
            <DashboardMiniCalendarCard days={snapshot.calendarDays} />
          </section>
        </div>
      </div>
    </div>
  );
}
