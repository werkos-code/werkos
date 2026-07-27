import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { QuotePreview } from "@/features/quotes/components/quote-preview";
import { getQuote } from "@/features/quotes/quotes-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string; projectId: string; quoteId: string }>;
};

export default async function QuotePreviewPage({ params }: Props) {
  const { locale, projectId, quoteId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("quotes");
  const result = await getQuote(quoteId);

  if (result.error === "not_found" || !result.quote) {
    notFound();
  }

  if (result.quote.projectId !== projectId) {
    notFound();
  }

  return (
    <ShellPage
      title={t("preview.pageTitle")}
      backHref={`/projecten/${projectId}/offertes/${quoteId}`}
      contentClassName="max-w-none w-[94%]"
    >
      <QuotePreview quote={result.quote} />
    </ShellPage>
  );
}
