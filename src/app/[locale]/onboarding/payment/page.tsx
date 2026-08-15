import { setRequestLocale } from "next-intl/server";

import { userHasOrganization } from "@/features/onboarding/actions";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string }> };

/** Legacy payment step — onboarding no longer collects a card. */
export default async function OnboardingPaymentPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/onboarding/account", locale });
  if (await userHasOrganization()) redirect({ href: "/dashboard", locale });

  redirect({ href: "/onboarding/team", locale });
}
