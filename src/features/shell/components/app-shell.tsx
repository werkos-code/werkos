import { AppSidebar } from "@/features/shell/components/app-sidebar";
import { ShellChromeProvider } from "@/features/shell/components/shell-chrome-provider";

type AppShellProps = {
  children: React.ReactNode;
  organizationName?: string | null;
  userName: string;
  isSuperAdmin?: boolean;
};

export function AppShell({
  children,
  organizationName,
  userName,
  isSuperAdmin = false,
}: AppShellProps) {
  return (
    <ShellChromeProvider>
      <div className="min-h-dvh bg-background">
        <AppSidebar
          organizationName={organizationName}
          userName={userName}
          isSuperAdmin={isSuperAdmin}
        />
        <div className="min-h-dvh pl-[var(--sidebar-width)]">
          {children}
        </div>
      </div>
    </ShellChromeProvider>
  );
}
