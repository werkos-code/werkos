import { getTranslations, setRequestLocale } from "next-intl/server";

import { SubcontractorForm } from "@/features/subcontractors/components/subcontractor-form";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function NewSubcontractorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("subcontractors");

  return (
    <ShellPage title={t("newTitle")} backHref="/onderaannemers">
      <SubcontractorForm mode="create" />
    </ShellPage>
  );
}
