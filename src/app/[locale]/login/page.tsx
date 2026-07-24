import { getTranslations, setRequestLocale } from "next-intl/server";

import { LoginForm } from "@/features/auth/components/login-form";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="mb-8 w-full max-w-sm text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{t("loginTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("loginSubtitle")}</p>
      </div>
      <LoginForm />
      <p className="mt-8 text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/onboarding" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t("startOnboarding")}
        </Link>
      </p>
    </main>
  );
}
