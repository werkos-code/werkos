"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { userHasOrganization } from "@/features/onboarding/actions";
import { syncProvisioningFromCheckoutSession } from "@/features/onboarding/sync-provisioning-action";
import { useRouter } from "@/i18n/navigation";

const STEPS = ["company", "team", "environment", "almost"] as const;

type ProvisioningViewProps = {
  sessionId?: string | null;
};

export function ProvisioningView({ sessionId }: ProvisioningViewProps) {
  const t = useTranslations("onboarding.provisioning");
  const router = useRouter();
  const [visibleCount, setVisibleCount] = useState(1);
  const [failed, setFailed] = useState(false);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  useEffect(() => {
    const reveal = window.setInterval(() => {
      setVisibleCount((count) => Math.min(count + 1, STEPS.length));
    }, 700);

    let cancelled = false;
    let attempts = 0;

    const finish = () => {
      if (cancelled) return;
      setVisibleCount(STEPS.length);
      router.replace("/onboarding/complete");
      router.refresh();
    };

    const trySyncFromSession = async () => {
      if (!sessionId) return false;
      const result = await syncProvisioningFromCheckoutSession(sessionId);
      if (result.ready) return true;
      if (result.error) setErrorDetail(result.error);
      return false;
    };

    void (async () => {
      // Immediate fallback: don't wait only for the webhook
      if (await trySyncFromSession()) {
        window.clearInterval(reveal);
        finish();
        return;
      }
      if (await userHasOrganization()) {
        window.clearInterval(reveal);
        finish();
      }
    })();

    const poll = window.setInterval(async () => {
      attempts += 1;

      if (await trySyncFromSession()) {
        window.clearInterval(poll);
        window.clearInterval(reveal);
        finish();
        return;
      }

      const ready = await userHasOrganization();
      if (ready) {
        window.clearInterval(poll);
        window.clearInterval(reveal);
        finish();
        return;
      }

      if (attempts > 40) {
        window.clearInterval(poll);
        setFailed(true);
      }
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(reveal);
      window.clearInterval(poll);
    };
  }, [router, sessionId]);

  return (
    <div className="flex w-full flex-col gap-6">
      <ul className="space-y-3 text-sm">
        {STEPS.map((key, index) => (
          <li
            key={key}
            className={
              index < visibleCount
                ? "text-foreground"
                : "text-muted-foreground/50"
            }
          >
            {index < visibleCount ? "✓ " : "○ "}
            {t(key)}
          </li>
        ))}
      </ul>
      {failed ? (
        <div className="space-y-1">
          <p className="text-sm text-destructive">{t("failed")}</p>
          {errorDetail ? (
            <p className="text-xs text-muted-foreground">{errorDetail}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
