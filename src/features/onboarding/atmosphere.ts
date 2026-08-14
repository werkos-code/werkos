/**
 * Atmosphere panel assets for onboarding.
 * Swap `src` in ONBOARDING_ATMOSPHERE_ASSETS when the photo changes.
 */
export type OnboardingAtmosphereAsset = {
  /** Path under /public, or a remote URL once next.config allows it */
  src: string;
  alt: string;
  /** Optional credit for stock photography */
  credit?: string;
};

export const ONBOARDING_ATMOSPHERE_ASSETS = {
  solarInstaller: {
    src: "/onboarding/solar-installer.jpg",
    alt: "Vakman installeert zonnepanelen op een dak",
    credit: "Pexels",
  },
} as const satisfies Record<string, OnboardingAtmosphereAsset>;

export const DEFAULT_ONBOARDING_ATMOSPHERE =
  ONBOARDING_ATMOSPHERE_ASSETS.solarInstaller;

export const ONBOARDING_STEP_TOTAL = 6;
