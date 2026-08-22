import Image from "next/image";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpRight } from "lucide-react";

import { OrgAccessProvider } from "@/features/billing/components/org-access-provider";
import { fullOrgAccess } from "@/features/billing/lib/entitlements";
import { ImpersonationBanner } from "@/features/platform/components/impersonation-banner";
import { AdminCockpitNav } from "@/features/platform/components/cockpit/admin-cockpit-nav";
import { ShellChromeProvider } from "@/features/shell/components/shell-chrome-provider";
import { requireSuperAdmin } from "@/features/shell/lib/require-organization";
import { Link } from "@/i18n/navigation";

import "@/features/platform/styles/admin-cockpit.css";

type AdminCockpitShellProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

async function AdminCockpitShellInner({
  children,
  params,
}: AdminCockpitShellProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireSuperAdmin(locale);
  const t = await getTranslations("platform.cockpit");

  return (
    <OrgAccessProvider access={fullOrgAccess()}>
      <div className="admin-cockpit relative flex min-h-dvh flex-col">
        <div className="admin-cockpit-bg" aria-hidden />
        <div className="admin-cockpit-grid" aria-hidden />
        <div className="admin-cockpit-scanline" aria-hidden />

        {session.isImpersonating && session.impersonation ? (
          <ImpersonationBanner
            variant="cockpit"
            targetName={session.impersonation.targetUserName}
            targetEmail={session.impersonation.targetEmail}
            organizationName={session.impersonation.organizationName}
            returnHref="/platform/admin/gebruikers"
          />
        ) : null}

        <header className="admin-cockpit-header sticky top-0 z-40 print:hidden">
          <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-10">
            <div className="flex min-w-0 items-center gap-6">
              <Link
                href="/platform/admin"
                className="flex shrink-0 items-center gap-3"
              >
                <Image
                  src="/brand/logo-white.svg"
                  alt="WerkOS"
                  width={96}
                  height={24}
                  className="h-6 w-auto opacity-90"
                  priority
                />
                <span className="hidden text-[10px] font-medium tracking-[0.32em] text-cyan-400/80 uppercase sm:inline">
                  {t("controlRoom")}
                </span>
              </Link>
              <AdminCockpitNav />
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden text-sm text-slate-400 sm:inline">
                {session.userName}
              </span>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-100"
              >
                {t("exitToApp")}
                <ArrowUpRight className="size-3.5 opacity-70" />
              </Link>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-1">{children}</main>
      </div>
    </OrgAccessProvider>
  );
}

export function AdminCockpitShell({ children, params }: AdminCockpitShellProps) {
  return (
    <ShellChromeProvider>
      <Suspense
        fallback={
          <div className="admin-cockpit flex min-h-dvh items-center justify-center">
            <div className="admin-cockpit-bg" aria-hidden />
            <p className="relative text-sm tracking-[0.2em] text-cyan-400/60 uppercase">
              Loading
            </p>
          </div>
        }
      >
        <AdminCockpitShellInner params={params}>{children}</AdminCockpitShellInner>
      </Suspense>
    </ShellChromeProvider>
  );
}
