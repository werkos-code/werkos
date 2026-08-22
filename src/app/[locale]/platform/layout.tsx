import { AdminCockpitShell } from "@/features/platform/components/cockpit/admin-cockpit-shell";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default function PlatformLayout({ children, params }: Props) {
  return <AdminCockpitShell params={params}>{children}</AdminCockpitShell>;
}
