import { getTranslations } from "next-intl/server";

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
    <div className="mb-6">
      <p className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {t("progress", { current, total })}
      </p>
      <div className="flex gap-1.5" aria-hidden="true">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            className={`h-0.5 flex-1 rounded-full ${
              index < current ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
