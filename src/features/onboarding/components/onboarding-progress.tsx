import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";

type OnboardingProgressProps = {
  current: number;
  total?: number;
};

export async function OnboardingProgress({
  current,
  total = 7,
}: OnboardingProgressProps) {
  const t = await getTranslations("onboarding");

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {t("progress", { current, total })}
        </p>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-primary">
          {String(current).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      </div>
      <div className="flex gap-1" aria-hidden="true">
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
