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
    <div className="mb-10 w-full max-w-md">
      <p className="mb-3 text-sm text-muted-foreground">
        {t("progress", { current, total })}
      </p>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full ${
              index < current ? "bg-foreground" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
