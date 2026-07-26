import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { QuoteEditor } from "@/features/quotes/components/quote-editor";
import { getQuote } from "@/features/quotes/quotes-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string; projectId: string; quoteId: string }>;
};

export default async function QuoteDetailPage({ params }: Props) {
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
      title={result.quote.title}
      description={t("editorDescription", {
        project: result.quote.projectName,
      })}
      backHref={`/werk/projecten/${projectId}`}
    >
      <QuoteEditor quote={result.quote} />
    </ShellPage>
  );
}
