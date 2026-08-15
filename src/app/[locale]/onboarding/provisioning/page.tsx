import { setRequestLocale } from "next-intl/server";

import { userHasOrganization } from "@/features/onboarding/actions";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

/**
 * Legacy Stripe provisioning wait page.
 * Kept for checkout success URLs from subscription upgrades; new signups skip this.
 */
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
    // Returning from upgrade checkout — go to billing settings
    if (sessionId) {
      redirect({ href: "/instellingen/abonnement", locale });
    }
    redirect({ href: "/onboarding/complete", locale });
  }

  redirect({ href: "/onboarding/team", locale });
}
