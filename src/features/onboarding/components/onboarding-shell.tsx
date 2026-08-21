import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/config/site";

type OnboardingShellProps = {
  children: React.ReactNode;
};

/**
 * Product-entry canvas aligned with the dashboard hero:
 * navy gradient + soft radial glow, calm light form surface on top.
 */
export async function OnboardingShell({ children }: OnboardingShellProps) {
  const t = await getTranslations("onboarding.atmosphere");

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-10 sm:px-8 sm:py-14">
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-br from-[#09133A] via-[#0B1A4A] to-[#1E3A8A]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.28),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/20 to-transparent"
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center">
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
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm transition-colors hover:bg-white/15"
          >
            {t("backToWebsite")}
            <ExternalLink className="size-3 opacity-80" />
          </a>
        </div>

        {children}
      </div>
    </div>
  );
}
