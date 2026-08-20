"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useOrgAccessOptional } from "@/features/billing/components/org-access-provider";
import { Link } from "@/i18n/navigation";

function hasPaidSubscription(status: string) {
  return status === "active" || status === "past_due";
}

/**
 * Sidebar upgrade prompt: visible for trial + expired/read-only orgs.
 * Hidden only when the org has a paid subscription (active / past_due).
 */
export function SidebarTrialCard() {
  const t = useTranslations("billing.trialCard");
  const ctx = useOrgAccessOptional();
  if (!ctx) return null;

  const { access } = ctx;
  if (hasPaidSubscription(access.status)) return null;

  const days = access.trialDaysRemaining;
  const expired = access.isTrialExpired || !access.canWrite;
  const urgent = !expired && days != null && days <= 3;

  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3">
      <p className="text-[11px] font-medium tracking-wide text-sidebar-muted uppercase">
        {expired ? t("expiredTitle") : t("title")}
      </p>
      <p className="mt-1 text-sm font-medium text-white">
        {expired
          ? t("expiredHeadline")
          : days == null
            ? t("subscribeHint")
            : urgent
              ? t("daysUrgent", { days })
              : t("daysLeft", { days })}
      </p>
      {urgent || expired ? (
        <p className="mt-1 text-xs text-sidebar-muted">
          {expired ? t("expiredHint") : t("urgentHint")}
        </p>
      ) : null}
      <Button
        asChild
        size="sm"
        className="mt-3 h-9 w-full border-0 bg-linear-to-r from-[#EA580C] to-[#F59E0B] text-xs font-medium text-white shadow-none hover:from-[#C2410C] hover:to-[#D97706]"
      >
        <Link href="/instellingen/abonnement/kiezen">{t("cta")}</Link>
      </Button>
    </div>
  );
}
