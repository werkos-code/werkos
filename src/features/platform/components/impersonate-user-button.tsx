"use client";

import { LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { startImpersonation } from "@/features/platform/impersonation-actions";

type ImpersonateUserButtonProps = {
  targetUserId: string;
  organizationId: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
};

export function ImpersonateUserButton({
  targetUserId,
  organizationId,
  label,
  variant = "outline",
  size = "sm",
}: ImpersonateUserButtonProps) {
  const t = useTranslations("platform.impersonation");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(t("confirm"))) return;
          setError(null);
          startTransition(() => {
            void (async () => {
              const result = await startImpersonation({
                targetUserId,
                organizationId,
              });
              if (result?.error) {
                setError(
                  result.error === "cannot_impersonate_super_admin"
                    ? t("cannotImpersonateSuperAdmin")
                    : result.error === "membership_not_found"
                      ? t("membershipNotFound")
                      : result.error,
                );
              }
            })();
          });
        }}
      >
        <LogIn className="size-4" />
        {label ?? t("start")}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
