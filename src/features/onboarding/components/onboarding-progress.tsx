import { getTranslations } from "next-intl/server";

import { ONBOARDING_STEP_TOTAL } from "@/features/onboarding/atmosphere";
import { cn } from "@/lib/utils";

type OnboardingProgressProps = {
  current: number;
  total?: number;
  /** Tighter spacing when nested in a card header band. */
  compact?: boolean;
};

export async function OnboardingProgress({
  current,
  total = ONBOARDING_STEP_TOTAL,
  compact = false,
}: OnboardingProgressProps) {
  const t = await getTranslations("onboarding");

  return (
    <div className={cn(compact ? "space-y-2.5" : "mb-8 space-y-3")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {t("progress", { current, total })}
        </p>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-primary">
          {String(current).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              index < current ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
    </div>
  );
}
