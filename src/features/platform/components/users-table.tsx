import { getTranslations } from "next-intl/server";

import type { PlatformUserRow } from "@/features/platform/users-actions";

type UsersTableProps = {
  users: PlatformUserRow[];
};

export async function UsersTable({ users }: UsersTableProps) {
  const t = await getTranslations("platform.users");

  if (users.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("empty")}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th className="px-0 py-3 pr-4 font-medium">{t("columns.name")}</th>
            <th className="px-0 py-3 pr-4 font-medium">{t("columns.email")}</th>
            <th className="px-0 py-3 pr-4 font-medium">{t("columns.platform")}</th>
            <th className="px-0 py-3 font-medium">{t("columns.memberships")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-border/70 align-top last:border-0"
            >
              <td className="py-3 pr-4 text-foreground">
                {user.fullName || "—"}
              </td>
              <td className="py-3 pr-4 text-foreground">{user.email || "—"}</td>
              <td className="py-3 pr-4 text-muted-foreground">
                {user.platformRole
                  ? t(`roles.${user.platformRole}`)
                  : "—"}
              </td>
              <td className="py-3 text-muted-foreground">
                {user.memberships.length === 0
                  ? "—"
                  : user.memberships
                      .map(
                        (m) =>
                          `${m.organizationName} (${t(`roles.${m.role}`)})`,
                      )
                      .join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
