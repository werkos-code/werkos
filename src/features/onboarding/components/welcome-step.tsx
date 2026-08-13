import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { OnboardingStepFrame } from "@/features/onboarding/components/onboarding-step-frame";

export async function WelcomeStep() {
  const t = await getTranslations("onboarding.welcome");

  return (
    <OnboardingStepFrame
      step={1}
      title={t("title")}
      description={t("description")}
    >
      <Button asChild size="lg" className="w-full">
        <Link href="/onboarding/account">{t("cta")}</Link>
      </Button>
    </OnboardingStepFrame>
  );
}
