import Image from "next/image";

import { DEFAULT_ONBOARDING_ATMOSPHERE } from "@/features/onboarding/atmosphere";
import { OnboardingMobileBrand } from "@/features/onboarding/components/onboarding-mobile-brand";

type OnboardingShellProps = {
  children: React.ReactNode;
};

/**
 * Full-bleed photo with a centered white form card — same language as login.
 */
export function OnboardingShell({ children }: OnboardingShellProps) {
  const asset = DEFAULT_ONBOARDING_ATMOSPHERE;

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8 sm:py-14">
      <Image
        src={asset.src}
        alt={asset.alt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[#09133A]/45" />

      <div className="relative z-10 flex w-full max-w-[42rem] flex-col items-center">
        <OnboardingMobileBrand />
        {children}
      </div>
    </div>
  );
}
