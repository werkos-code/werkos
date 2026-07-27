import { getTranslations, setRequestLocale } from "next-intl/server";

import { ArticlesWorkspace } from "@/features/materials/components/articles-workspace";
import { listArticles } from "@/features/materials/materials-actions";
import { listSupplierOptions } from "@/features/suppliers/suppliers-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function ArtikelenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("materials.articles");
  const [result, suppliers] = await Promise.all([
    listArticles(),
    listSupplierOptions(),
  ]);

  const error = result.error || suppliers.error;

  return (
    <ShellPage title={t("title")} contentClassName="max-w-none w-[94%]">
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <ArticlesWorkspace
          articles={result.articles ?? []}
          suppliers={suppliers.suppliers ?? []}
        />
      )}
    </ShellPage>
  );
}
