"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  deletePlatformUser,
  type PlatformUserRow,
} from "@/features/platform/users-actions";
import { CockpitCard } from "@/features/platform/components/cockpit/admin-cockpit-ui";
import { Link } from "@/i18n/navigation";

type UsersTableProps = {
  users: PlatformUserRow[];
  /** When false, delete action is hidden (super admin table). */
  allowDelete?: boolean;
};

export function UsersTable({ users, allowDelete = true }: UsersTableProps) {
  const t = useTranslations("platform.users");
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (users.length === 0) {
    return (
      <CockpitCard className="px-5 py-8 text-sm text-slate-400">
        {t("empty")}
      </CockpitCard>
    );
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <CockpitCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[40rem]">
            <thead>
              <tr>
                <th>{t("columns.name")}</th>
                <th>{t("columns.email")}</th>
                <th>{t("columns.memberships")}</th>
                {allowDelete ? <th>{t("columns.actions")}</th> : null}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="align-top">
                  <td>
                    <Link
                      href={`/platform/admin/gebruikers/${user.id}`}
                      className="admin-cockpit-link font-medium text-slate-100"
                    >
                      {user.fullName || "—"}
                    </Link>
                  </td>
                  <td>
                    <Link
                      href={`/platform/admin/gebruikers/${user.id}`}
                      className="admin-cockpit-link text-slate-300"
                    >
                      {user.email || "—"}
                    </Link>
                  </td>
                  <td className="text-slate-400">
                    {user.memberships.length === 0
                      ? "—"
                      : user.memberships
                          .map(
                            (m) =>
                              `${m.organizationName} (${t(`roles.${m.role}`)})`,
                          )
                          .join(", ")}
                  </td>
                  {allowDelete ? (
                    <td>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-300 hover:bg-red-500/10 hover:text-red-200"
                        disabled={isPending && pendingId === user.id}
                        onClick={() => {
                          const label = user.email || user.fullName || user.id;
                          if (
                            !window.confirm(
                              t("deleteConfirm", { email: label }),
                            )
                          ) {
                            return;
                          }
                          setError(null);
                          setPendingId(user.id);
                          startTransition(() => {
                            void (async () => {
                              const result = await deletePlatformUser(user.id);
                              if (result.error) {
                                setError(
                                  result.error === "cannot_delete_super_admin"
                                    ? t("cannotDeleteSuperAdmin")
                                    : result.error === "cannot_delete_self"
                                      ? t("cannotDeleteSelf")
                                      : result.error,
                                );
                                setPendingId(null);
                                return;
                              }
                              setPendingId(null);
                              router.refresh();
                            })();
                          });
                        }}
                      >
                        {t("delete")}
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CockpitCard>
    </div>
  );
}
