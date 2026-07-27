import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { InvoiceEditor } from "@/features/invoices/components/invoice-editor";
import { getInvoice } from "@/features/invoices/invoices-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string; invoiceId: string }>;
};

export default async function InvoiceDetailPage({ params }: Props) {
  const { locale, invoiceId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("invoices.editor");
  const result = await getInvoice(invoiceId);

  if (result.error === "not_found" || !result.invoice) {
    notFound();
  }

  return (
    <ShellPage
      title={t("editTitle")}
      backHref="/facturen"
      contentClassName="max-w-none w-[94%]"
    >
      <InvoiceEditor invoice={result.invoice} />
    </ShellPage>
  );
}
