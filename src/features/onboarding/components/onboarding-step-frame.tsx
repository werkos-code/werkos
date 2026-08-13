import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { OnboardingProgress } from "@/features/onboarding/components/onboarding-progress";
import { Link } from "@/i18n/navigation";

type OnboardingStepFrameProps = {
  step: number;
  total?: number;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** Previous step in the flow */
  backHref?: string;
};

/**
 * Left-column step content. Always top-aligned so forms stay put across steps.
 */
export async function OnboardingStepFrame({
  step,
  total = 7,
  title,
  description,
  children,
  backHref,
}: OnboardingStepFrameProps) {
  const t = await getTranslations("common");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10 lg:px-16 xl:px-20">
        <div className="mx-auto w-full max-w-[34rem]">
          <div className="mb-5 flex min-h-5 items-center">
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
            <header className="mb-6 min-h-[4.75rem]">
              <h1 className="text-2xl font-semibold tracking-tight text-balance">
                {title}
              </h1>
              {description ? (
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </header>
          ) : (
            <div className="mb-6 min-h-[4.75rem]" />
          )}

          <div className="w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}
