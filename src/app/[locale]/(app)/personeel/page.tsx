import { getTranslations, setRequestLocale } from "next-intl/server";

import { StaffWorkspace } from "@/features/staff/components/staff-workspace";
import { listOrgStaffMembers } from "@/features/staff/staff-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function PersoneelPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("staff");
  const result = await listOrgStaffMembers();

  return (
    <ShellPage title={t("title")}>
      {result.error ? (
        <p className="text-sm text-destructive">{result.error}</p>
      ) : (
        <StaffWorkspace
          members={result.members ?? []}
          canManage={Boolean(result.canManage)}
          currentUserId={result.currentUserId ?? ""}
        />
      )}
    </ShellPage>
  );
}
