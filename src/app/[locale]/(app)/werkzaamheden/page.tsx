import { getTranslations, setRequestLocale } from "next-intl/server";

import { ShellPage } from "@/features/shell/components/shell-page";
import { OrgWorkItemsWorkspace } from "@/features/work-items/components/org-work-items-workspace";
import { listWorkItemsForOrganization } from "@/features/work-items/work-items-actions";

type Props = { params: Promise<{ locale: string }> };

export default async function WerkzaamhedenPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("orgWorkItems");
  const result = await listWorkItemsForOrganization();

  return (
    <ShellPage title={t("title")}>
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <OrgWorkItemsWorkspace workItems={result.workItems ?? []} />
      )}
    </ShellPage>
  );
}
