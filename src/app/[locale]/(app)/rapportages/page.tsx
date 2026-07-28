import { getTranslations, setRequestLocale } from "next-intl/server";

import { ReportsWorkspace } from "@/features/reports/components/reports-workspace";
import { loadReportsSnapshot } from "@/features/reports/reports-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function RapportagesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("reports");
  const result = await loadReportsSnapshot();

  return (
    <ShellPage title={t("title")}>
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : result.snapshot ? (
        <ReportsWorkspace snapshot={result.snapshot} />
      ) : null}
    </ShellPage>
  );
}
