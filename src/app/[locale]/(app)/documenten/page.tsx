import { getTranslations, setRequestLocale } from "next-intl/server";

import { FilesWorkspace } from "@/features/files/components/files-workspace";
import { listDocumentProjects } from "@/features/files/files-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function DocumentenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("files");
  const result = await listDocumentProjects();

  return (
    <ShellPage title={t("title")} contentClassName="max-w-none w-[94%]">
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <FilesWorkspace projects={result.projects ?? []} />
      )}
    </ShellPage>
  );
}
