"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronRight, CircleHelp, Minus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { dismissGuidedSetupCoach } from "@/features/guided-setup/guided-setup-actions";
import {
  matchGuidedSetupContext,
  stepsForContext,
  type GuidedSetupContextId,
  type GuidedSetupFlags,
} from "@/features/guided-setup/guided-setup-contexts";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const STORAGE_COLLAPSED = "werkos.guided-setup.collapsed";
const STORAGE_CONTEXT_DISMISS = "werkos.guided-setup.context-dismissed";

type GuidedSetupCoachProps = {
  flags: GuidedSetupFlags;
};

function readDismissedContexts(): GuidedSetupContextId[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_CONTEXT_DISMISS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? (parsed.filter((value) => typeof value === "string") as GuidedSetupContextId[])
      : [];
  } catch {
    return [];
  }
}

export function GuidedSetupCoach({ flags }: GuidedSetupCoachProps) {
  const t = useTranslations("guidedSetup.coach");
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState(false);
  const [dismissedContexts, setDismissedContexts] = useState<
    GuidedSetupContextId[]
  >([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(STORAGE_COLLAPSED) === "1");
    setDismissedContexts(readDismissedContexts());
    setReady(true);
  }, []);

  const match = useMemo(
    () => matchGuidedSetupContext(pathname),
    [pathname],
  );

  const steps = useMemo(() => {
    if (!match) return [];
    return stepsForContext(match, flags);
  }, [match, flags]);

  const doneCount = steps.filter((step) => step.done).length;
  const allDone = steps.length > 0 && doneCount === steps.length;
  const contextDismissed = Boolean(
    match && dismissedContexts.includes(match.contextId),
  );

  if (!ready || flags.coachHidden || !match || steps.length === 0 || allDone) {
    return null;
  }

  function persistCollapsed(next: boolean) {
    setCollapsed(next);
    window.localStorage.setItem(STORAGE_COLLAPSED, next ? "1" : "0");
  }

  function dismissContext() {
    if (!match) return;
    const next = Array.from(
      new Set([...dismissedContexts, match.contextId]),
    );
    setDismissedContexts(next);
    window.localStorage.setItem(STORAGE_CONTEXT_DISMISS, JSON.stringify(next));
  }

  function hideEverywhere() {
    startTransition(() => {
      void (async () => {
        await dismissGuidedSetupCoach();
        window.localStorage.removeItem(STORAGE_CONTEXT_DISMISS);
        window.localStorage.removeItem(STORAGE_COLLAPSED);
        router.refresh();
      })();
    });
  }

  if (contextDismissed) {
    return (
      <div className="pointer-events-none fixed right-6 bottom-6 z-40">
        <Button
          type="button"
          size="icon"
          className="pointer-events-auto size-11 rounded-full shadow-md"
          aria-label={t("reopen")}
          onClick={() => {
            const next = dismissedContexts.filter(
              (id) => id !== match.contextId,
            );
            setDismissedContexts(next);
            window.localStorage.setItem(
              STORAGE_CONTEXT_DISMISS,
              JSON.stringify(next),
            );
            persistCollapsed(false);
          }}
        >
          <CircleHelp className="size-5" />
        </Button>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="pointer-events-none fixed right-6 bottom-6 z-40">
        <Button
          type="button"
          className="pointer-events-auto h-11 gap-2 rounded-full px-4 shadow-md"
          aria-label={t("expand")}
          onClick={() => persistCollapsed(false)}
        >
          <CircleHelp className="size-4" />
          <span className="text-sm font-medium">{t("title")}</span>
          <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[11px]">
            {doneCount}/{steps.length}
          </span>
        </Button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed right-6 bottom-6 z-40 w-[min(100vw-2rem,22rem)]">
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-border bg-card shadow-md">
        <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t(`contexts.${match.contextId}`)}
            </p>
            <h2 className="mt-0.5 text-sm font-medium">{t("title")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("progress", { done: doneCount, total: steps.length })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={t("collapse")}
              onClick={() => persistCollapsed(true)}
            >
              <Minus className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              disabled={pending}
              aria-label={t("dismiss")}
              onClick={dismissContext}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <ul className="divide-y divide-border/70">
          {steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/30"
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full",
                    step.done
                      ? "bg-success text-success-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {step.done ? (
                    <Check className="size-3" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm",
                    step.done && "text-muted-foreground line-through",
                  )}
                >
                  {t(`steps.${step.id}`)}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="border-t border-border px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full text-xs text-muted-foreground"
            disabled={pending}
            onClick={hideEverywhere}
          >
            {t("hideEverywhere")}
          </Button>
        </div>
      </div>
    </div>
  );
}
