import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/config/site";

export async function OnboardingChrome() {
  const t = await getTranslations("onboarding.brand");

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-6 sm:px-10 lg:px-16 xl:px-20">
      <a
        href={siteConfig.marketingUrl}
        className="flex items-center rounded-lg bg-sidebar px-2.5 py-1.5 transition-opacity hover:opacity-90"
        aria-label={t("backToWebsite")}
      >
        <Image
          src="/brand/werkos-logo.png"
          alt={siteConfig.name}
          width={300}
          height={63}
          priority
          className="h-5 w-auto object-contain object-left"
        />
      </a>
      <a
        href={siteConfig.marketingUrl}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {t("backToWebsite")}
        <ExternalLink className="size-3.5" />
      </a>
    </header>
  );
}
