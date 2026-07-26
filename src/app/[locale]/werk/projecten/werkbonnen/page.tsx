import { getTranslations, setRequestLocale } from "next-intl/server";

import { WorkOrdersWorkspace } from "@/features/work-orders/components/work-orders-workspace";
import { listWorkOrders } from "@/features/work-orders/work-orders-actions";
import { listOrgStaffOptions } from "@/features/projects/projects-actions";
import { getAppSession } from "@/features/shell/lib/require-organization";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function WerkbonnenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("workOrders");
  const session = await getAppSession();

  const [ordersResult, staffResult] = await Promise.all([
    listWorkOrders(),
    listOrgStaffOptions(),
  ]);

  return (
    <ShellPage title={t("title")} contentClassName="max-w-none w-[94%]">
      {ordersResult.error ? (
        <p className="text-sm text-destructive">{ordersResult.error}</p>
      ) : (
        <WorkOrdersWorkspace
          workOrders={ordersResult.workOrders ?? []}
          projects={ordersResult.projects ?? []}
          staff={staffResult.staff ?? []}
          currentUserId={session?.user.id ?? null}
        />
      )}
    </ShellPage>
  );
}
