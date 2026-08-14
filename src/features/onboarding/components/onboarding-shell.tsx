import { OnboardingAtmosphere } from "@/features/onboarding/components/onboarding-atmosphere";
import { OnboardingMobileBrand } from "@/features/onboarding/components/onboarding-mobile-brand";

type OnboardingShellProps = {
  children: React.ReactNode;
};

/**
 * Full-viewport onboarding: photo + USPs left, form card right.
 * Desktop ~45/55 · mobile form-first with compact brand bar.
 */
export function OnboardingShell({ children }: OnboardingShellProps) {
  return (
    <div className="flex min-h-dvh flex-1 bg-muted/30">
      <div className="grid min-h-dvh w-full lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <OnboardingAtmosphere />
        <section className="flex min-h-dvh min-w-0 flex-col bg-background">
          <OnboardingMobileBrand />
          {children}
        </section>
      </div>
    </div>
  );
}
