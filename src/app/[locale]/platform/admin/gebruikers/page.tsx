import { getTranslations, setRequestLocale } from "next-intl/server";

import { CreateUserForm } from "@/features/platform/components/create-user-form";
import { UsersTable } from "@/features/platform/components/users-table";
import {
  groupUsersByRole,
  PLATFORM_USER_TABLE_ORDER,
} from "@/features/platform/lib/group-users-by-role";
import { loadPlatformUsersPage } from "@/features/platform/users-actions";
import { USER_ROLES } from "@/config/roles";
import { PageCard } from "@/features/shell/components/page-card";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function PlatformUsersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.users");

  const pageData = await loadPlatformUsersPage();
  const grouped = groupUsersByRole(pageData.users ?? []);

  return (
    <ShellPage title={t("title")}>
      {pageData.error ? (
        <p className="text-sm text-destructive">{pageData.error}</p>
      ) : (
        <div className="space-y-8">
          {PLATFORM_USER_TABLE_ORDER.map((roleKey) => {
            const users = grouped[roleKey];
            if (roleKey === "unassigned" && users.length === 0) return null;

            const title =
              roleKey === "unassigned"
                ? t("sections.unassigned")
                : t(`roles.${roleKey}`);

            return (
              <section key={roleKey} className="space-y-3">
                <h2 className="text-sm font-medium text-foreground">
                  {title}
                  <span className="ml-2 font-normal text-muted-foreground">
                    ({users.length})
                  </span>
                </h2>
                <UsersTable
                  users={users}
                  allowDelete={roleKey !== USER_ROLES.SUPER_ADMIN}
                />
              </section>
            );
          })}
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
