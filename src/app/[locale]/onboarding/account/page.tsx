import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccountStepForm } from "@/features/onboarding/components/account-step-form";
import { OnboardingStepFrame } from "@/features/onboarding/components/onboarding-step-frame";

type Props = { params: Promise<{ locale: string }> };

export default async function OnboardingAccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("onboarding.account");

  return (
    <OnboardingStepFrame
      step={2}
      title={t("title")}
      description={t("description")}
      backHref="/onboarding"
    >
      <AccountStepForm />
    </OnboardingStepFrame>
  );
}
