"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useOrgAccessOptional } from "@/features/billing/components/org-access-provider";
import { Link } from "@/i18n/navigation";

export function SidebarTrialCard() {
  const t = useTranslations("billing.trialCard");
  const ctx = useOrgAccessOptional();
  if (!ctx) return null;

  const { access } = ctx;
  if (!access.isTrialing || access.trialDaysRemaining == null) return null;

  const days = access.trialDaysRemaining;
  const urgent = days <= 3;

  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3">
      <p className="text-[11px] font-medium tracking-wide text-sidebar-muted uppercase">
        {t("title")}
      </p>
      <p className="mt-1 text-sm font-medium text-white">
        {urgent
          ? t("daysUrgent", { days })
          : t("daysLeft", { days })}
      </p>
      {urgent ? (
        <p className="mt-1 text-xs text-sidebar-muted">{t("urgentHint")}</p>
      ) : null}
      <Button
        asChild
        variant="secondary"
        size="sm"
        className="mt-3 h-8 w-full border-0 bg-white/12 text-xs text-white hover:bg-white/18"
      >
        <Link href="/instellingen/abonnement/kiezen">{t("cta")}</Link>
      </Button>
    </div>
  );
}
