import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { listCustomerOptions } from "@/features/customers/customers-actions";
import { ProjectDetailForm } from "@/features/projects/components/project-detail-form";
import { getProject } from "@/features/projects/projects-actions";
import { QuotesList } from "@/features/quotes/components/quotes-list";
import {
  listQuotesForProject,
  listWorkItemsForProject,
} from "@/features/quotes/quotes-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string; projectId: string }>;
};

export default async function ProjectDetailPage({ params }: Props) {
  const { locale, projectId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");
  const tQuotes = await getTranslations("quotes");

  const [projectResult, customersResult, quotesResult, workItemsResult] =
    await Promise.all([
      getProject(projectId),
      listCustomerOptions(),
      listQuotesForProject(projectId),
      listWorkItemsForProject(projectId),
    ]);

  if (projectResult.error === "not_found" || !projectResult.project) {
    notFound();
  }

  const project = projectResult.project;

  return (
    <ShellPage title={project.name} backHref="/werk/projecten">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {project.customerName}
        </span>
        <Badge variant="secondary">{t(`status.${project.status}`)}</Badge>
      </div>

      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">
            {t("sections.overview")}
          </h2>
          <PageCard className="p-5">
            {customersResult.error ? (
              <p className="text-sm text-destructive">{customersResult.error}</p>
            ) : (
              <ProjectDetailForm
                project={project}
                customers={customersResult.customers ?? []}
              />
            )}
          </PageCard>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">
            {tQuotes("sectionTitle")}
          </h2>
          {quotesResult.error ? (
            <p className="text-sm text-destructive">{quotesResult.error}</p>
          ) : (
            <QuotesList
              quotes={quotesResult.quotes ?? []}
              projectId={projectId}
            />
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">
            {t("sections.workItems")}
          </h2>
          <PageCard className="p-4">
            {workItemsResult.error ? (
              <p className="text-sm text-destructive">{workItemsResult.error}</p>
            ) : (workItemsResult.workItems ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tQuotes("noWorkItems")}
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {(workItemsResult.workItems ?? []).map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2"
                  >
                    {item.title}
                  </li>
                ))}
              </ul>
            )}
          </PageCard>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">
            {t("sections.workspace")}
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            {t("sections.workspaceHint")}
          </p>
          <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            {(
              ["planning", "files", "hoursMaterials", "invoices"] as const
            ).map((key) => (
              <li key={key}>
                <PageCard className="px-4 py-3">{t(`sections.${key}`)}</PageCard>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ShellPage>
  );
}
