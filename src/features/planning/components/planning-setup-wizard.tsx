"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DEFAULT_PLANNING_WORK_DAYS,
  minutesPerWorkDay,
  type PlanningSettings,
} from "@/features/planning/lib/planning-settings";
import { cn } from "@/lib/utils";

const WEEKDAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

type PlanningSetupWizardProps = {
  open: boolean;
  initial: PlanningSettings;
  onComplete: (settings: PlanningSettings) => void;
};

export function PlanningSetupWizard({
  open,
  initial,
  onComplete,
}: PlanningSetupWizardProps) {
  const t = useTranslations("planning.setup");
  const tWeekdays = useTranslations("planning.weekdays");
  const tCommon = useTranslations("common");
  const [workDays, setWorkDays] = useState<number[]>(initial.workDays);
  const [dayStartHour, setDayStartHour] = useState(initial.dayStartHour);
  const [dayEndHour, setDayEndHour] = useState(initial.dayEndHour);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hoursPerDay = minutesPerWorkDay({
    workDays,
    dayStartHour,
    dayEndHour,
    setupCompleted: false,
  });

  function toggleDay(day: number) {
    setWorkDays((current) =>
      current.includes(day)
        ? current.filter((entry) => entry !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  function submit() {
    if (workDays.length === 0) {
      setError(t("workDaysRequired"));
      return;
    }
    if (dayEndHour <= dayStartHour) {
      setError(t("hoursInvalid"));
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch("/api/planning/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workDays,
              dayStartHour,
              dayEndHour,
              markComplete: true,
            }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await res.json()) as {
            error?: string;
            settings?: PlanningSettings;
          };
          if (!res.ok || result.error || !result.settings) {
            setError(result.error ?? tCommon("error"));
            return;
          }
          onComplete(result.settings);
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t("description")}</p>

        <div className="space-y-4 pt-2">
          <div>
            <p className="mb-2 text-sm font-medium">{t("workDays")}</p>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_KEYS.map((key, index) => {
                const day = index + 1;
                const active = workDays.includes(day);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={isPending}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tWeekdays(key)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("startHour")}</span>
              <select
                value={dayStartHour}
                onChange={(event) =>
                  setDayStartHour(Number(event.target.value))
                }
                disabled={isPending}
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("endHour")}</span>
              <select
                value={dayEndHour}
                onChange={(event) => setDayEndHour(Number(event.target.value))}
                disabled={isPending}
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
              >
                {Array.from({ length: 24 }, (_, hour) => hour + 1).map(
                  (hour) => (
                    <option key={hour} value={hour}>
                      {String(hour).padStart(2, "0")}:00
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>

          <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {t("hoursHint")}
          </p>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={() => {
                startTransition(() => {
                  void (async () => {
                    try {
                      const res = await fetch("/api/planning/settings", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          workDays: [...DEFAULT_PLANNING_WORK_DAYS],
                          dayStartHour: 7,
                          dayEndHour: 17,
                          markComplete: true,
                        }),
                        signal: AbortSignal.timeout(20_000),
                      });
                      const result = (await res.json()) as {
                        settings?: PlanningSettings;
                      };
                      onComplete(
                        result.settings ?? {
                          workDays: [...DEFAULT_PLANNING_WORK_DAYS],
                          dayStartHour: 7,
                          dayEndHour: 17,
                          setupCompleted: true,
                        },
                      );
                    } catch {
                      onComplete({
                        workDays: [...DEFAULT_PLANNING_WORK_DAYS],
                        dayStartHour: 7,
                        dayEndHour: 17,
                        setupCompleted: true,
                      });
                    }
                  })();
                });
              }}
              variant="ghost"
            >
              {t("skip")}
            </Button>
            <Button type="button" size="sm" disabled={isPending} onClick={submit}>
              {isPending ? tCommon("loading") : t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
