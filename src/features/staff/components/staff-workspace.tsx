"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEurFromCents, PRICING } from "@/config/pricing";
import { USER_ROLES } from "@/config/roles";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";
import type { StaffSeatUsage } from "@/features/staff/lib/staff-seats";
import type { StaffMemberRow } from "@/features/staff/staff-actions";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type StaffWorkspaceProps = {
  members: StaffMemberRow[];
  canManage: boolean;
  currentUserId: string;
  seats: StaffSeatUsage | null;
};

export function StaffWorkspace({
  members,
  canManage,
  currentUserId,
  seats,
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

  const officeFull = seats ? seats.officeRemaining <= 0 : false;
  const fieldFull = seats ? seats.fieldRemaining <= 0 : false;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaStatCard label={t("kpiTotal")} value={String(stats.total)} />
        <MetaStatCard
          label={t("kpiOfficeSeats")}
          value={
            seats
              ? t("seatUsage", {
                  used: seats.officeUsed,
                  included: seats.officeSeats,
                })
              : String(stats.office)
          }
          muted={officeFull}
        />
        <MetaStatCard
          label={t("kpiFieldSeats")}
          value={
            seats
              ? t("seatUsage", {
                  used: seats.fieldUsed,
                  included: seats.fieldSeats,
                })
              : String(stats.field)
          }
          muted={fieldFull}
        />
        <MetaStatCard
          label={t("kpiOwners")}
          value={t("ownerIncluded", { count: stats.owners })}
        />
      </div>

      {seats ? (
        <PageCard className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2 className="text-sm font-semibold tracking-tight">
                {t("seats.title")}
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {seats.isTrialing
                  ? t("seats.trialHint")
                  : seats.isPaid
                    ? t("seats.paidHint")
                    : t("seats.missingHint")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("seats.pricing", {
                  office: formatEurFromCents(PRICING.officeSeatMonthlyCents),
                  field: formatEurFromCents(PRICING.fieldSeatMonthlyCents),
                })}
              </p>
            </div>
            {canManage ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/instellingen/abonnement">{t("seats.managePlan")}</Link>
              </Button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SeatMeter
              label={tRoles("office_employee")}
              used={seats.officeUsed}
              included={seats.officeSeats}
              remainingLabel={
                seats.officeRemaining > 0
                  ? t("seats.remaining", { count: seats.officeRemaining })
                  : t("seats.full")
              }
              full={officeFull}
            />
            <SeatMeter
              label={tRoles("field_employee")}
              used={seats.fieldUsed}
              included={seats.fieldSeats}
              remainingLabel={
                seats.fieldRemaining > 0
                  ? t("seats.remaining", { count: seats.fieldRemaining })
                  : t("seats.full")
              }
              full={fieldFull}
            />
          </div>
        </PageCard>
      ) : null}

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

function SeatMeter({
  label,
  used,
  included,
  remainingLabel,
  full,
}: {
  label: string;
  used: number;
  included: number;
  remainingLabel: string;
  full: boolean;
}) {
  const pct =
    included <= 0 ? (used > 0 ? 100 : 0) : Math.min(100, (used / included) * 100);

  return (
    <div className="rounded-xl bg-muted/35 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p
          className={cn(
            "text-xs tabular-nums",
            full ? "text-amber-700" : "text-muted-foreground",
          )}
        >
          {remainingLabel}
        </p>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">
        {used}
        <span className="text-sm font-medium text-muted-foreground">
          {" "}
          / {included}
        </span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            full ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
