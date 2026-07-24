import { getTranslations, setRequestLocale } from "next-intl/server";

import { OnboardingStepFrame } from "@/features/onboarding/components/onboarding-step-frame";
import { TeamStepForm } from "@/features/onboarding/components/team-step-form";
import {
  getOnboardingDraft,
  userHasOrganization,
} from "@/features/onboarding/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function OnboardingTeamPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/onboarding/account", locale });
  if (await userHasOrganization()) redirect({ href: "/werk", locale });

  const draft = await getOnboardingDraft();
  if (!draft?.company_name) {
    redirect({ href: "/onboarding/company", locale });
  }

  const t = await getTranslations("onboarding.team");

  return (
    <OnboardingStepFrame
      step={4}
      title={t("title")}
      description={t("description")}
      align="start"
    >
      <TeamStepForm
        initialOfficeSeats={draft!.office_seats}
        initialFieldSeats={draft!.field_seats}
      />
    </OnboardingStepFrame>
  );
}
