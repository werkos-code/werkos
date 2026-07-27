import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { SuppliersTable } from "@/features/suppliers/components/suppliers-table";
import { listSuppliers } from "@/features/suppliers/suppliers-actions";
import { ShellPage } from "@/features/shell/components/shell-page";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function LeveranciersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("suppliers");
  const result = await listSuppliers();

  return (
    <ShellPage title={t("title")} description={t("description")}>
      <div className="mb-6">
        <Button asChild>
          <Link href="/leveranciers/nieuw">{t("newSupplier")}</Link>
        </Button>
      </div>
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <SuppliersTable suppliers={result.suppliers ?? []} />
      )}
    </ShellPage>
  );
}
