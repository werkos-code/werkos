import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { CustomerForm } from "@/features/customers/components/customer-form";
import { getCustomer } from "@/features/customers/customers-actions";
import { ShellPage } from "@/features/shell/components/shell-page";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string; customerId: string }>;
};

export default async function CustomerDetailPage({ params }: Props) {
  const { locale, customerId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("customers");
  const result = await getCustomer(customerId);

  if (result.error === "not_found" || !result.customer) {
    notFound();
  }

  const customer = result.customer;

  return (
    <ShellPage
      title={customer.name}
      description={t("detailDescription")}
      backHref="/bedrijf/klanten"
    >
      <p className="mb-6 text-sm text-muted-foreground">
        {t("projectCount", { count: customer.projectCount })}
        {customer.projectCount > 0 ? (
          <>
            {" · "}
            <Link href="/werk/projecten" className="text-foreground underline">
              {t("openInWerk")}
            </Link>
          </>
        ) : null}
      </p>
      <CustomerForm mode="edit" initial={customer} />
    </ShellPage>
  );
}
