import { getTranslations, setRequestLocale } from "next-intl/server";

import { PurchasingWorkspace } from "@/features/materials/components/purchasing-workspace";
import {
  listArticles,
  listPurchaseOrders,
} from "@/features/materials/materials-actions";
import { listSupplierOptions } from "@/features/suppliers/suppliers-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function InkoopPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("materials.purchasing");
  const [orders, suppliers, articles] = await Promise.all([
    listPurchaseOrders(),
    listSupplierOptions(),
    listArticles(),
  ]);

  const error = orders.error || suppliers.error || articles.error;

  return (
    <ShellPage title={t("title")} contentClassName="max-w-none w-[94%]">
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <PurchasingWorkspace
          orders={orders.orders ?? []}
          suppliers={suppliers.suppliers ?? []}
          articles={articles.articles ?? []}
        />
      )}
    </ShellPage>
  );
}
