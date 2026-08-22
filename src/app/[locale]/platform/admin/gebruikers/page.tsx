import { getTranslations, setRequestLocale } from "next-intl/server";

import { CreateUserForm } from "@/features/platform/components/create-user-form";
import { UsersGlobalSearch } from "@/features/platform/components/users-global-search";
import { UsersTable } from "@/features/platform/components/users-table";
import { AdminCockpitPage } from "@/features/platform/components/cockpit/admin-cockpit-page";
import {
  CockpitAlert,
  CockpitCard,
  CockpitSection,
} from "@/features/platform/components/cockpit/admin-cockpit-ui";
import { groupUsersByRole } from "@/features/platform/lib/group-users-by-role";
import { loadPlatformUsersPage } from "@/features/platform/users-actions";
import { USER_ROLES } from "@/config/roles";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export default async function PlatformUsersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.users");

  const pageData = await loadPlatformUsersPage();
  const grouped = groupUsersByRole(pageData.users ?? []);
  const superAdmins = grouped[USER_ROLES.SUPER_ADMIN];
  const unassigned = grouped.unassigned;

  return (
    <AdminCockpitPage title={t("title")}>
      {pageData.error ? (
        <CockpitAlert variant="error">{pageData.error}</CockpitAlert>
      ) : (
        <div className="space-y-10">
          <UsersGlobalSearch users={pageData.users ?? []} />

          <CockpitSection title={t(`roles.${USER_ROLES.SUPER_ADMIN}`)}>
            <UsersTable users={superAdmins} allowDelete={false} />
          </CockpitSection>

          <CockpitSection title={t("sections.accounts")}>
            <CockpitCard className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-slate-200">{t("accountsHint")}</p>
                <p className="text-sm text-slate-400">{t("accountsDescription")}</p>
              </div>
              <Button
                asChild
                variant="outline"
                className="shrink-0 border-white/15 bg-white/5 text-slate-200 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-100"
              >
                <Link href="/platform/admin/accounts">
                  {t("accountsCta")}
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </CockpitCard>
          </CockpitSection>

          {unassigned.length > 0 ? (
            <CockpitSection title={t("sections.unassigned")}>
              <UsersTable users={unassigned} />
            </CockpitSection>
          ) : null}
        </div>
      )}

      <CockpitSection title={t("createTitle")} className="mt-10">
        <p className="max-w-xl text-sm text-slate-400">{t("createDescription")}</p>
        <CockpitCard className="max-w-lg p-5">
          <CreateUserForm organizations={pageData.organizations ?? []} />
        </CockpitCard>
      </CockpitSection>
    </AdminCockpitPage>
  );
}
