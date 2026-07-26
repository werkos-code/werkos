import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { CustomersTable } from "@/features/customers/components/customers-table";
import { listCustomers } from "@/features/customers/customers-actions";
import { ShellPage } from "@/features/shell/components/shell-page";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function BedrijfKlantenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("customers");
  const result = await listCustomers();

  return (
    <ShellPage title={t("title")} description={t("description")}>
      <div className="mb-6">
        <Button asChild>
          <Link href="/bedrijf/klanten/nieuw">{t("newCustomer")}</Link>
        </Button>
      </div>
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <CustomersTable customers={result.customers ?? []} />
      )}
    </ShellPage>
  );
}
