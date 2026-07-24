import { setRequestLocale } from "next-intl/server";

import { WelcomeStep } from "@/features/onboarding/components/welcome-step";

type Props = { params: Promise<{ locale: string }> };

export default async function OnboardingWelcomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <WelcomeStep />;
}
