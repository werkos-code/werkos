import { getTranslations, setRequestLocale } from "next-intl/server";

import { StockWorkspace } from "@/features/materials/components/stock-workspace";
import {
  listArticles,
  listStockBalances,
  listStockLocations,
  listStockMovements,
} from "@/features/materials/materials-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function VoorraadPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("materials.stock");
  const [locations, balances, movements, articles] = await Promise.all([
    listStockLocations(),
    listStockBalances(),
    listStockMovements(),
    listArticles(),
  ]);

  const error =
    locations.error ||
    balances.error ||
    movements.error ||
    articles.error;

  return (
    <ShellPage title={t("title")} contentClassName="max-w-none w-[94%]">
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <StockWorkspace
          locations={locations.locations ?? []}
          balances={balances.balances ?? []}
          movements={movements.movements ?? []}
          articles={articles.articles ?? []}
        />
      )}
    </ShellPage>
  );
}
