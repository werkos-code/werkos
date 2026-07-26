import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoonPanel } from "@/features/shell/components/coming-soon-panel";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function WerkbonnenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shell.pages.workOrders");

  return (
    <ShellPage title={t("title")} backHref="/werk/projecten">
      <ComingSoonPanel message={t("description")} />
    </ShellPage>
  );
}
