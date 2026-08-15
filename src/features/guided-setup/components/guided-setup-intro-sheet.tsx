"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Building2,
  ClipboardList,
  FileText,
  FolderKanban,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { completeGuidedSetupIntro } from "@/features/guided-setup/guided-setup-actions";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const INTRO_STEPS = [
  { id: "model", icon: FolderKanban },
  { id: "start", icon: ClipboardList },
  { id: "flow", icon: FileText },
  { id: "company", icon: Building2 },
] as const;

type GuidedSetupIntroSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GuidedSetupIntroSheet({
  open,
  onOpenChange,
}: GuidedSetupIntroSheetProps) {
  const t = useTranslations("guidedSetup.intro");
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const step = INTRO_STEPS[stepIndex]!;
  const Icon = step.icon;
  const isLast = stepIndex === INTRO_STEPS.length - 1;

  function finishIntro(then?: () => void) {
    startTransition(() => {
      void (async () => {
        await completeGuidedSetupIntro();
        onOpenChange(false);
        router.refresh();
        then?.();
      })();
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          finishIntro();
          return;
        }
        onOpenChange(next);
      }}
    >
      <SheetContent
        showCloseButton={false}
        className="flex w-full flex-col gap-0 overflow-hidden rounded-tl-3xl rounded-bl-3xl p-0 sm:max-w-lg"
      >
        <div className="border-b border-border bg-muted/30 px-6 py-6">
          <SheetHeader className="gap-2 p-0 text-left">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("eyebrow", { step: stepIndex + 1, total: INTRO_STEPS.length })}
            </p>
            <SheetTitle className="text-xl font-semibold tracking-tight">
              {t(`steps.${step.id}.title`)}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {t(`steps.${step.id}.body`)}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex flex-1 flex-col gap-6 px-6 py-6">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-7" />
          </div>

          <div className="flex gap-1.5">
            {INTRO_STEPS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                aria-label={t("eyebrow", {
                  step: index + 1,
                  total: INTRO_STEPS.length,
                })}
                onClick={() => setStepIndex(index)}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  index <= stepIndex ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>

          <div className="mt-auto flex flex-col gap-2">
            {step.id === "start" ? (
              <Button
                size="lg"
                className="w-full"
                disabled={pending}
                asChild
              >
                <Link
                  href="/opdrachten/nieuw"
                  onClick={() => finishIntro()}
                >
                  {t("ctaStart")}
                </Link>
              </Button>
            ) : null}
            {step.id === "company" ? (
              <Button
                size="lg"
                className="w-full"
                disabled={pending}
                asChild
              >
                <Link
                  href="/instellingen/bedrijf"
                  onClick={() => finishIntro()}
                >
                  {t("ctaCompany")}
                </Link>
              </Button>
            ) : null}

            {!isLast ? (
              <Button
                size="lg"
                className="w-full"
                disabled={pending}
                onClick={() => setStepIndex((value) => value + 1)}
              >
                {t("next")}
              </Button>
            ) : (
              <Button
                size="lg"
                variant={step.id === "company" ? "outline" : "default"}
                className="w-full"
                disabled={pending}
                onClick={() => finishIntro()}
              >
                {t("done")}
              </Button>
            )}

            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              disabled={pending}
              onClick={() => finishIntro()}
            >
              {t("skip")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
