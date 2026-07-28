import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { SubcontractorsTable } from "@/features/subcontractors/components/subcontractors-table";
import { listSubcontractors } from "@/features/subcontractors/subcontractors-actions";
import { ShellPage } from "@/features/shell/components/shell-page";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function OnderaannemersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("subcontractors");
  const result = await listSubcontractors();

  return (
    <ShellPage title={t("title")}>
      <div className="mb-6">
        <Button asChild>
          <Link href="/onderaannemers/nieuw">{t("newSubcontractor")}</Link>
        </Button>
      </div>
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <SubcontractorsTable subcontractors={result.subcontractors ?? []} />
      )}
    </ShellPage>
  );
}
