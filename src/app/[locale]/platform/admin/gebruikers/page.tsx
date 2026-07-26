import { getTranslations, setRequestLocale } from "next-intl/server";

import { CreateUserForm } from "@/features/platform/components/create-user-form";
import { UsersTable } from "@/features/platform/components/users-table";
import {
  groupUsersByRole,
  PLATFORM_USER_TABLE_ORDER,
} from "@/features/platform/lib/group-users-by-role";
import {
  listOrganizationsForAdmin,
  listPlatformUsers,
} from "@/features/platform/users-actions";
import { USER_ROLES } from "@/config/roles";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function PlatformUsersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.users");

  const [usersResult, orgsResult] = await Promise.all([
    listPlatformUsers(),
    listOrganizationsForAdmin(),
  ]);

  const grouped = groupUsersByRole(usersResult.users ?? []);

  return (
    <ShellPage title={t("title")} description={t("description")}>
      {usersResult.error ? (
        <p className="text-sm text-destructive">{usersResult.error}</p>
      ) : (
        <div className="space-y-10">
          {PLATFORM_USER_TABLE_ORDER.map((roleKey) => {
            const users = grouped[roleKey];
            if (roleKey === "unassigned" && users.length === 0) return null;

            const title =
              roleKey === "unassigned"
                ? t("sections.unassigned")
                : t(`roles.${roleKey}`);

            return (
              <section key={roleKey} className="space-y-4">
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

      <section className="mt-12 space-y-4 border-t border-border pt-10">
        <h2 className="text-sm font-medium text-foreground">
          {t("createTitle")}
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          {t("createDescription")}
        </p>
        <CreateUserForm organizations={orgsResult.organizations ?? []} />
      </section>
    </ShellPage>
  );
}
