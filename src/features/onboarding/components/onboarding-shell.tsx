import { OnboardingAtmosphere } from "@/features/onboarding/components/onboarding-atmosphere";
import { OnboardingChrome } from "@/features/onboarding/components/onboarding-chrome";

type OnboardingShellProps = {
  children: React.ReactNode;
};

/**
 * Full-viewport onboarding chrome: interaction left, atmosphere right.
 * Desktop ~63/37 · tablet narrower right · mobile left only.
 * Left column is top-locked so steps do not jump between center and start.
 */
export function OnboardingShell({ children }: OnboardingShellProps) {
  return (
    <div className="flex min-h-dvh flex-1 bg-background">
      <div className="flex min-h-dvh w-full flex-col md:grid md:grid-cols-[minmax(0,1.7fr)_minmax(16rem,1fr)]">
        <section className="flex min-h-dvh min-w-0 flex-1 flex-col">
          <OnboardingChrome />
          {children}
        </section>
        <OnboardingAtmosphere />
      </div>
    </div>
  );
}
