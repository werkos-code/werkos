"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { stopImpersonation } from "@/features/platform/impersonation-actions";

type ImpersonationBannerProps = {
  targetName: string;
  targetEmail: string;
  organizationName: string;
  returnHref?: string;
  variant?: "default" | "cockpit";
};

export function ImpersonationBanner({
  targetName,
  targetEmail,
  organizationName,
  returnHref,
  variant = "default",
}: ImpersonationBannerProps) {
  const t = useTranslations("platform.impersonation");
  const [isPending, startTransition] = useTransition();
  const isCockpit = variant === "cockpit";

  return (
    <div
      className={
        isCockpit
          ? "admin-cockpit-impersonation sticky top-0 z-50 px-5 py-2.5 print:hidden lg:px-10"
          : "sticky top-0 z-50 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 print:hidden"
      }
    >
      <div
        className={
          isCockpit
            ? "mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-3"
            : "mx-auto flex w-[90%] flex-wrap items-center justify-between gap-3"
        }
      >
        <div
          className={
            isCockpit
              ? "flex min-w-0 items-start gap-2 text-sm text-amber-100"
              : "flex min-w-0 items-start gap-2 text-sm text-foreground"
          }
        >
          <ShieldAlert
            className={
              isCockpit
                ? "mt-0.5 size-4 shrink-0 text-amber-300"
                : "mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400"
            }
          />
          <p className="min-w-0">
            {t("banner", {
              name: targetName,
              email: targetEmail,
              organization: organizationName,
            })}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={
            isCockpit
              ? "shrink-0 border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
              : "shrink-0 border-amber-500/40 bg-background/80"
          }
          disabled={isPending}
          onClick={() => {
            startTransition(() => {
              void stopImpersonation({ returnHref });
            });
          }}
        >
          {t("stop")}
        </Button>
      </div>
    </div>
  );
}
