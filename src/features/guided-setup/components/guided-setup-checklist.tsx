"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  dismissGuidedSetupChecklist,
  type GuidedSetupState,
} from "@/features/guided-setup/guided-setup-actions";
import { PageCard } from "@/features/shell/components/page-card";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type GuidedSetupChecklistProps = {
  state: GuidedSetupState;
};

export function GuidedSetupChecklist({ state }: GuidedSetupChecklistProps) {
  const t = useTranslations("guidedSetup.checklist");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!state.showChecklist) return null;

  const doneCount = state.steps.filter((step) => step.done).length;

  return (
    <PageCard className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-medium">{t("title")}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("progress", { done: doneCount, total: state.steps.length })}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          disabled={pending}
          aria-label={t("dismiss")}
          onClick={() => {
            startTransition(() => {
              void (async () => {
                await dismissGuidedSetupChecklist();
                router.refresh();
              })();
            });
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
      <ul className="divide-y divide-border/70">
        {state.steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  step.done
                    ? "bg-success text-success-foreground"
                    : "bg-primary/10 text-primary",
                )}
              >
                {step.done ? (
                  <Check className="size-3.5" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    step.done && "text-muted-foreground line-through",
                  )}
                >
                  {t(`steps.${step.id}.title`)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {t(`steps.${step.id}.hint`)}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </PageCard>
  );
}
