import { getTranslations, setRequestLocale } from "next-intl/server";

import { CustomerForm } from "@/features/customers/components/customer-form";
import { PageCard } from "@/features/shell/components/page-card";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function NewCustomerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("customers");

  return (
    <ShellPage title={t("newTitle")} backHref="/bedrijf/klanten">
      <PageCard className="max-w-lg p-5">
        <CustomerForm mode="create" />
      </PageCard>
    </ShellPage>
  );
}
