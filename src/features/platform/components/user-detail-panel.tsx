import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { USER_ROLES } from "@/config/roles";
import type { PlatformUserDetail } from "@/features/platform/users-actions";
import { ImpersonateUserButton } from "@/features/platform/components/impersonate-user-button";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";
import { Link } from "@/i18n/navigation";
import type { OrganizationRole } from "@/types/database";

type UserDetailPanelProps = {
  user: PlatformUserDetail;
  locale: string;
};

function formatDate(
  iso: string | null | undefined,
  locale: string,
  withTime = false,
) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(withTime
        ? { hour: "2-digit", minute: "2-digit" }
        : {}),
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export async function UserDetailPanel({ user, locale }: UserDetailPanelProps) {
  const t = await getTranslations("platform.users");
  const tShell = await getTranslations("shell");

  const isSuperAdmin = user.platformRole === USER_ROLES.SUPER_ADMIN;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-3" asChild>
          <Link href="/platform/admin/gebruikers">
            <ArrowLeft className="size-4" />
            {tShell("back")}
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {user.fullName || user.email || "—"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          {isSuperAdmin ? (
            <Badge>{t(`roles.${USER_ROLES.SUPER_ADMIN}`)}</Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaStatCard
          label={t("detail.kpi.created")}
          value={formatDate(user.createdAt, locale, true)}
        />
        <MetaStatCard
          label={t("detail.kpi.signup")}
          value={formatDate(user.signupAt, locale, true)}
        />
        <MetaStatCard
          label={t("detail.kpi.memberships")}
          value={String(user.memberships.length)}
        />
        <MetaStatCard
          label={t("detail.kpi.paid")}
          value={formatDate(user.subscriptionStartedAt, locale)}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t("detail.sections.memberships")}
        </h2>
        {user.memberships.length === 0 ? (
          <PageCard className="px-5 py-8 text-sm text-muted-foreground">
            {t("detail.membershipsEmpty")}
          </PageCard>
        ) : (
          <PageCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="data-table min-w-[40rem]">
                <thead>
                  <tr>
                    <th>{t("detail.columns.organization")}</th>
                    <th>{t("detail.columns.role")}</th>
                    <th>{t("detail.columns.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {user.memberships.map((membership) => (
                    <tr key={`${membership.organizationId}-${membership.role}`}>
                      <td>
                        <Link
                          href={`/platform/admin/accounts/${membership.organizationId}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {membership.organizationName}
                        </Link>
                      </td>
                      <td className="text-muted-foreground">
                        {t(`roles.${membership.role as OrganizationRole}`)}
                      </td>
                      <td>
                        {!isSuperAdmin ? (
                          <ImpersonateUserButton
                            targetUserId={user.id}
                            organizationId={membership.organizationId}
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PageCard>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t("detail.sections.milestones")}
        </h2>
        <PageCard className="p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("detail.fields.companyCreated")}
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatDate(user.companyCreatedAt, locale, true)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("detail.fields.firstProject")}
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatDate(user.firstProjectAt, locale, true)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("detail.fields.firstQuote")}
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatDate(user.firstQuoteAt, locale, true)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("detail.fields.subscriptionStarted")}
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatDate(user.subscriptionStartedAt, locale, true)}
              </dd>
            </div>
          </dl>
        </PageCard>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t("detail.sections.attribution")}
        </h2>
        <PageCard className="p-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {t("detail.fields.firstTouch")}
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {formatDate(user.firstTouchAt, locale, true)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                gclid
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {user.gclid || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                utm_source
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {user.utmSource || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                utm_medium
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {user.utmMedium || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                utm_campaign
              </dt>
              <dd className="mt-1 text-sm text-foreground">
                {user.utmCampaign || "—"}
              </dd>
            </div>
          </dl>
        </PageCard>
      </section>
    </div>
  );
}
