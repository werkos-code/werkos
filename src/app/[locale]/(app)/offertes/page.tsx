import { getTranslations, setRequestLocale } from "next-intl/server";

import { QuotesList } from "@/features/quotes/components/quotes-list";
import { listQuotesForOrganization } from "@/features/quotes/quotes-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function OffertesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("quotes");
  const result = await listQuotesForOrganization();

  return (
    <ShellPage title={t("listTitle")} description={t("listDescription")}>
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <QuotesList quotes={result.quotes ?? []} showProject />
      )}
    </ShellPage>
  );
}
