import { getTranslations, setRequestLocale } from "next-intl/server";

import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function InkoopPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shell.pages.purchasing");

  return <ShellPage title={t("title")} description={t("description")} />;
}
