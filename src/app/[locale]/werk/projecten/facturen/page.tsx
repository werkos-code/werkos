import { getTranslations, setRequestLocale } from "next-intl/server";

import { InvoicesWorkspace } from "@/features/invoices/components/invoices-workspace";
import { listInvoices } from "@/features/invoices/invoices-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function FacturenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("invoices");
  const result = await listInvoices();

  return (
    <ShellPage title={t("title")} contentClassName="max-w-none w-[94%]">
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <InvoicesWorkspace
          invoices={result.invoices ?? []}
          projects={result.projects ?? []}
          customers={result.customers ?? []}
        />
      )}
    </ShellPage>
  );
}
