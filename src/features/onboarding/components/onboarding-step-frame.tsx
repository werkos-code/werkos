import { getTranslations } from "next-intl/server";

import { OnboardingProgress } from "@/features/onboarding/components/onboarding-progress";
import { Link } from "@/i18n/navigation";

type OnboardingStepFrameProps = {
  step: number;
  total?: number;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** Prefer center for short steps (welcome); start for taller forms */
  align?: "center" | "start";
  /** Previous step in the flow */
  backHref?: string;
};

/**
 * Left-column step content: progress, heading, copy, form/actions.
 * Max content width ~540px, vertically centered by default.
 */
export async function OnboardingStepFrame({
  step,
  total = 7,
  title,
  description,
  children,
  align = "center",
  backHref,
}: OnboardingStepFrameProps) {
  const t = await getTranslations("common");

  return (
    <div
      className={`flex flex-1 flex-col px-6 py-12 sm:px-10 lg:px-16 xl:px-20 ${
        align === "center" ? "justify-center" : "justify-start pt-16 sm:pt-20"
      }`}
    >
      <div className="mx-auto w-full max-w-[34rem]">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-6 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {t("back")}
          </Link>
        ) : null}

        <OnboardingProgress current={step} total={total} />

        {title ? (
          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-[2rem] sm:leading-tight">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground text-pretty">
                {description}
              </p>
            ) : null}
          </header>
        ) : null}

        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
