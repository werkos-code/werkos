import { getTranslations, setRequestLocale } from "next-intl/server";

import { NewAssignmentWizard } from "@/features/assignments/components/new-assignment-wizard";
import { listArticles } from "@/features/materials/materials-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function NieuweOpdrachtPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("assignment");
  const articlesResult = await listArticles();

  return (
    <ShellPage
      title={t("pageTitle")}
      backHref="/projecten"
      contentClassName="max-w-none w-[94%]"
    >
      <NewAssignmentWizard articles={articlesResult.articles ?? []} />
    </ShellPage>
  );
}
