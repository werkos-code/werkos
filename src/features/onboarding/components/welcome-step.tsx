import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

import { OnboardingProgress } from "./onboarding-progress";

export async function WelcomeStep() {
  const t = await getTranslations("onboarding.welcome");

  return (
    <div className="flex w-full max-w-lg flex-col items-center text-center">
      <OnboardingProgress current={1} />
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">{t("description")}</p>
      <Button asChild size="lg" className="mt-10">
        <Link href="/onboarding/account">{t("cta")}</Link>
      </Button>
    </div>
  );
}
