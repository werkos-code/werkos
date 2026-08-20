import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

import { StaffInviteForm } from "@/features/staff/components/staff-invite-form";
import { listOrgStaffMembers } from "@/features/staff/staff-actions";
import { ShellPage } from "@/features/shell/components/shell-page";

type Props = { params: Promise<{ locale: string }> };

export default async function NewStaffPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("staff");
  const result = await listOrgStaffMembers();

  if (!result.canManage) {
    redirect({ href: "/personeel", locale });
  }

  return (
    <ShellPage title={t("inviteTitle")} backHref="/personeel">
      <StaffInviteForm />
    </ShellPage>
  );
}
