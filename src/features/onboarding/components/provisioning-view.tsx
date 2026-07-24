"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { userHasOrganization } from "@/features/onboarding/actions";
import { useRouter } from "@/i18n/navigation";

const STEPS = ["company", "team", "environment", "almost"] as const;

export function ProvisioningView() {
  const t = useTranslations("onboarding.provisioning");
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(1);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const reveal = window.setInterval(() => {
      setVisibleCount((count) => Math.min(count + 1, STEPS.length));
    }, 700);

    let attempts = 0;
    const poll = window.setInterval(async () => {
      attempts += 1;
      const ready = await userHasOrganization();
      if (ready) {
        window.clearInterval(poll);
        window.clearInterval(reveal);
        setVisibleCount(STEPS.length);
        router.replace("/onboarding/complete");
        router.refresh();
        return;
      }
      if (attempts > 40) {
        window.clearInterval(poll);
        setFailed(true);
      }
    }, 1500);

    return () => {
      window.clearInterval(reveal);
      window.clearInterval(poll);
    };
  }, [router]);

  return (
    <div className="flex w-full flex-col gap-6">
      <ul className="space-y-3 text-sm">
        {STEPS.map((key, index) => (
          <li
            key={key}
            className={
              index < visibleCount ? "text-foreground" : "text-muted-foreground/50"
            }
          >
            {index < visibleCount ? "✓ " : "○ "}
            {t(key)}
          </li>
        ))}
      </ul>
      {failed ? (
        <p className="text-sm text-destructive">{t("failed")}</p>
      ) : null}
    </div>
  );
}
