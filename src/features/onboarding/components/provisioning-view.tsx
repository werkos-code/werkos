"use client";

import { Check, Circle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { userHasOrganization } from "@/features/onboarding/actions";
import { syncProvisioningFromCheckoutSession } from "@/features/onboarding/sync-provisioning-action";
import { PageCard } from "@/features/shell/components/page-card";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

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
    <PageCard className="p-5">
      <ul className="space-y-3 text-sm">
        {STEPS.map((key, index) => {
          const done = index < visibleCount;
          return (
            <li
              key={key}
              className={cn(
                "flex items-center gap-2.5",
                done ? "text-foreground" : "text-muted-foreground/50",
              )}
            >
              {done ? (
                <Check className="size-4 text-primary" />
              ) : (
                <Circle className="size-4" />
              )}
              {t(key)}
            </li>
          );
        })}
      </ul>
      {failed ? (
        <div className="mt-4 space-y-1">
          <p className="text-sm text-destructive">{t("failed")}</p>
          {errorDetail ? (
            <p className="text-xs text-muted-foreground">{errorDetail}</p>
          ) : null}
        </div>
      ) : null}
    </PageCard>
  );
}
