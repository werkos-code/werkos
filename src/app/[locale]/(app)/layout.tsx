import { AppShell } from "@/features/shell/components/app-shell";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default function AppLayout({ children, params }: Props) {
  return <AppShell params={params}>{children}</AppShell>;
}
