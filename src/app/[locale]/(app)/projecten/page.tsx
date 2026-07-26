import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProjectsWorkspace } from "@/features/projects/components/projects-workspace";
import type { ProjectListFilter } from "@/features/projects/lib/project-status";
import { listProjects } from "@/features/projects/projects-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
};

function parseFilter(value: string | undefined): ProjectListFilter {
  if (
    value === "new_requests" ||
    value === "active" ||
    value === "completed" ||
    value === "archived" ||
    value === "all"
  ) {
    return value;
  }
  return "all";
}

export default async function ProjectenPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { filter: filterParam } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("projects");
  const filter = parseFilter(filterParam);
  const result = await listProjects("all");

  return (
    <ShellPage title={t("title")}>
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <ProjectsWorkspace
          projects={result.projects ?? []}
          initialFilter={filter}
        />
      )}
    </ShellPage>
  );
}
