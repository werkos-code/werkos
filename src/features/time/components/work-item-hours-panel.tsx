"use client";

import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatEstimatedHours } from "@/features/projects/lib/work-item";
import type { StaffOption } from "@/features/projects/projects-actions";
import { PageCard } from "@/features/shell/components/page-card";
import {
  hoursInputToMinutes,
  minutesToHoursInput,
  type TimeEntryRow,
} from "@/features/time/lib/time-entry";

type WorkItemHoursPanelProps = {
  workItemId: string;
  isGroup: boolean;
  estimatedMinutes: number | null;
  /** When set (groups), skip entry sum and show this total. */
  actualMinutesOverride?: number | null;
  staff: StaffOption[];
  onChanged: () => void;
  /** Called after expected hours are saved so parent draft stays in sync. */
  onEstimatedSaved?: (minutes: number | null) => void;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatWorkDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${iso}T12:00:00`));
  } catch {
    return iso;
  }
}

export function WorkItemHoursPanel({
  workItemId,
  isGroup,
  estimatedMinutes,
  actualMinutesOverride,
  staff,
  onChanged,
  onEstimatedSaved,
}: WorkItemHoursPanelProps) {
  const t = useTranslations("projects.workItems.detail.time");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workDate, setWorkDate] = useState(todayIso);
  const [hoursDraft, setHoursDraft] = useState("");
  const [userId, setUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedDraft, setExpectedDraft] = useState(
    minutesToHoursInput(estimatedMinutes),
  );
  const [expectedFocused, setExpectedFocused] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!expectedFocused) {
      setExpectedDraft(minutesToHoursInput(estimatedMinutes));
    }
  }, [estimatedMinutes, expectedFocused]);

  const totalMinutes = useMemo(() => {
    if (actualMinutesOverride != null) return actualMinutesOverride;
    return entries.reduce((sum, entry) => sum + entry.minutes, 0);
  }, [actualMinutesOverride, entries]);

  async function loadEntries() {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(
        `/api/time-entries?workItemId=${encodeURIComponent(workItemId)}`,
        { signal: AbortSignal.timeout(20_000) },
      );
      const result = (await response.json()) as {
        entries?: TimeEntryRow[];
        error?: string;
      };
      if (!response.ok || result.error) {
        setLoadError(tCommon("error"));
        setEntries([]);
        return;
      }
      setEntries(result.entries ?? []);
    } catch {
      setLoadError(tCommon("error"));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isGroup) {
      setEntries([]);
      setLoading(false);
      return;
    }
    void loadEntries();
  }, [workItemId, isGroup]);

  function submitEntry() {
    if (isGroup) return;
    setFormError(null);
    const minutes = hoursInputToMinutes(hoursDraft);
    if (minutes == null || minutes <= 0) {
      setFormError(t("invalidHours"));
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/time-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workItemId,
            workDate,
            minutes,
            userId: userId || null,
            notes: notes.trim() || null,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok || result.error) {
          setFormError(
            result.error === "group_not_allowed"
              ? t("groupBlocked")
              : tCommon("error"),
          );
          return;
        }
        setHoursDraft("");
        setNotes("");
        await loadEntries();
        onChanged();
      } catch {
        setFormError(tCommon("error"));
      }
    });
  }

  function deleteEntry(id: string) {
    startTransition(async () => {
      setFormError(null);
      try {
        const response = await fetch("/api/time-entries", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
          signal: AbortSignal.timeout(20_000),
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok || result.error) {
          setFormError(tCommon("error"));
          return;
        }
        await loadEntries();
        onChanged();
      } catch {
        setFormError(tCommon("error"));
      }
    });
  }

  function saveExpected() {
    if (isGroup) return;
    const next = hoursInputToMinutes(expectedDraft.replace(",", "."));
    const normalized =
      next == null ? null : next <= 0 ? null : next;
    const current = estimatedMinutes ?? null;
    if (normalized === current) {
      setExpectedDraft(minutesToHoursInput(current));
      return;
    }

    startTransition(async () => {
      setFormError(null);
      try {
        const response = await fetch("/api/work-items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: workItemId,
            estimatedMinutes: normalized,
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) {
          setFormError(tCommon("error"));
          setExpectedDraft(minutesToHoursInput(estimatedMinutes));
          return;
        }
        setExpectedDraft(minutesToHoursInput(normalized));
        onEstimatedSaved?.(normalized);
        onChanged();
      } catch {
        setFormError(tCommon("error"));
        setExpectedDraft(minutesToHoursInput(estimatedMinutes));
      }
    });
  }

  return (
    <div className="space-y-4">
      <PageCard className="grid gap-3 p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">{t("expected")}</p>
          {isGroup ? (
            <p className="mt-0.5 text-lg font-medium tabular-nums">
              {formatEstimatedHours(estimatedMinutes)}
            </p>
          ) : (
            <label className="mt-1 block space-y-1">
              <Input
                inputMode="decimal"
                value={expectedDraft}
                disabled={isPending}
                placeholder={t("expectedPlaceholder")}
                onFocus={() => setExpectedFocused(true)}
                onChange={(event) => setExpectedDraft(event.target.value)}
                onBlur={() => {
                  setExpectedFocused(false);
                  saveExpected();
                }}
                className="h-10 max-w-[8rem] font-mono text-lg tabular-nums"
              />
              <span className="text-xs text-muted-foreground">
                {t("expectedHint")}
              </span>
            </label>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("actual")}</p>
          <p className="mt-0.5 text-lg font-medium tabular-nums">
            {formatEstimatedHours(totalMinutes || null)}
          </p>
        </div>
      </PageCard>

      {isGroup ? (
        <PageCard className="p-4">
          <p className="text-sm text-muted-foreground">{t("groupHint")}</p>
        </PageCard>
      ) : (
        <PageCard className="space-y-3 p-4">
          <h3 className="text-sm font-medium">{t("addTitle")}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("date")}</span>
              <Input
                type="date"
                value={workDate}
                disabled={isPending}
                onChange={(event) => setWorkDate(event.target.value)}
                className="h-9"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("hours")}</span>
              <Input
                inputMode="decimal"
                value={hoursDraft}
                disabled={isPending}
                placeholder={t("hoursPlaceholder")}
                onChange={(event) => setHoursDraft(event.target.value)}
                className="h-9 font-mono tabular-nums"
              />
            </label>
            <label className="block space-y-1 text-sm sm:col-span-2 lg:col-span-1">
              <span className="text-muted-foreground">{t("person")}</span>
              <select
                value={userId}
                disabled={isPending}
                onChange={(event) => setUserId(event.target.value)}
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
              >
                <option value="">{t("personSelf")}</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm sm:col-span-2 lg:col-span-1">
              <span className="text-muted-foreground">{t("notes")}</span>
              <Input
                value={notes}
                disabled={isPending}
                placeholder={t("notesPlaceholder")}
                onChange={(event) => setNotes(event.target.value)}
                className="h-9"
              />
            </label>
          </div>
          {formError ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={isPending}
            onClick={submitEntry}
          >
            {t("add")}
          </Button>
        </PageCard>
      )}

      <PageCard className="p-4">
        <h3 className="mb-3 text-sm font-medium">{t("entriesTitle")}</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        ) : loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {isGroup ? t("groupEntriesHint") : t("empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {formatEstimatedHours(entry.minutes)}
                    <span className="ml-2 font-normal text-muted-foreground">
                      {formatWorkDate(entry.workDate, locale)}
                    </span>
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {entry.userName}
                    {entry.notes ? ` · ${entry.notes}` : ""}
                  </p>
                </div>
                {!isGroup ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending}
                    aria-label={t("delete")}
                    onClick={() => deleteEntry(entry.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </PageCard>
    </div>
  );
}
