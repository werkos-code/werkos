import { getTranslations, setRequestLocale } from "next-intl/server";

import { listCustomerOptions } from "@/features/customers/customers-actions";
import { NewProjectForm } from "@/features/projects/components/new-project-form";
import { requireTenantOrganization } from "@/features/shell/lib/require-organization";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function NieuweAanvraagPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireTenantOrganization(locale);
  const t = await getTranslations("projects");
  const customers = await listCustomerOptions();

  return (
    <ShellPage
      title={t("newTitle")}
      description={t("newDescription")}
      backHref="/werk/projecten"
    >
      {customers.error ? (
        <p className="text-sm text-destructive">{customers.error}</p>
      ) : (
        <NewProjectForm customers={customers.customers ?? []} />
      )}
    </ShellPage>
  );
}
