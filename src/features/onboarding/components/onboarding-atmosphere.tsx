import Image from "next/image";
import { getTranslations } from "next-intl/server";

import {
  DEFAULT_ONBOARDING_ATMOSPHERE,
  type OnboardingAtmosphereAsset,
} from "@/features/onboarding/atmosphere";

type OnboardingAtmosphereProps = {
  asset?: OnboardingAtmosphereAsset;
};

/**
 * Right-hand atmosphere panel — trust and calm only.
 * No interactive content.
 */
export async function OnboardingAtmosphere({
  asset = DEFAULT_ONBOARDING_ATMOSPHERE,
}: OnboardingAtmosphereProps) {
  const t = await getTranslations("onboarding.atmosphere");

  return (
    <aside
      className="relative hidden min-h-0 overflow-hidden bg-muted md:block"
      aria-hidden="true"
    >
      <Image
        src={asset.src}
        alt={asset.alt}
        fill
        priority
        sizes="(min-width: 768px) 40vw, 0px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-foreground/35" />
      <div className="absolute inset-x-0 bottom-0 p-8 lg:p-10">
        <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/90">
          {t("tagline")}
        </p>
      </div>
    </aside>
  );
}
