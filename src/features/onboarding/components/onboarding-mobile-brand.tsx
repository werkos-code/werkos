import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/config/site";

/** Compact logo + website link on mobile/tablet where the left panel is hidden. */
export async function OnboardingMobileBrand() {
  const t = await getTranslations("onboarding.atmosphere");

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-6 py-4 lg:hidden">
      <a href={siteConfig.marketingUrl} aria-label={siteConfig.name}>
        <Image
          src="/brand/logo-color.svg"
          alt={siteConfig.name}
          width={697}
          height={147}
          priority
          className="h-6 w-auto"
        />
      </a>
      <a
        href={siteConfig.marketingUrl}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {t("backToWebsite")}
        <ExternalLink className="size-3" />
      </a>
    </div>
  );
}
