"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  deletePlatformUser,
  type PlatformUserRow,
} from "@/features/platform/users-actions";
import { PageCard } from "@/features/shell/components/page-card";

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
      <PageCard className="px-5 py-8 text-sm text-muted-foreground">
        {t("empty")}
      </PageCard>
    );
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <PageCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                <th className="px-4 py-3 font-medium">{t("columns.name")}</th>
                <th className="px-4 py-3 font-medium">{t("columns.email")}</th>
                <th className="px-4 py-3 font-medium">
                  {t("columns.memberships")}
                </th>
                {allowDelete ? (
                  <th className="px-4 py-3 font-medium">
                    {t("columns.actions")}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border/70 align-top last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 text-foreground">
                    {user.fullName || "—"}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {user.email || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
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
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
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
      </PageCard>
    </div>
  );
}
