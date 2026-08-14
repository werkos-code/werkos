import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ONBOARDING_STEP_TOTAL } from "@/features/onboarding/atmosphere";
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
 * Floating white form card on the photo. Same language as the login panel.
 */
export async function OnboardingStepFrame({
  step,
  total = ONBOARDING_STEP_TOTAL,
  title,
  description,
  children,
  backHref,
}: OnboardingStepFrameProps) {
  const t = await getTranslations("common");

  return (
    <div className="w-full max-w-[32rem] rounded-3xl bg-white px-8 py-10 shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:px-12 sm:py-12">
      {backHref ? (
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {t("back")}
        </Link>
      ) : null}

      <OnboardingProgress current={step} total={total} />

      {title ? (
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}

      {children}
    </div>
  );
}
