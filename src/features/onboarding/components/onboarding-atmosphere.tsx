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
 * Right-hand atmosphere panel — navy chrome + photo, matching the app sidebar.
 * No interactive content.
 */
export async function OnboardingAtmosphere({
  asset = DEFAULT_ONBOARDING_ATMOSPHERE,
}: OnboardingAtmosphereProps) {
  const t = await getTranslations("onboarding.atmosphere");

  return (
    <aside
      className="relative hidden min-h-0 overflow-hidden bg-sidebar md:block"
      aria-hidden="true"
    >
      <Image
        src={asset.src}
        alt={asset.alt}
        fill
        priority
        sizes="(min-width: 768px) 37vw, 0px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#09133A] via-[#09133A]/70 to-[#09133A]/35" />
      <div className="absolute inset-x-0 bottom-0 p-8 lg:p-10">
        <p className="max-w-xs text-sm leading-relaxed text-sidebar-foreground/90">
          {t("tagline")}
        </p>
      </div>
    </aside>
  );
}
