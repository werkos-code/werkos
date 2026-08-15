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

export function SubscriptionPaywallDialog() {
  const t = useTranslations("billing.paywall");
  const { paywallOpen, closePaywall, paywallContextKey } = useOrgAccess();

  return (
    <Dialog
      open={paywallOpen}
      onOpenChange={(open) => {
        if (!open) closePaywall();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {paywallContextKey === "newProject"
              ? t("contexts.newProject")
              : t("description")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button asChild onClick={closePaywall}>
            <Link href="/instellingen/abonnement/kiezen">{t("cta")}</Link>
          </Button>
          <Button type="button" variant="ghost" onClick={closePaywall}>
            {t("dismiss")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
