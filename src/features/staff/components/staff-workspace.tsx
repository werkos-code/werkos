"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { USER_ROLES } from "@/config/roles";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";
import type { StaffMemberRow } from "@/features/staff/staff-actions";
import { Link, useRouter } from "@/i18n/navigation";

type StaffWorkspaceProps = {
  members: StaffMemberRow[];
  canManage: boolean;
  currentUserId: string;
};

export function StaffWorkspace({
  members,
  canManage,
  currentUserId,
}: StaffWorkspaceProps) {
  const t = useTranslations("staff");
  const tRoles = useTranslations("platform.users.roles");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(() => {
    return {
      total: members.length,
      owners: members.filter((m) => m.role === USER_ROLES.OWNER).length,
      office: members.filter((m) => m.role === USER_ROLES.OFFICE_EMPLOYEE)
        .length,
      field: members.filter((m) => m.role === USER_ROLES.FIELD_EMPLOYEE).length,
    };
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((member) => {
      if (roleFilter !== "all" && member.role !== roleFilter) return false;
      if (!q) return true;
      return (
        member.name.toLowerCase().includes(q) ||
        (member.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [members, query, roleFilter]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaStatCard label={t("kpiTotal")} value={String(stats.total)} />
        <MetaStatCard label={t("kpiOffice")} value={String(stats.office)} />
        <MetaStatCard label={t("kpiField")} value={String(stats.field)} />
        <MetaStatCard label={t("kpiOwners")} value={String(stats.owners)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canManage ? (
          <Button asChild>
            <Link href="/personeel/nieuw">{t("invite")}</Link>
          </Button>
        ) : null}
      </div>

      <PageCard className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-9 pl-8"
            />
          </div>
          <select
            className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">{t("filters.roleAll")}</option>
            <option value={USER_ROLES.OWNER}>{tRoles("owner")}</option>
            <option value={USER_ROLES.OFFICE_EMPLOYEE}>
              {tRoles("office_employee")}
            </option>
            <option value={USER_ROLES.FIELD_EMPLOYEE}>
              {tRoles("field_employee")}
            </option>
          </select>
        </div>
      </PageCard>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {filtered.length === 0 ? (
        <PageCard className="px-5 py-8 text-sm text-muted-foreground">
          {members.length === 0 ? t("empty") : t("emptyFiltered")}
        </PageCard>
      ) : (
        <PageCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[36rem]">
              <thead>
                <tr>
                  <th>{t("columns.name")}</th>
                  <th>{t("columns.email")}</th>
                  <th>{t("columns.role")}</th>
                  <th>{t("columns.joined")}</th>
                  <th>{t("columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => {
                  const canEdit =
                    canManage &&
                    (member.role !== USER_ROLES.OWNER ||
                      member.id === currentUserId);
                  const canRemove =
                    canManage &&
                    member.role !== USER_ROLES.OWNER &&
                    member.id !== currentUserId;

                  return (
                    <tr key={member.id}>
                      <td>
                        {canEdit ? (
                          <Link
                            href={`/personeel/${member.id}`}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {member.name}
                          </Link>
                        ) : (
                          <span className="font-medium">{member.name}</span>
                        )}
                        {member.id === currentUserId ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {t("you")}
                          </span>
                        ) : null}
                      </td>
                      <td className="text-muted-foreground">
                        {member.email || "—"}
                      </td>
                      <td>
                        <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {tRoles(member.role)}
                        </span>
                      </td>
                      <td className="text-muted-foreground">
                        {member.createdAt.slice(0, 10)}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {canEdit ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <Link href={`/personeel/${member.id}`}>
                                {t("open")}
                              </Link>
                            </Button>
                          ) : null}
                          {canRemove ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              disabled={isPending && pendingId === member.id}
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    t("deleteConfirm", { name: member.name }),
                                  )
                                ) {
                                  return;
                                }
                                setError(null);
                                setPendingId(member.id);
                                startTransition(() => {
                                  void (async () => {
                                    try {
                                      const response = await fetch(
                                        `/api/staff?id=${encodeURIComponent(member.id)}`,
                                        {
                                          method: "DELETE",
                                          signal: AbortSignal.timeout(20_000),
                                        },
                                      );
                                      const result = (await response.json()) as {
                                        error?: string;
                                      };
                                      if (!response.ok || result.error) {
                                        setError(
                                          result.error === "cannot_remove_owner"
                                            ? t("errors.cannotRemoveOwner")
                                            : result.error ===
                                                "cannot_remove_self"
                                              ? t("errors.cannotRemoveSelf")
                                              : result.error || tCommon("error"),
                                        );
                                        return;
                                      }
                                      router.refresh();
                                    } catch {
                                      setError(tCommon("error"));
                                    } finally {
                                      setPendingId(null);
                                    }
                                  })();
                                });
                              }}
                            >
                              {t("remove")}
                            </Button>
                          ) : null}
                          {!canEdit && !canRemove ? (
                            <span className="text-muted-foreground">—</span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PageCard>
      )}
    </div>
  );
}
