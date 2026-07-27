import { getTranslations, setRequestLocale } from "next-intl/server";

import { SupplierForm } from "@/features/suppliers/components/supplier-form";
import { PageCard } from "@/features/shell/components/page-card";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function NewSupplierPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("suppliers");

  return (
    <ShellPage title={t("newTitle")} backHref="/leveranciers">
      <p className="mb-6 text-sm text-muted-foreground">{t("newDescription")}</p>
      <PageCard className="max-w-lg p-5">
        <SupplierForm mode="create" />
      </PageCard>
    </ShellPage>
  );
}
