import { setRequestLocale } from "next-intl/server";

import { userHasOrganization } from "@/features/onboarding/actions";
import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string }> };

/** Legacy team/seats step — seats are chosen later under subscription settings. */
export default async function OnboardingTeamPage({ params }: Props) {
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

  redirect({ href: "/onboarding/company", locale });
}
