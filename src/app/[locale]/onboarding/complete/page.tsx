import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OnboardingStepFrame } from "@/features/onboarding/components/onboarding-step-frame";
import { userHasOrganization } from "@/features/onboarding/actions";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string }> };

export default async function OnboardingCompletePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/onboarding/account", locale });
  if (!(await userHasOrganization())) {
    redirect({ href: "/onboarding/company", locale });
  }

  const t = await getTranslations("onboarding.complete");

  return (
    <OnboardingStepFrame
      step={2}
      hideProgress
      icon={Sparkles}
      title={t("title")}
      description={t("description")}
    >
      <Button asChild size="lg" className="h-11 w-full">
        <Link href="/dashboard">{t("cta")}</Link>
      </Button>
    </OnboardingStepFrame>
  );
}
