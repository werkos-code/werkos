import { OnboardingProgress } from "@/features/onboarding/components/onboarding-progress";

type OnboardingStepFrameProps = {
  step: number;
  total?: number;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** Prefer center for short steps (welcome); start for taller forms */
  align?: "center" | "start";
};

/**
 * Left-column step content: progress, heading, copy, form/actions.
 * Max content width ~540px, vertically centered by default.
 */
export function OnboardingStepFrame({
  step,
  total = 7,
  title,
  description,
  children,
  align = "center",
}: OnboardingStepFrameProps) {
  return (
    <div
      className={`flex flex-1 flex-col px-6 py-12 sm:px-10 lg:px-16 xl:px-20 ${
        align === "center" ? "justify-center" : "justify-start pt-16 sm:pt-20"
      }`}
    >
      <div className="mx-auto w-full max-w-[34rem]">
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
