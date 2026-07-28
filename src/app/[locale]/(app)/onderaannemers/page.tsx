import { getTranslations, setRequestLocale } from "next-intl/server";

import { SubcontractorsWorkspace } from "@/features/subcontractors/components/subcontractors-workspace";
import { listSubcontractors } from "@/features/subcontractors/subcontractors-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function OnderaannemersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("subcontractors");
  const result = await listSubcontractors();

  return (
    <ShellPage title={t("title")}>
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <SubcontractorsWorkspace
          subcontractors={result.subcontractors ?? []}
        />
      )}
    </ShellPage>
  );
}
