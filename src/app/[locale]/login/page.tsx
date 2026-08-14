import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthEntryShell } from "@/features/auth/components/auth-entry-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { PageCard } from "@/features/shell/components/page-card";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <AuthEntryShell websiteLabel={t("backToWebsite")}>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("loginTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("loginSubtitle")}
        </p>
      </header>

      <PageCard className="p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
        <LoginForm />
      </PageCard>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/onboarding"
          className="font-medium text-primary hover:underline"
        >
          {t("startOnboarding")}
        </Link>
      </p>
    </AuthEntryShell>
  );
}
