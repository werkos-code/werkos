import { OnboardingAtmosphere } from "@/features/onboarding/components/onboarding-atmosphere";

type OnboardingShellProps = {
  children: React.ReactNode;
};

/**
 * Full-viewport onboarding chrome: interaction left, atmosphere right.
 * Desktop ~60/40 · tablet narrower right · mobile left only.
 */
export function OnboardingShell({ children }: OnboardingShellProps) {
  return (
    <div className="flex min-h-dvh flex-1 bg-background">
      <div className="flex min-h-dvh w-full flex-col md:grid md:grid-cols-[minmax(0,2fr)_minmax(14rem,0.85fr)] lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section className="flex min-h-dvh flex-1 flex-col">
          {children}
        </section>
        <OnboardingAtmosphere />
      </div>
    </div>
  );
}
