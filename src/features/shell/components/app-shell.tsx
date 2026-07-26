import { AppSidebar } from "@/features/shell/components/app-sidebar";
import type { ShellContext } from "@/features/shell/nav-config";

type AppShellProps = {
  children: React.ReactNode;
  context: ShellContext;
  organizationName?: string | null;
  userName: string;
  isSuperAdmin?: boolean;
};

export function AppShell({
  children,
  context,
  organizationName,
  userName,
  isSuperAdmin = false,
}: AppShellProps) {
  return (
    <div className="min-h-dvh bg-background">
      <AppSidebar
        context={context}
        organizationName={organizationName}
        userName={userName}
        isSuperAdmin={isSuperAdmin}
      />
      <div className="min-h-dvh pl-[calc(var(--sidebar-width)+1.5rem)]">
        {children}
      </div>
    </div>
  );
}
