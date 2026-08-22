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
        className={
          variant === "ghost"
            ? "border-white/10 text-cyan-200 hover:bg-cyan-400/10 hover:text-cyan-100"
            : "border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
        }
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
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  );
}
