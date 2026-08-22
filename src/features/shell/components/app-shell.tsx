import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import { OrgAccessProvider } from "@/features/billing/components/org-access-provider";
import { SubscriptionPaywallDialog } from "@/features/billing/components/subscription-paywall-dialog";
import { TrialExpiredDialog } from "@/features/billing/components/trial-expired-dialog";
import { fullOrgAccess } from "@/features/billing/lib/entitlements";
import { getOrganizationAccess } from "@/features/billing/lib/get-organization-access";
import { GuidedSetupCoachHost } from "@/features/guided-setup/components/guided-setup-coach-host";
import { ImpersonationBanner } from "@/features/platform/components/impersonation-banner";
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

async function AppShellWithAccess({
  children,
  params,
  requireSuperAdminSession,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
  requireSuperAdminSession: boolean;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = requireSuperAdminSession
    ? await requireSuperAdmin(locale)
    : await requireOrganization(locale);

  const access =
    session.isSuperAdmin && !session.isImpersonating
      ? fullOrgAccess()
      : session.organizationId
        ? await getOrganizationAccess(session.organizationId, {
            userId: session.isImpersonating
              ? session.impersonation!.targetUserId
              : session.user.id,
            isSuperAdmin: session.isSuperAdmin && !session.isImpersonating,
          })
        : fullOrgAccess();

  return (
    <OrgAccessProvider access={access}>
      <AppSidebar
        organizationName={session.organizationName}
        userName={session.userName}
        isSuperAdmin={session.isSuperAdmin}
      />
      <div className="min-h-dvh pl-[var(--sidebar-width)] print:pl-0">
        {session.isImpersonating && session.impersonation ? (
          <ImpersonationBanner
            targetName={session.impersonation.targetUserName}
            targetEmail={session.impersonation.targetEmail}
            organizationName={session.impersonation.organizationName}
            returnHref={
              requireSuperAdminSession
                ? "/platform/admin/gebruikers"
                : undefined
            }
          />
        ) : null}
        {children}
      </div>
      {!requireSuperAdminSession ? (
        <>
          <Suspense fallback={null}>
            <GuidedSetupCoachHost />
          </Suspense>
          <TrialExpiredDialog />
          <SubscriptionPaywallDialog />
        </>
      ) : null}
    </OrgAccessProvider>
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
        <Suspense
          fallback={
            <>
              <AppSidebar />
              <div className="min-h-dvh pl-[var(--sidebar-width)] print:pl-0">
                {children}
              </div>
            </>
          }
        >
          <AppShellWithAccess
            params={params}
            requireSuperAdminSession={requireSuperAdminSession}
          >
            {children}
          </AppShellWithAccess>
        </Suspense>
      </div>
    </ShellChromeProvider>
  );
}
