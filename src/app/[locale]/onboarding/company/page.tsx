import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

import { CompanyStepForm } from "@/features/onboarding/components/company-step-form";
import { OnboardingStepFrame } from "@/features/onboarding/components/onboarding-step-frame";
import {
  getOnboardingDraft,
  userHasOrganization,
} from "@/features/onboarding/actions";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string }> };

export default async function OnboardingCompanyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/onboarding/account", locale });

  if (await userHasOrganization()) {
    redirect({ href: "/dashboard", locale });
  }

  const draft = await getOnboardingDraft();
  const t = await getTranslations("onboarding.company");

  return (
    <OnboardingStepFrame
      step={2}
      title={t("title")}
      description={t("description")}
      backHref="/onboarding/account"
    >
      <CompanyStepForm
        initialCompanyName={draft?.company_name ?? ""}
        initialIndustry={draft?.industry ?? ""}
        initialIndustryOther={draft?.industry_other ?? ""}
      />
    </OnboardingStepFrame>
  );
}
