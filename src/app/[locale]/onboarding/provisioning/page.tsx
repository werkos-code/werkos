import { setRequestLocale } from "next-intl/server";

import { OnboardingProgress } from "@/features/onboarding/components/onboarding-progress";
import { ProvisioningView } from "@/features/onboarding/components/provisioning-view";
import { userHasOrganization } from "@/features/onboarding/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function OnboardingProvisioningPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/onboarding/account", locale });

  if (await userHasOrganization()) {
    redirect({ href: "/onboarding/complete", locale });
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <OnboardingProgress current={6} />
      <ProvisioningView />
    </main>
  );
}
