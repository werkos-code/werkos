import Image from "next/image";
import { ExternalLink } from "lucide-react";

import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type AuthBrandBarProps = {
  websiteLabel: string;
  /** On photo overlay (login/onboarding left panel) */
  variant?: "overlay" | "page";
  className?: string;
};

export function AuthBrandBar({
  websiteLabel,
  variant = "page",
  className,
}: AuthBrandBarProps) {
  const isOverlay = variant === "overlay";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <a
        href={siteConfig.marketingUrl}
        className={cn(
          "transition-opacity hover:opacity-90",
          isOverlay &&
            "rounded-xl bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm",
        )}
        aria-label={siteConfig.name}
      >
        <Image
          src="/brand/logo-color.svg"
          alt={siteConfig.name}
          width={697}
          height={147}
          priority
          className={cn("h-6 w-auto", isOverlay && "xl:h-7")}
        />
      </a>
      <a
        href={siteConfig.marketingUrl}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          isOverlay
            ? "border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15"
            : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
        )}
      >
        {websiteLabel}
        <ExternalLink className="size-3" />
      </a>
    </div>
  );
}
