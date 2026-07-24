/**
 * Atmosphere panel assets for onboarding.
 * Swap `src` / `alt` here (or point `src` at your own photography/video poster)
 * without touching layout components.
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
