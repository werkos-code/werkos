import { getTranslations, setRequestLocale } from "next-intl/server";

import { CustomerForm } from "@/features/customers/components/customer-form";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function NewCustomerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("customers");

  return (
    <ShellPage
      title={t("newTitle")}
      description={t("newDescription")}
      backHref="/bedrijf/klanten"
    >
      <CustomerForm mode="create" />
    </ShellPage>
  );
}
