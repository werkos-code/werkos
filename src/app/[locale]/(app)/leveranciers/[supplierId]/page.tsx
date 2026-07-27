import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { SupplierForm } from "@/features/suppliers/components/supplier-form";
import { getSupplier } from "@/features/suppliers/suppliers-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string; supplierId: string }>;
};

export default async function SupplierDetailPage({ params }: Props) {
  const { locale, supplierId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("suppliers");
  const result = await getSupplier(supplierId);

  if (result.error === "not_found" || !result.supplier) {
    notFound();
  }

  const supplier = result.supplier;

  return (
    <ShellPage title={supplier.name} backHref="/leveranciers">
      <p className="mb-6 text-sm text-muted-foreground">
        {t("linkCount", {
          prices: supplier.priceCount,
          orders: supplier.purchaseOrderCount,
        })}
      </p>
      <PageCard className="max-w-lg p-5">
        <SupplierForm mode="edit" initial={supplier} />
      </PageCard>
    </ShellPage>
  );
}
