import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import {
  ProjectsFilterTabs,
  ProjectsTable,
} from "@/features/projects/components/projects-table";
import type { ProjectListFilter } from "@/features/projects/lib/project-status";
import { listProjects } from "@/features/projects/projects-actions";
import { ShellPage } from "@/features/shell/components/shell-page";
import { Link } from "@/i18n/navigation";

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
  const result = await listProjects(filter);

  return (
    <ShellPage title={t("title")} description={t("description")}>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link href="/werk/aanvragen/nieuw">{t("newRequest")}</Link>
        </Button>
      </div>
      <ProjectsFilterTabs activeFilter={filter} />
      <div className="mt-6">
        {result.error ? (
          <p className="text-sm text-destructive">{result.error}</p>
        ) : (
          <ProjectsTable projects={result.projects ?? []} />
        )}
      </div>
    </ShellPage>
  );
}
