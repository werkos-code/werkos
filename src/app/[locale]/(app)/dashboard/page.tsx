import { getTranslations, setRequestLocale } from "next-intl/server";

import { ComingSoonPanel } from "@/features/shell/components/coming-soon-panel";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function WerkDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("shell.pages.dashboard");

  return (
    <ShellPage title={t("title")}>
      <ComingSoonPanel message={t("description")} />
    </ShellPage>
  );
}
