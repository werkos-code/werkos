import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccountStepForm } from "@/features/onboarding/components/account-step-form";
import { OnboardingProgress } from "@/features/onboarding/components/onboarding-progress";

type Props = { params: Promise<{ locale: string }> };

export default async function OnboardingAccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("onboarding.account");

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <OnboardingProgress current={2} />
      <div className="mb-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>
      <AccountStepForm />
    </main>
  );
}
