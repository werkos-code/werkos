import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { OnboardingProgress } from "@/features/onboarding/components/onboarding-progress";
import { PageCard } from "@/features/shell/components/page-card";
import { Link } from "@/i18n/navigation";

type OnboardingStepFrameProps = {
  step: number;
  total?: number;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** Previous step in the flow */
  backHref?: string;
  /** Welcome / complete: lighter card without inner form shell */
  plain?: boolean;
};

/**
 * Right-column step content inside a floating card. Top-aligned across steps.
 */
export async function OnboardingStepFrame({
  step,
  total = 7,
  title,
  description,
  children,
  backHref,
  plain = false,
}: OnboardingStepFrameProps) {
  const t = await getTranslations("common");

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:min-h-dvh">
      <div className="flex flex-1 items-start justify-center overflow-y-auto px-6 py-8 sm:px-10 lg:px-12 lg:py-12 xl:px-16">
        <div className="w-full max-w-[28rem]">
          <div className="mb-4 flex min-h-5 items-center">
            {backHref ? (
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                {t("back")}
              </Link>
            ) : null}
          </div>

          <OnboardingProgress current={step} total={total} />

          {title ? (
            <header className="mb-6 min-h-[4.5rem] text-center lg:text-left">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                {title}
              </h1>
              {description ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </header>
          ) : (
            <div className="mb-6 min-h-[4.5rem]" />
          )}

          {plain ? (
            <div className="w-full">{children}</div>
          ) : (
            <PageCard className="p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
              {children}
            </PageCard>
          )}
        </div>
      </div>
    </div>
  );
}
