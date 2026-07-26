import { getTranslations, setRequestLocale } from "next-intl/server";

import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function PlatformAdministrationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform.administration");

  return <ShellPage title={t("title")} description={t("description")} />;
}
