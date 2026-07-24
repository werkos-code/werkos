import { setRequestLocale } from "next-intl/server";

import { AppShell } from "@/features/shell/components/app-shell";
import { requireOrganization } from "@/features/shell/lib/require-organization";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function WerkLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireOrganization(locale);

  return (
    <AppShell
      context="werk"
      organizationName={session.organizationName}
      userName={session.userName}
    >
      {children}
    </AppShell>
  );
}
