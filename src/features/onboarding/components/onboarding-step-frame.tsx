import { ArrowLeft, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ONBOARDING_STEP_TOTAL } from "@/features/onboarding/atmosphere";
import { OnboardingProgress } from "@/features/onboarding/components/onboarding-progress";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type OnboardingStepFrameProps = {
  step: number;
  total?: number;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  /** Previous step in the flow */
  backHref?: string;
  /** Hide progress (e.g. final welcome). */
  hideProgress?: boolean;
  className?: string;
};

/**
 * Form surface matched to dashboard cards: rounded-2xl, soft shadow, thin ring.
 * Header language follows EntityFormShell (icon chip + title + hint).
 */
export async function OnboardingStepFrame({
  step,
  total = ONBOARDING_STEP_TOTAL,
  title,
  description,
  icon: Icon,
  children,
  backHref,
  hideProgress = false,
  className,
}: OnboardingStepFrameProps) {
  const t = await getTranslations("common");

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.04]",
        className,
      )}
    >
      {backHref || !hideProgress ? (
        <div className="border-b border-border/70 bg-muted/25 px-6 pt-5 pb-4 sm:px-8">
          {backHref ? (
            <Link
              href={backHref}
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              {t("back")}
            </Link>
          ) : null}
          {!hideProgress ? (
            <OnboardingProgress current={step} total={total} compact />
          ) : null}
        </div>
      ) : null}

      {title ? (
        <div className="border-b border-border/70 px-6 py-5 sm:px-8">
          <div className="flex items-start gap-4">
            {Icon ? (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
            ) : null}
            <div className="min-w-0 space-y-1">
              <h1 className="text-base font-semibold tracking-tight text-balance text-foreground sm:text-lg">
                {title}
              </h1>
              {description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="px-6 py-6 sm:px-8 sm:py-7">{children}</div>
    </div>
  );
}
