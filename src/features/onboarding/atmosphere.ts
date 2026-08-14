/**
 * Atmosphere panel assets for onboarding.
 * Swap `src` in ONBOARDING_ATMOSPHERE_ASSETS when the final construction photo is ready.
 */
export type OnboardingAtmosphereAsset = {
  /** Path under /public, or a remote URL once next.config allows it */
  src: string;
  alt: string;
  /** Optional credit for stock photography */
  credit?: string;
};

export const ONBOARDING_ATMOSPHERE_ASSETS = {
  tradesperson: {
    src: "/onboarding/tradesperson.jpg",
    alt: "Vakmensen aan het werk op de bouw",
    credit: "Unsplash",
  },
} as const satisfies Record<string, OnboardingAtmosphereAsset>;

export const DEFAULT_ONBOARDING_ATMOSPHERE =
  ONBOARDING_ATMOSPHERE_ASSETS.tradesperson;
