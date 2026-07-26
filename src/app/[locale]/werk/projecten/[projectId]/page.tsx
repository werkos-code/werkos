import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { listCustomerOptions } from "@/features/customers/customers-actions";
import { ProjectDetailForm } from "@/features/projects/components/project-detail-form";
import { getProject } from "@/features/projects/projects-actions";
import { requireTenantOrganization } from "@/features/shell/lib/require-organization";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string; projectId: string }>;
};

export default async function ProjectDetailPage({ params }: Props) {
  const { locale, projectId } = await params;
  setRequestLocale(locale);
  await requireTenantOrganization(locale);
  const t = await getTranslations("projects");

  const [projectResult, customersResult] = await Promise.all([
    getProject(projectId),
    listCustomerOptions(),
  ]);

  if (projectResult.error === "not_found" || !projectResult.project) {
    notFound();
  }

  const project = projectResult.project;

  return (
    <ShellPage
      title={project.name}
      description={t("detailDescription")}
      backHref="/werk/projecten"
    >
      <p className="mb-8 text-sm text-muted-foreground">
        {project.customerName} · {t(`status.${project.status}`)}
      </p>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-foreground">
          {t("sections.overview")}
        </h2>
        {customersResult.error ? (
          <p className="text-sm text-destructive">{customersResult.error}</p>
        ) : (
          <ProjectDetailForm
            project={project}
            customers={customersResult.customers ?? []}
          />
        )}
      </section>

      <section className="mt-12 space-y-3 border-t border-border pt-10">
        <h2 className="text-sm font-medium text-foreground">
          {t("sections.workspace")}
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          {t("sections.workspaceHint")}
        </p>
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {(
            [
              "workItems",
              "planning",
              "files",
              "hoursMaterials",
              "quotes",
              "invoices",
            ] as const
          ).map((key) => (
            <li
              key={key}
              className="rounded-lg border border-border/80 px-3 py-2"
            >
              {t(`sections.${key}`)}
            </li>
          ))}
        </ul>
      </section>
    </ShellPage>
  );
}
