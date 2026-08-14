import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/config/site";

/** White logo + website link above the form card. */
export async function OnboardingMobileBrand() {
  const t = await getTranslations("onboarding.atmosphere");

  return (
    <div className="mb-8 flex items-center justify-center gap-3 sm:mb-10">
      <a
        href={siteConfig.marketingUrl}
        className="transition-opacity hover:opacity-90"
        aria-label={siteConfig.name}
      >
        <Image
          src="/brand/logo-white.svg"
          alt={siteConfig.name}
          width={697}
          height={147}
          priority
          className="h-8 w-auto sm:h-9"
        />
      </a>
      <a
        href={siteConfig.marketingUrl}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/15"
      >
        {t("backToWebsite")}
        <ExternalLink className="size-3" />
      </a>
    </div>
  );
}
