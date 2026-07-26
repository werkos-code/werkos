import { getTranslations, setRequestLocale } from "next-intl/server";

import { ArticlesWorkspace } from "@/features/materials/components/articles-workspace";
import { listArticles } from "@/features/materials/materials-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function ArtikelenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("materials.articles");
  const result = await listArticles();

  return (
    <ShellPage title={t("title")} contentClassName="max-w-none w-[94%]">
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <ArticlesWorkspace articles={result.articles ?? []} />
      )}
    </ShellPage>
  );
}
