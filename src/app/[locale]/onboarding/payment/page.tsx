import { getTranslations, setRequestLocale } from "next-intl/server";

import { OnboardingStepFrame } from "@/features/onboarding/components/onboarding-step-frame";
import { PaymentStepForm } from "@/features/onboarding/components/payment-step-form";
import {
  getOnboardingDraft,
  userHasOrganization,
} from "@/features/onboarding/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function OnboardingPaymentPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/onboarding/account", locale });
  if (await userHasOrganization()) redirect({ href: "/dashboard", locale });

  const draft = await getOnboardingDraft();
  if (!draft?.company_name) {
    redirect({ href: "/onboarding/company", locale });
  }

  const t = await getTranslations("onboarding.payment");

  return (
    <OnboardingStepFrame
      step={5}
      title={t("title")}
      description={t("description")}
      backHref="/onboarding/team"
    >
      <PaymentStepForm
        officeSeats={draft!.office_seats}
        fieldSeats={draft!.field_seats}
      />
    </OnboardingStepFrame>
  );
}
