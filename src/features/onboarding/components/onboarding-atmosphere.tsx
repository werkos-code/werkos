import Image from "next/image";
import { ExternalLink, FolderKanban, Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/config/site";

const USP_ICONS: LucideIcon[] = [FolderKanban, Zap, Sparkles];

/**
 * Left onboarding overlay — white logo, website link, USP cards on the photo.
 */
export async function OnboardingAtmosphere() {
  const t = await getTranslations("onboarding.atmosphere");
  const usps = ["project", "speed", "overview"] as const;

  return (
    <aside className="relative hidden min-h-dvh flex-col p-8 lg:flex xl:p-10">
      <div className="flex items-center gap-3">
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
            className="h-7 w-auto xl:h-8"
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

      <div className="mt-auto max-w-sm space-y-6 pb-2 pt-10">
        <div>
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
                className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"
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
    </aside>
  );
}
