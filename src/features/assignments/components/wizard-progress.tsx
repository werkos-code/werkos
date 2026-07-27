"use client";

import { useTranslations } from "next-intl";

import {
  stepIndex,
  WIZARD_STEPS,
  type WizardStep,
} from "@/features/assignments/lib/wizard-state";
import { cn } from "@/lib/utils";

const STEP_LABEL_KEYS: Record<WizardStep, string> = {
  gegevens: "steps.gegevens",
  aanvraag: "steps.aanvraag",
  calculatie: "steps.calculatie",
  afronden: "steps.afronden",
};

export function WizardProgress({ current }: { current: WizardStep }) {
  const t = useTranslations("assignment");
  const currentIndex = stepIndex(current);

  return (
    <nav aria-label={t("progressLabel")} className="w-full">
      <ol className="flex items-center gap-1 sm:gap-2">
        {WIZARD_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          return (
            <li key={step} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors",
                    done && "bg-primary text-primary-foreground",
                    active && "bg-primary/10 text-primary ring-2 ring-primary/30",
                    !done && !active && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? "✓" : index + 1}
                </span>
                <span
                  className={cn(
                    "hidden w-full truncate text-center text-[11px] font-medium uppercase tracking-wide sm:block",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {t(STEP_LABEL_KEYS[step])}
                </span>
              </div>
              {index < WIZARD_STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mb-5 hidden h-px flex-1 sm:block",
                    index < currentIndex ? "bg-primary/40" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center text-sm font-medium sm:hidden">
        {t(STEP_LABEL_KEYS[current])}
      </p>
    </nav>
  );
}
