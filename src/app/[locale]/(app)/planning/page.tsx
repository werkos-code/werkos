import { getTranslations, setRequestLocale } from "next-intl/server";

import { PlanningWorkspace } from "@/features/planning/components/planning-workspace";
import { getPlanningSettings, listPlanningWorkspaceData } from "@/features/planning/planning-actions";
import { startOfWeek, addDays, toDateKey } from "@/features/planning/lib/planning";
import { listOrgStaffOptions } from "@/features/projects/projects-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function PlanningPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("planning");

  const weekStart = startOfWeek(new Date(), 1);
  const rangeFrom = addDays(weekStart, -60).toISOString();
  const rangeTo = addDays(weekStart, 90).toISOString();

  const [planningResult, staffResult, settingsResult] = await Promise.all([
    listPlanningWorkspaceData({ from: rangeFrom, to: rangeTo }),
    listOrgStaffOptions(),
    getPlanningSettings(),
  ]);

  return (
    <ShellPage title={t("title")} contentClassName="max-w-none w-[96%]">
      {planningResult.error ? (
        <p className="text-sm text-destructive">{planningResult.error}</p>
      ) : (
        <PlanningWorkspace
          appointments={planningResult.appointments ?? []}
          unplanned={planningResult.unplanned ?? []}
          projects={planningResult.projects ?? []}
          staff={staffResult.staff ?? []}
          initialWeekStart={`${toDateKey(weekStart)}T12:00:00`}
          planningSettings={
            settingsResult.settings ?? {
              workDays: [1, 2, 3, 4, 5],
              dayStartHour: 7,
              dayEndHour: 17,
              setupCompleted: false,
            }
          }
        />
      )}
    </ShellPage>
  );
}
