import Image from "next/image";
import { ExternalLink, FolderKanban, Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/config/site";
import {
  DEFAULT_ONBOARDING_ATMOSPHERE,
  type OnboardingAtmosphereAsset,
} from "@/features/onboarding/atmosphere";
import { cn } from "@/lib/utils";

type OnboardingAtmosphereProps = {
  asset?: OnboardingAtmosphereAsset;
};

const USP_ICONS: LucideIcon[] = [FolderKanban, Zap, Sparkles];

/**
 * Left onboarding panel — full-bleed photo, logo, website link, USP cards.
 */
export async function OnboardingAtmosphere({
  asset = DEFAULT_ONBOARDING_ATMOSPHERE,
}: OnboardingAtmosphereProps) {
  const t = await getTranslations("onboarding.atmosphere");
  const usps = ["project", "speed", "overview"] as const;

  return (
    <aside className="relative hidden min-h-dvh overflow-hidden lg:flex lg:flex-col">
      <Image
        src={asset.src}
        alt={asset.alt}
        fill
        priority
        sizes="(min-width: 1024px) 45vw, 0px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#09133A]/92 via-[#09133A]/78 to-[#09133A]/55" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col p-8 xl:p-10">
        <div className="flex items-center gap-3">
          <a
            href={siteConfig.marketingUrl}
            className="rounded-xl bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm transition-opacity hover:opacity-90"
            aria-label={siteConfig.name}
          >
            <Image
              src="/brand/logo-color.svg"
              alt={siteConfig.name}
              width={697}
              height={147}
              priority
              className="h-6 w-auto xl:h-7"
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

        <div className="mt-auto space-y-6 pt-10">
          <div className="max-w-sm">
            <h2 className="text-2xl font-semibold tracking-tight text-white xl:text-[1.75rem]">
              {t("headline")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              {t("tagline")}
            </p>
          </div>

          <ul className="space-y-3">
            {usps.map((key, index) => {
              const Icon = USP_ICONS[index] ?? Sparkles;
              return (
                <li
                  key={key}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md",
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className="block text-sm font-medium text-white">
                      {t(`usps.${key}.title`)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-white/70">
                      {t(`usps.${key}.body`)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </aside>
  );
}
