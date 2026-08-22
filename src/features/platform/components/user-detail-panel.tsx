import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { USER_ROLES } from "@/config/roles";
import type { PlatformUserDetail } from "@/features/platform/users-actions";
import { ImpersonateUserButton } from "@/features/platform/components/impersonate-user-button";
import {
  CockpitCard,
  CockpitField,
  CockpitFieldGrid,
  CockpitKpi,
  CockpitSection,
} from "@/features/platform/components/cockpit/admin-cockpit-ui";
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

  const isSuperAdmin = user.platformRole === USER_ROLES.SUPER_ADMIN;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{user.email}</p>
        </div>
        {isSuperAdmin ? (
          <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-100">
            {t(`roles.${USER_ROLES.SUPER_ADMIN}`)}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CockpitKpi
          label={t("detail.kpi.created")}
          value={formatDate(user.createdAt, locale, true)}
        />
        <CockpitKpi
          label={t("detail.kpi.signup")}
          value={formatDate(user.signupAt, locale, true)}
        />
        <CockpitKpi
          label={t("detail.kpi.memberships")}
          value={String(user.memberships.length)}
        />
        <CockpitKpi
          label={t("detail.kpi.paid")}
          value={formatDate(user.subscriptionStartedAt, locale)}
        />
      </div>

      <CockpitSection title={t("detail.sections.memberships")}>
        {user.memberships.length === 0 ? (
          <CockpitCard className="px-5 py-8 text-sm text-slate-400">
            {t("detail.membershipsEmpty")}
          </CockpitCard>
        ) : (
          <CockpitCard className="overflow-hidden">
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
                          className="admin-cockpit-link font-medium"
                        >
                          {membership.organizationName}
                        </Link>
                      </td>
                      <td className="text-slate-400">
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
          </CockpitCard>
        )}
      </CockpitSection>

      <CockpitSection title={t("detail.sections.milestones")}>
        <CockpitCard className="p-5">
          <CockpitFieldGrid>
            <CockpitField
              label={t("detail.fields.companyCreated")}
              value={formatDate(user.companyCreatedAt, locale, true)}
            />
            <CockpitField
              label={t("detail.fields.firstProject")}
              value={formatDate(user.firstProjectAt, locale, true)}
            />
            <CockpitField
              label={t("detail.fields.firstQuote")}
              value={formatDate(user.firstQuoteAt, locale, true)}
            />
            <CockpitField
              label={t("detail.fields.subscriptionStarted")}
              value={formatDate(user.subscriptionStartedAt, locale, true)}
            />
          </CockpitFieldGrid>
        </CockpitCard>
      </CockpitSection>

      <CockpitSection title={t("detail.sections.attribution")}>
        <CockpitCard className="p-5">
          <CockpitFieldGrid>
            <CockpitField
              label={t("detail.fields.firstTouch")}
              value={formatDate(user.firstTouchAt, locale, true)}
            />
            <CockpitField label="gclid" value={user.gclid || "—"} />
            <CockpitField label="utm_source" value={user.utmSource || "—"} />
            <CockpitField label="utm_medium" value={user.utmMedium || "—"} />
            <CockpitField
              label="utm_campaign"
              value={user.utmCampaign || "—"}
            />
          </CockpitFieldGrid>
        </CockpitCard>
      </CockpitSection>
    </div>
  );
}
