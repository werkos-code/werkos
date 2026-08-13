"use client";

import {
  CheckSquare,
  FileText,
  FolderKanban,
  Receipt,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { formatEurFromCents } from "@/config/pricing";
import { DashboardQuickActions } from "@/features/dashboard/components/dashboard-quick-actions";
import { DashboardTasksCard } from "@/features/dashboard/components/dashboard-tasks-card";
import type { DashboardSnapshot } from "@/features/dashboard/dashboard-actions";
import {
  dayDelta,
  formatShortDate,
  formatTime,
} from "@/features/dashboard/lib/dates";
import { greetingPeriod } from "@/features/dashboard/lib/greeting";
import { PageCard } from "@/features/shell/components/page-card";
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
  const period = greetingPeriod();
  const todayRaw = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const todayLabel =
    todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);

  const attentionHref = snapshot.attention.some((item) => item.kind === "invoice")
    ? "/facturen"
    : "/werkzaamheden";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {t(`greeting.${period}`, { name: firstName })}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {todayLabel}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <PageCard className="flex min-h-64 flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">{t("attention.title")}</h2>
          </div>
          <div className="flex-1">
            {snapshot.attention.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                {t("attention.empty")}
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
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
                        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
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
          </div>
          <div className="border-t border-border px-4 py-2.5">
            <Link
              href={attentionHref}
              className="text-sm text-primary hover:underline"
            >
              {t("attention.viewAll")}
            </Link>
          </div>
        </PageCard>

        <PageCard className="flex min-h-64 flex-col overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">{t("today.title")}</h2>
          </div>
          <div className="flex-1">
            {snapshot.today.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                {t("today.empty")}
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {snapshot.today.map((item, index) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
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
          </div>
          <div className="border-t border-border px-4 py-2.5">
            <Link
              href="/planning"
              className="text-sm text-primary hover:underline"
            >
              {t("today.viewAll")}
            </Link>
          </div>
        </PageCard>

        <DashboardTasksCard
          personalTodos={snapshot.personalTodos}
          assignedTasks={snapshot.assignedTasks}
          locale={locale}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.9fr)]">
        <PageCard className="overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">{t("projects.title")}</h2>
          </div>
          {snapshot.projects.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              {t("projects.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    <th className="px-4 py-2">{t("projects.columns.project")}</th>
                    <th className="px-4 py-2">{t("projects.columns.customer")}</th>
                    <th className="px-4 py-2">{t("projects.columns.status")}</th>
                    <th className="px-4 py-2">{t("projects.columns.progress")}</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.projects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b border-border/70 last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/projecten/${project.id}`}
                          className="flex items-center gap-3"
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
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
                          <span className="min-w-0">
                            <span className="block truncate font-medium hover:text-primary hover:underline">
                              {project.name}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {project.projectNumber}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {project.customerName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadgeVariant(project.status)}>
                          {tProjects(`status.${project.status}`)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {project.progressPercent == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="min-w-24 space-y-1">
                            <p className="text-xs tabular-nums text-muted-foreground">
                              {project.progressPercent}%
                            </p>
                            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${project.progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-border px-4 py-2.5">
            <Link
              href="/projecten"
              className="text-sm text-primary hover:underline"
            >
              {t("projects.viewAll")}
            </Link>
          </div>
        </PageCard>

        <div className="space-y-4">
          <PageCard className="overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">{t("finance.title")}</h2>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border">
              {(
                [
                  ["paidThisMonth", snapshot.finance.paidThisMonthCents, false],
                  ["outstanding", snapshot.finance.outstandingCents, false],
                  ["overdue", snapshot.finance.overdueCents, true],
                  ["drafts", snapshot.finance.draftCount, false],
                ] as const
              ).map(([key, value, danger]) => (
                <div key={key} className="bg-card px-4 py-3">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {t(`finance.${key}`)}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-lg font-semibold tabular-nums",
                      danger && Number(value) > 0 && "text-destructive",
                    )}
                  >
                    {key === "drafts"
                      ? String(value)
                      : formatEurFromCents(Number(value), locale)}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-4 py-2.5">
              <Link
                href="/rapportages"
                className="text-sm text-primary hover:underline"
              >
                {t("finance.viewAll")}
              </Link>
            </div>
          </PageCard>

          <DashboardQuickActions
            projects={snapshot.projectOptions}
            workItems={snapshot.workItemOptions}
            currentUserId={snapshot.currentUserId}
          />
        </div>
      </div>
    </div>
  );
}
