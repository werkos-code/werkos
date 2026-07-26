import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import {
  getCustomer,
  listCustomerOptions,
} from "@/features/customers/customers-actions";
import { ProjectDetailWorkspace } from "@/features/projects/components/project-detail-workspace";
import {
  getProject,
  listOrgStaffOptions,
  listProjectActivities,
} from "@/features/projects/projects-actions";
import {
  listQuotesForProject,
  listWorkItemsForProject,
} from "@/features/quotes/quotes-actions";
import { listWorkOrders } from "@/features/work-orders/work-orders-actions";
import { listTimeEntriesForProject } from "@/features/time/time-actions";
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
  const [
    projectResult,
    customersResult,
    staffResult,
    quotesResult,
    workItemsResult,
    activitiesResult,
    workOrdersResult,
    timeResult,
  ] = await Promise.all([
    getProject(projectId),
    listCustomerOptions(),
    listOrgStaffOptions(),
    listQuotesForProject(projectId),
    listWorkItemsForProject(projectId),
    listProjectActivities(projectId),
    listWorkOrders({ projectId }),
    listTimeEntriesForProject(projectId),
  ]);

  if (projectResult.error === "not_found" || !projectResult.project) {
    notFound();
  }

  const project = projectResult.project;
  const customerResult = await getCustomer(project.customerId);

  return (
    <ShellPage
      title={project.name}
      backHref="/projecten"
      contentClassName="max-w-none w-[94%]"
    >
      <ProjectDetailWorkspace
        project={project}
        customer={customerResult.customer ?? null}
        customers={customersResult.customers ?? []}
        staff={staffResult.staff ?? []}
        quotes={quotesResult.quotes ?? []}
        workItems={workItemsResult.workItems ?? []}
        workOrders={workOrdersResult.workOrders ?? []}
        activities={activitiesResult.activities ?? []}
        minutesByWorkItem={timeResult.minutesByWorkItem ?? {}}
        initialTab={tab}
      />
    </ShellPage>
  );
}
