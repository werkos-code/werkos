import { ArrowLeft, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ORGANIZATION_ROLES } from "@/config/roles";
import { ImpersonateUserButton } from "@/features/platform/components/impersonate-user-button";
import type { PlatformAccountDetail } from "@/features/platform/accounts-actions";
import { MetaStatCard, PageCard } from "@/features/shell/components/page-card";
import { Link } from "@/i18n/navigation";
import type { OrganizationRole, SubscriptionStatus } from "@/types/database";

type AccountDetailPanelProps = {
  account: PlatformAccountDetail;
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

function stripeCustomerUrl(customerId: string) {
  return `https://dashboard.stripe.com/customers/${customerId}`;
}

function stripeSubscriptionUrl(subscriptionId: string) {
  return `https://dashboard.stripe.com/subscriptions/${subscriptionId}`;
}

export async function AccountDetailPanel({
  account,
  locale,
}: AccountDetailPanelProps) {
  const t = await getTranslations("platform.accounts");
  const tUsers = await getTranslations("platform.users.roles");
  const tBilling = await getTranslations("billingSettings.status");
  const tShell = await getTranslations("shell");

  const status = account.subscription?.status ?? null;
  const statusLabel = status ? tBilling(status) : t("noSubscription");

  const membersByRole = ORGANIZATION_ROLES.map((role) => ({
    role,
    members: account.members.filter((member) => member.role === role),
  })).filter((group) => group.members.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-3" asChild>
          <Link href="/platform/admin/accounts">
            <ArrowLeft className="size-4" />
            {tShell("back")}
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {account.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{account.slug}</p>
          </div>
          <Badge variant={statusBadgeVariant(status)}>{statusLabel}</Badge>
        </div>
        {account.owner ? (
          <ImpersonateUserButton
            targetUserId={account.owner.id}
            organizationId={account.id}
            label={t("detail.impersonateOwner")}
          />
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetaStatCard
          label={t("detail.kpi.members")}
          value={String(account.totalMembers)}
        />
        <MetaStatCard
          label={t("detail.kpi.officeSeats")}
          value={
            account.subscription
              ? String(account.subscription.officeSeats)
              : "—"
          }
        />
        <MetaStatCard
          label={t("detail.kpi.fieldSeats")}
          value={
            account.subscription
              ? String(account.subscription.fieldSeats)
              : "—"
          }
        />
        <MetaStatCard
          label={t("detail.kpi.paidSince")}
          value={formatDate(account.subscriptionStartedAt, locale)}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t("detail.sections.members")}
        </h2>
        {membersByRole.length === 0 ? (
          <PageCard className="px-5 py-8 text-sm text-muted-foreground">
            {t("detail.membersEmpty")}
          </PageCard>
        ) : (
          membersByRole.map(({ role, members }) => (
            <PageCard key={role} className="overflow-hidden">
              <div className="border-b border-border/60 px-5 py-3">
                <h3 className="text-sm font-medium text-foreground">
                  {tUsers(role as OrganizationRole)}
                  <span className="ml-2 font-normal text-muted-foreground">
                    ({members.length})
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table min-w-[36rem]">
                  <thead>
                    <tr>
                      <th>{t("detail.columns.name")}</th>
                      <th>{t("detail.columns.email")}</th>
                      <th>{t("detail.columns.joined")}</th>
                      <th>{t("detail.columns.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={`${member.userId}-${member.role}`}>
                        <td className="text-foreground">
                          <Link
                            href={`/platform/admin/gebruikers/${member.userId}`}
                            className="hover:text-primary"
                          >
                            {member.fullName || "—"}
                          </Link>
                        </td>
                        <td className="text-muted-foreground">
                          {member.email || "—"}
                        </td>
                        <td className="text-muted-foreground">
                          {formatDate(member.joinedAt, locale)}
                        </td>
                        <td>
                          <ImpersonateUserButton
                            targetUserId={member.userId}
                            organizationId={account.id}
                            variant="ghost"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PageCard>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t("detail.sections.subscription")}
        </h2>
        <PageCard className="space-y-4 p-5">
          {!account.subscription ? (
            <p className="text-sm text-muted-foreground">
              {t("detail.subscriptionEmpty")}
            </p>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("detail.fields.status")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">{statusLabel}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("detail.fields.trialEnds")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatDate(account.subscription.trialEndsAt, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("detail.fields.periodEnd")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatDate(account.subscription.currentPeriodEnd, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("detail.fields.cancelAtPeriodEnd")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {account.subscription.cancelAtPeriodEnd
                    ? t("detail.yes")
                    : t("detail.no")}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("detail.fields.stripeCustomer")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {account.subscription.stripeCustomerId ? (
                    <a
                      href={stripeCustomerUrl(
                        account.subscription.stripeCustomerId,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {account.subscription.stripeCustomerId}
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  {t("detail.fields.stripeSubscription")}
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {account.subscription.stripeSubscriptionId ? (
                    <a
                      href={stripeSubscriptionUrl(
                        account.subscription.stripeSubscriptionId,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {account.subscription.stripeSubscriptionId}
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          )}
        </PageCard>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">
          {t("detail.sections.attribution")}
        </h2>
        <PageCard className="space-y-4 p-5">
          {!account.owner ? (
            <p className="text-sm text-muted-foreground">
              {t("detail.noOwner")}
            </p>
          ) : !account.ownerAttribution ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t("detail.attributionHint", {
                  name: account.owner.fullName || account.owner.email,
                })}
              </p>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {t("detail.fields.signupAt")}
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {formatDate(account.ownerAttribution.signupAt, locale, true)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {t("detail.fields.firstTouchAt")}
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {formatDate(
                      account.ownerAttribution.firstTouchAt,
                      locale,
                      true,
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    gclid
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {account.ownerAttribution.gclid || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    utm_source
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {account.ownerAttribution.utmSource || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    utm_medium
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {account.ownerAttribution.utmMedium || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    utm_campaign
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {account.ownerAttribution.utmCampaign || "—"}
                  </dd>
                </div>
              </dl>
            </>
          )}
        </PageCard>
      </section>
    </div>
  );
}
