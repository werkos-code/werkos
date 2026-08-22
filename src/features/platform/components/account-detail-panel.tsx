import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { ORGANIZATION_ROLES } from "@/config/roles";
import { ImpersonateUserButton } from "@/features/platform/components/impersonate-user-button";
import type { PlatformAccountDetail } from "@/features/platform/accounts-actions";
import {
  CockpitCard,
  CockpitField,
  CockpitFieldGrid,
  CockpitKpi,
  CockpitSection,
  CockpitSubheading,
} from "@/features/platform/components/cockpit/admin-cockpit-ui";
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

  const status = account.subscription?.status ?? null;
  const statusLabel = status ? tBilling(status) : t("noSubscription");

  const membersByRole = ORGANIZATION_ROLES.map((role) => ({
    role,
    members: account.members.filter((member) => member.role === role),
  })).filter((group) => group.members.length > 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{account.slug}</p>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CockpitKpi
          label={t("detail.kpi.members")}
          value={String(account.totalMembers)}
        />
        <CockpitKpi
          label={t("detail.kpi.officeSeats")}
          value={
            account.subscription
              ? String(account.subscription.officeSeats)
              : "—"
          }
        />
        <CockpitKpi
          label={t("detail.kpi.fieldSeats")}
          value={
            account.subscription
              ? String(account.subscription.fieldSeats)
              : "—"
          }
        />
        <CockpitKpi
          label={t("detail.kpi.paidSince")}
          value={formatDate(account.subscriptionStartedAt, locale)}
        />
      </div>

      <CockpitSection title={t("detail.sections.members")}>
        {membersByRole.length === 0 ? (
          <CockpitCard className="px-5 py-8 text-sm text-slate-400">
            {t("detail.membersEmpty")}
          </CockpitCard>
        ) : (
          membersByRole.map(({ role, members }) => (
            <CockpitCard key={role} className="overflow-hidden">
              <div className="border-b border-white/10 px-5 py-3">
                <CockpitSubheading count={members.length}>
                  {tUsers(role as OrganizationRole)}
                </CockpitSubheading>
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
                        <td className="text-slate-100">
                          <Link
                            href={`/platform/admin/gebruikers/${member.userId}`}
                            className="admin-cockpit-link"
                          >
                            {member.fullName || "—"}
                          </Link>
                        </td>
                        <td className="text-slate-400">
                          {member.email || "—"}
                        </td>
                        <td className="text-slate-400">
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
            </CockpitCard>
          ))
        )}
      </CockpitSection>

      <CockpitSection title={t("detail.sections.subscription")}>
        <CockpitCard className="space-y-4 p-5">
          {!account.subscription ? (
            <p className="text-sm text-slate-400">{t("detail.subscriptionEmpty")}</p>
          ) : (
            <CockpitFieldGrid>
              <CockpitField label={t("detail.fields.status")} value={statusLabel} />
              <CockpitField
                label={t("detail.fields.trialEnds")}
                value={formatDate(account.subscription.trialEndsAt, locale)}
              />
              <CockpitField
                label={t("detail.fields.periodEnd")}
                value={formatDate(account.subscription.currentPeriodEnd, locale)}
              />
              <CockpitField
                label={t("detail.fields.cancelAtPeriodEnd")}
                value={
                  account.subscription.cancelAtPeriodEnd
                    ? t("detail.yes")
                    : t("detail.no")
                }
              />
              <div className="sm:col-span-2">
                <CockpitField
                  label={t("detail.fields.stripeCustomer")}
                  value={
                    account.subscription.stripeCustomerId ? (
                      <a
                        href={stripeCustomerUrl(
                          account.subscription.stripeCustomerId,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-cockpit-link inline-flex items-center gap-1"
                      >
                        {account.subscription.stripeCustomerId}
                        <ExternalLink className="size-3.5" />
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <CockpitField
                  label={t("detail.fields.stripeSubscription")}
                  value={
                    account.subscription.stripeSubscriptionId ? (
                      <a
                        href={stripeSubscriptionUrl(
                          account.subscription.stripeSubscriptionId,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-cockpit-link inline-flex items-center gap-1"
                      >
                        {account.subscription.stripeSubscriptionId}
                        <ExternalLink className="size-3.5" />
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
              </div>
            </CockpitFieldGrid>
          )}
        </CockpitCard>
      </CockpitSection>

      <CockpitSection title={t("detail.sections.attribution")}>
        <CockpitCard className="space-y-4 p-5">
          {!account.owner ? (
            <p className="text-sm text-slate-400">{t("detail.noOwner")}</p>
          ) : !account.ownerAttribution ? (
            <p className="text-sm text-slate-400">—</p>
          ) : (
            <>
              <p className="text-sm text-slate-400">
                {t("detail.attributionHint", {
                  name: account.owner.fullName || account.owner.email,
                })}
              </p>
              <CockpitFieldGrid>
                <CockpitField
                  label={t("detail.fields.signupAt")}
                  value={formatDate(account.ownerAttribution.signupAt, locale, true)}
                />
                <CockpitField
                  label={t("detail.fields.firstTouchAt")}
                  value={formatDate(
                    account.ownerAttribution.firstTouchAt,
                    locale,
                    true,
                  )}
                />
                <CockpitField
                  label="gclid"
                  value={account.ownerAttribution.gclid || "—"}
                />
                <CockpitField
                  label="utm_source"
                  value={account.ownerAttribution.utmSource || "—"}
                />
                <CockpitField
                  label="utm_medium"
                  value={account.ownerAttribution.utmMedium || "—"}
                />
                <CockpitField
                  label="utm_campaign"
                  value={account.ownerAttribution.utmCampaign || "—"}
                />
              </CockpitFieldGrid>
            </>
          )}
        </CockpitCard>
      </CockpitSection>
    </div>
  );
}
