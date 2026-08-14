import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthEntryShell } from "@/features/auth/components/auth-entry-shell";
import { HomeUsps } from "@/features/auth/components/home-usps";
import { PageCard } from "@/features/shell/components/page-card";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tAuth = await getTranslations("auth");

  return (
    <AuthEntryShell websiteLabel={tAuth("backToWebsite")}>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("description")}
        </p>
      </header>

      <PageCard className="p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/onboarding">{t("ctaStart")}</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/login">{t("ctaLogin")}</Link>
          </Button>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("trialNote")}
        </p>
      </PageCard>

      <HomeUsps />
    </AuthEntryShell>
  );
}
