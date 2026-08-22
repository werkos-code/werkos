"use client";

import { Building2, ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { PlatformAccountRow } from "@/features/platform/accounts-actions";
import {
  CockpitCard,
  CockpitFilterChip,
  CockpitKpi,
} from "@/features/platform/components/cockpit/admin-cockpit-ui";
import { Link } from "@/i18n/navigation";
import type { SubscriptionStatus } from "@/types/database";

type AccountsWorkspaceProps = {
  accounts: PlatformAccountRow[];
};

type StatusFilter = "all" | SubscriptionStatus | "no_subscription";

function formatDate(iso: string | null | undefined, locale: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function statusBadgeVariant(
  status: SubscriptionStatus | null,
): "default" | "secondary" | "success" | "outline" | "destructive" {
  if (!status) return "outline";
  switch (status) {
    case "active":
      return "success";
    case "trialing":
      return "default";
    case "past_due":
    case "unpaid":
      return "destructive";
    case "canceled":
    case "incomplete_expired":
      return "outline";
    default:
      return "secondary";
  }
}

export function AccountsWorkspace({ accounts }: AccountsWorkspaceProps) {
  const t = useTranslations("platform.accounts");
  const tBilling = useTranslations("billingSettings.status");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const stats = useMemo(() => {
    const active = accounts.filter((a) => a.subscription?.status === "active")
      .length;
    const trialing = accounts.filter(
      (a) => a.subscription?.status === "trialing",
    ).length;
    const stripeLinked = accounts.filter(
      (a) => Boolean(a.subscription?.stripeSubscriptionId),
    ).length;
    return {
      total: accounts.length,
      active,
      trialing,
      stripeLinked,
    };
  }, [accounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((account) => {
      if (statusFilter === "no_subscription") {
        if (account.subscription) return false;
      } else if (statusFilter !== "all") {
        if (account.subscription?.status !== statusFilter) return false;
      }

      if (!q) return true;
      const haystack = [
        account.name,
        account.slug,
        account.owner?.email ?? "",
        account.owner?.fullName ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [accounts, query, statusFilter]);

  const statusFilters: StatusFilter[] = [
    "all",
    "active",
    "trialing",
    "past_due",
    "canceled",
    "no_subscription",
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CockpitKpi label={t("kpi.total")} value={String(stats.total)} />
        <CockpitKpi
          label={t("kpi.active")}
          value={String(stats.active)}
          accent="emerald"
        />
        <CockpitKpi label={t("kpi.trialing")} value={String(stats.trialing)} />
        <CockpitKpi
          label={t("kpi.stripeLinked")}
          value={String(stats.stripeLinked)}
        />
      </div>

      <CockpitCard className="space-y-3 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="border-white/10 bg-slate-950/50 pl-9 text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {statusFilters.map((filter) => (
              <CockpitFilterChip
                key={filter}
                active={statusFilter === filter}
                onClick={() => setStatusFilter(filter)}
              >
                {filter === "all"
                  ? t("filters.all")
                  : filter === "no_subscription"
                    ? t("filters.noSubscription")
                    : tBilling(filter)}
              </CockpitFilterChip>
            ))}
          </div>
        </div>
      </CockpitCard>

      {filtered.length === 0 ? (
        <CockpitCard className="px-5 py-10 text-sm text-slate-400">
          {t("empty")}
        </CockpitCard>
      ) : (
        <CockpitCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[48rem]">
              <thead>
                <tr>
                  <th>{t("columns.account")}</th>
                  <th>{t("columns.owner")}</th>
                  <th>{t("columns.status")}</th>
                  <th>{t("columns.members")}</th>
                  <th>{t("columns.stripe")}</th>
                  <th>{t("columns.created")}</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((account) => {
                  const status = account.subscription?.status ?? null;
                  const statusLabel = status
                    ? tBilling(status)
                    : t("noSubscription");

                  return (
                    <tr key={account.id} className="group align-top">
                      <td>
                        <Link
                          href={`/platform/admin/accounts/${account.id}`}
                          className="admin-cockpit-link flex items-start gap-2 font-medium"
                        >
                          <Building2 className="mt-0.5 size-4 shrink-0 text-slate-500" />
                          <span>
                            {account.name}
                            <span className="mt-0.5 block text-xs font-normal text-slate-500">
                              {account.slug}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="text-slate-400">
                        {account.owner ? (
                          <span>
                            {account.owner.fullName || "—"}
                            {account.owner.email ? (
                              <span className="mt-0.5 block text-xs">
                                {account.owner.email}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <Badge variant={statusBadgeVariant(status)}>
                          {statusLabel}
                        </Badge>
                      </td>
                      <td className="text-slate-400">{account.totalMembers}</td>
                      <td className="text-slate-400">
                        {account.subscription?.stripeSubscriptionId
                          ? t("stripeLinkedYes")
                          : account.subscription?.stripeCustomerId
                            ? t("stripeCustomerOnly")
                            : "—"}
                      </td>
                      <td className="text-slate-400">
                        {formatDate(account.createdAt, "nl-NL")}
                      </td>
                      <td className="w-8">
                        <Link
                          href={`/platform/admin/accounts/${account.id}`}
                          className="inline-flex text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-cyan-300"
                          aria-label={t("openAccount", { name: account.name })}
                        >
                          <ChevronRight className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CockpitCard>
      )}
    </div>
  );
}
