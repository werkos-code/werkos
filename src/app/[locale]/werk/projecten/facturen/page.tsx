import { getTranslations, setRequestLocale } from "next-intl/server";

import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function FacturenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shell.pages.invoices");

  return (
    <ShellPage
      title={t("title")}
      description={t("description")}
      backHref="/werk/projecten"
    />
  );
}
