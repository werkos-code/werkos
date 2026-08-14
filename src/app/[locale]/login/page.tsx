import { setRequestLocale } from "next-intl/server";

import { LoginPageContent } from "@/features/auth/components/login-shell";

type Props = { params: Promise<{ locale: string }> };

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LoginPageContent />;
}
