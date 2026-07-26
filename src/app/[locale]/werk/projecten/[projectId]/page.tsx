import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import {
  getCustomer,
  listCustomerOptions,
} from "@/features/customers/customers-actions";
import { ProjectDetailWorkspace } from "@/features/projects/components/project-detail-workspace";
import { getProject } from "@/features/projects/projects-actions";
import {
  listQuotesForProject,
  listWorkItemsForProject,
} from "@/features/quotes/quotes-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string; projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: Props) {
  const { locale, projectId } = await params;
  const { tab } = await searchParams;
  setRequestLocale(locale);
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
  const customerResult = await getCustomer(project.customerId);

  return (
    <ShellPage
      title={project.name}
      backHref="/werk/projecten"
      contentClassName="max-w-none w-[94%]"
    >
      <ProjectDetailWorkspace
        project={project}
        customer={customerResult.customer ?? null}
        customers={customersResult.customers ?? []}
        quotes={quotesResult.quotes ?? []}
        workItems={workItemsResult.workItems ?? []}
        initialTab={tab}
      />
    </ShellPage>
  );
}
