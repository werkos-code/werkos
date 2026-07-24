import { getTranslations, setRequestLocale } from "next-intl/server";

import { OnboardingProgress } from "@/features/onboarding/components/onboarding-progress";
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
  if (await userHasOrganization()) redirect({ href: "/werk", locale });

  const draft = await getOnboardingDraft();
  if (!draft?.company_name) {
    redirect({ href: "/onboarding/company", locale });
  }

  const t = await getTranslations("onboarding.payment");

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <OnboardingProgress current={5} />
      <div className="mb-8 w-full max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>
      <PaymentStepForm
        officeSeats={draft!.office_seats}
        fieldSeats={draft!.field_seats}
      />
    </main>
  );
}
