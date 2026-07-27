import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { InvoicePreview } from "@/features/invoices/components/invoice-preview";
import { getInvoice } from "@/features/invoices/invoices-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string; invoiceId: string }>;
};

export default async function InvoicePreviewPage({ params }: Props) {
  const { locale, invoiceId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("invoices");
  const result = await getInvoice(invoiceId);

  if (result.error === "not_found" || !result.invoice) {
    notFound();
  }

  return (
    <ShellPage
      title={t("preview.pageTitle")}
      backHref={`/facturen/${invoiceId}`}
      contentClassName="max-w-none w-[94%]"
    >
      <InvoicePreview invoice={result.invoice} />
    </ShellPage>
  );
}
