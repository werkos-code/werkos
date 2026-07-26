import { getTranslations, setRequestLocale } from "next-intl/server";

import { CreateUserForm } from "@/features/platform/components/create-user-form";
import { UsersTable } from "@/features/platform/components/users-table";
import {
  listOrganizationsForAdmin,
  listPlatformUsers,
} from "@/features/platform/users-actions";
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

  return (
    <ShellPage title={t("title")} description={t("description")}>
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-foreground">{t("listTitle")}</h2>
        {usersResult.error ? (
          <p className="text-sm text-destructive">{usersResult.error}</p>
        ) : (
          <UsersTable users={usersResult.users ?? []} />
        )}
      </section>

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
