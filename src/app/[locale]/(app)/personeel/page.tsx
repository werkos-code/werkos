import { getTranslations, setRequestLocale } from "next-intl/server";

import { StaffTable } from "@/features/staff/components/staff-table";
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
        <StaffTable members={result.members ?? []} />
      )}
    </ShellPage>
  );
}
