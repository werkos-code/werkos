"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { useRouter } from "@/i18n/navigation";

export function LogoutButton() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await logoutAction();
          router.replace("/login");
          router.refresh();
        });
      }}
    >
      {t("logout")}
    </Button>
  );
}
