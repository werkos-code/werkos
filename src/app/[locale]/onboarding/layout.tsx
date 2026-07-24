import { OnboardingShell } from "@/features/onboarding/components/onboarding-shell";

type OnboardingLayoutProps = {
  children: React.ReactNode;
};

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return <OnboardingShell>{children}</OnboardingShell>;
}
