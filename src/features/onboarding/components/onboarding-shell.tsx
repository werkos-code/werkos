import Image from "next/image";

import { DEFAULT_ONBOARDING_ATMOSPHERE } from "@/features/onboarding/atmosphere";
import { OnboardingAtmosphere } from "@/features/onboarding/components/onboarding-atmosphere";
import { OnboardingMobileBrand } from "@/features/onboarding/components/onboarding-mobile-brand";

type OnboardingShellProps = {
  children: React.ReactNode;
};

/**
 * Full-bleed photo with a two-column overlay: USPs left, floating white card right.
 */
export function OnboardingShell({ children }: OnboardingShellProps) {
  const asset = DEFAULT_ONBOARDING_ATMOSPHERE;

  return (
    <div className="relative min-h-dvh w-full overflow-hidden">
      <Image
        src={asset.src}
        alt={asset.alt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#09133A]/72 via-[#09133A]/48 to-[#09133A]/38" />

      <div className="relative z-10 grid min-h-dvh lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <OnboardingAtmosphere />
        <section className="flex min-h-dvh flex-col items-center justify-center px-5 py-10 sm:px-8 lg:px-10 lg:py-12">
          <OnboardingMobileBrand />
          {children}
        </section>
      </div>
    </div>
  );
}
