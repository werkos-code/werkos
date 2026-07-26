"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { ProjectListFilter } from "@/features/projects/lib/project-status";
import type { ProjectRow } from "@/features/projects/projects-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { cn } from "@/lib/utils";

type ProjectsTableProps = {
  projects: ProjectRow[];
  activeFilter: ProjectListFilter;
};

const FILTERS: ProjectListFilter[] = [
  "new_requests",
  "active",
  "completed",
  "archived",
  "all",
];

export function ProjectsFilterTabs({
  activeFilter,
}: {
  activeFilter: ProjectListFilter;
}) {
  const t = useTranslations("projects");

  return (
    <div className="flex flex-wrap gap-1 border-b border-border pb-3">
      {FILTERS.map((filter) => (
        <Link
          key={filter}
          href={
            filter === "all"
              ? "/werk/projecten"
              : `/werk/projecten?filter=${filter}`
          }
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm transition-colors",
            activeFilter === filter
              ? "bg-primary/10 font-medium text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t(`filters.${filter}`)}
        </Link>
      ))}
    </div>
  );
}

export function ProjectsTable({ projects }: { projects: ProjectRow[] }) {
  const t = useTranslations("projects");

  if (projects.length === 0) {
    return (
      <PageCard className="px-5 py-8 text-sm text-muted-foreground">
        {t("empty")}
      </PageCard>
    );
  }

  return (
    <PageCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-muted-foreground">
              <th className="px-4 py-3 font-medium">{t("columns.name")}</th>
              <th className="px-4 py-3 font-medium">
                {t("columns.customer")}
              </th>
              <th className="px-4 py-3 font-medium">{t("columns.status")}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr
                key={project.id}
                className="border-b border-border/70 align-top last:border-0 hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/werk/projecten/${project.id}`}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {project.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {project.customerName}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">
                    {t(`status.${project.status}`)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageCard>
  );
}

export type { ProjectsTableProps };
