import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import { GuidedSetupCoachHost } from "@/features/guided-setup/components/guided-setup-coach-host";
import { AppSidebar } from "@/features/shell/components/app-sidebar";
import { ShellChromeProvider } from "@/features/shell/components/shell-chrome-provider";
import {
  requireOrganization,
  requireSuperAdmin,
} from "@/features/shell/lib/require-organization";

type AppShellProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
  requireSuperAdminSession?: boolean;
};

async function AppSidebarWithSession({
  params,
  requireSuperAdminSession,
}: {
  params: Promise<{ locale: string }>;
  requireSuperAdminSession: boolean;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = requireSuperAdminSession
    ? await requireSuperAdmin(locale)
    : await requireOrganization(locale);

  return (
    <AppSidebar
      organizationName={session.organizationName}
      userName={session.userName}
      isSuperAdmin={session.isSuperAdmin}
    />
  );
}

export function AppShell({
  children,
  params,
  requireSuperAdminSession = false,
}: AppShellProps) {
  return (
    <ShellChromeProvider>
      <div className="min-h-dvh bg-background">
        <Suspense fallback={<AppSidebar />}>
          <AppSidebarWithSession
            params={params}
            requireSuperAdminSession={requireSuperAdminSession}
          />
        </Suspense>
        <div className="min-h-dvh pl-[var(--sidebar-width)] print:pl-0">{children}</div>
        {!requireSuperAdminSession ? (
          <Suspense fallback={null}>
            <GuidedSetupCoachHost />
          </Suspense>
        ) : null}
      </div>
    </ShellChromeProvider>
  );
}
