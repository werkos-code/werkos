import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { StaffMemberForm } from "@/features/staff/components/staff-member-form";
import { getOrgStaffMember } from "@/features/staff/staff-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = {
  params: Promise<{ locale: string; memberId: string }>;
};

export default async function StaffMemberPage({ params }: Props) {
  const { locale, memberId } = await params;
  setRequestLocale(locale);
  await getTranslations("staff");
  const result = await getOrgStaffMember(memberId);

  if (result.error === "not_found" || !result.member) {
    notFound();
  }

  return (
    <ShellPage title={result.member.name} backHref="/personeel">
      <StaffMemberForm
        member={result.member}
        canManage={Boolean(result.canManage)}
        currentUserId={result.currentUserId ?? ""}
      />
    </ShellPage>
  );
}
