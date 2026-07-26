import { setRequestLocale } from "next-intl/server";

import { AppShell } from "@/features/shell/components/app-shell";
import { requireSuperAdmin } from "@/features/shell/lib/require-organization";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function PlatformLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireSuperAdmin(locale);

  return (
    <AppShell
      organizationName={session.organizationName}
      userName={session.userName}
      isSuperAdmin
    >
      {children}
    </AppShell>
  );
}
