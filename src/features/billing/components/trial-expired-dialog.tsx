"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOrgAccess } from "@/features/billing/components/org-access-provider";
import { Link } from "@/i18n/navigation";

export function TrialExpiredDialog() {
  const t = useTranslations("billing.trialExpired");
  const { trialExpiredOpen, dismissTrialExpired, access } = useOrgAccess();

  if (access.canWrite || !access.isTrialExpired) return null;

  return (
    <Dialog
      open={trialExpiredOpen}
      onOpenChange={(open) => {
        if (!open) dismissTrialExpired();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="space-y-3 text-left">
            <span className="block">{t("body")}</span>
            <span className="block text-xs text-muted-foreground">
              {t("hint")}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button asChild onClick={dismissTrialExpired}>
            <Link href="/instellingen/abonnement/kiezen">{t("cta")}</Link>
          </Button>
          <Button type="button" variant="ghost" onClick={dismissTrialExpired}>
            {t("dismiss")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
