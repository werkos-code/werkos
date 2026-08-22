import { getTranslations, setRequestLocale } from "next-intl/server";

import { CreateUserForm } from "@/features/platform/components/create-user-form";
import { UsersGlobalSearch } from "@/features/platform/components/users-global-search";
import { UsersTable } from "@/features/platform/components/users-table";
import {
  groupUsersByRole,
} from "@/features/platform/lib/group-users-by-role";
import { loadPlatformUsersPage } from "@/features/platform/users-actions";
import { USER_ROLES } from "@/config/roles";
import { Button } from "@/components/ui/button";
import { PageCard } from "@/features/shell/components/page-card";
import { ShellPage } from "@/features/shell/components/shell-page";
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
    <ShellPage title={t("title")}>
      {pageData.error ? (
        <p className="text-sm text-destructive">{pageData.error}</p>
      ) : (
        <div className="space-y-8">
          <UsersGlobalSearch users={pageData.users ?? []} />

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">
              {t(`roles.${USER_ROLES.SUPER_ADMIN}`)}
              <span className="ml-2 font-normal text-muted-foreground">
                ({superAdmins.length})
              </span>
            </h2>
            <UsersTable users={superAdmins} allowDelete={false} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-foreground">
              {t("sections.accounts")}
            </h2>
            <PageCard className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-foreground">{t("accountsHint")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("accountsDescription")}
                </p>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link href="/platform/admin/accounts">
                  {t("accountsCta")}
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            </PageCard>
          </section>

          {unassigned.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-foreground">
                {t("sections.unassigned")}
                <span className="ml-2 font-normal text-muted-foreground">
                  ({unassigned.length})
                </span>
              </h2>
              <UsersTable users={unassigned} />
            </section>
          ) : null}
        </div>
      )}

      <section className="mt-10 space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t("createTitle")}
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          {t("createDescription")}
        </p>
        <PageCard className="max-w-lg p-5">
          <CreateUserForm organizations={pageData.organizations ?? []} />
        </PageCard>
      </section>
    </ShellPage>
  );
}
