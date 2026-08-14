import { FolderKanban, Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

const USP_ICONS: LucideIcon[] = [FolderKanban, Zap, Sparkles];

export async function HomeUsps() {
  const t = await getTranslations("onboarding.atmosphere");
  const usps = ["project", "speed", "overview"] as const;

  return (
    <ul className="mt-8 grid gap-3 sm:grid-cols-3">
      {usps.map((key, index) => {
        const Icon = USP_ICONS[index] ?? Sparkles;
        return (
          <li
            key={key}
            className="rounded-xl border border-border/80 bg-card/60 p-3.5 text-center sm:text-left"
          >
            <span className="mx-auto mb-2.5 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary sm:mx-0">
              <Icon className="size-4" />
            </span>
            <p className="text-sm font-medium">{t(`usps.${key}.title`)}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t(`usps.${key}.body`)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
