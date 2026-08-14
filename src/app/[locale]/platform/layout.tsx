import { AppShell } from "@/features/shell/components/app-shell";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default function PlatformLayout({ children, params }: Props) {
  return (
    <AppShell params={params} requireSuperAdminSession>
      {children}
    </AppShell>
  );
}
