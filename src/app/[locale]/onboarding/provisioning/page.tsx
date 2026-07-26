import { getTranslations, setRequestLocale } from "next-intl/server";

import { OnboardingStepFrame } from "@/features/onboarding/components/onboarding-step-frame";
import { ProvisioningView } from "@/features/onboarding/components/provisioning-view";
import { userHasOrganization } from "@/features/onboarding/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export default async function OnboardingProvisioningPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const { session_id: sessionId } = await searchParams;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/onboarding/account", locale });

  if (await userHasOrganization()) {
    redirect({ href: "/onboarding/complete", locale });
  }

  const t = await getTranslations("onboarding.provisioning");

  return (
    <OnboardingStepFrame
      step={6}
      title={t("title")}
      description={t("waiting")}
    >
      <ProvisioningView sessionId={sessionId ?? null} />
    </OnboardingStepFrame>
  );
}
