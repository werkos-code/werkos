import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { OnboardingProgress } from "@/features/onboarding/components/onboarding-progress";
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
    redirect({ href: "/onboarding/provisioning", locale });
  }

  const t = await getTranslations("onboarding.complete");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <OnboardingProgress current={7} />
      <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        {t("description")}
      </p>
      <Button asChild size="lg" className="mt-10">
        <Link href="/werk">{t("cta")}</Link>
      </Button>
    </main>
  );
}
