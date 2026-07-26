"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StaffOption } from "@/features/projects/projects-actions";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  type AppointmentRow,
  type PlanningProjectOption,
  type UnplannedWorkItem,
} from "@/features/planning/lib/planning";
import type { AppointmentStatus, AppointmentType } from "@/types/database";

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInputValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

type AppointmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AppointmentRow | null;
  scheduleItem: UnplannedWorkItem | null;
  defaults: { startsAt?: string; endsAt?: string };
  projects: PlanningProjectOption[];
  staff: StaffOption[];
  onSaved: () => void;
};

export function AppointmentDialog({
  open,
  onOpenChange,
  editing,
  scheduleItem,
  defaults,
  projects,
  staff,
  onSaved,
}: AppointmentDialogProps) {
  const t = useTranslations("planning");
  const tCommon = useTranslations("common");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [type, setType] = useState<AppointmentType>("work");
  const [status, setStatus] = useState<AppointmentStatus>("planned");
  const [projectId, setProjectId] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setStartsAt(toLocalInputValue(editing.startsAt));
      setEndsAt(toLocalInputValue(editing.endsAt));
      setAllDay(editing.allDay);
      setType(editing.type);
      setStatus(editing.status);
      setProjectId(editing.projectId ?? "");
      setAssigneeUserId(editing.assigneeUserId ?? "");
      setLocation(editing.location ?? "");
      setNotes(editing.notes ?? "");
    } else {
      setTitle(scheduleItem?.title ?? "");
      setStartsAt(defaults.startsAt ?? "");
      setEndsAt(defaults.endsAt ?? "");
      setAllDay(false);
      setType("work");
      setStatus("planned");
      setProjectId(scheduleItem?.projectId ?? "");
      setAssigneeUserId(scheduleItem?.assigneeUserId ?? "");
      setLocation("");
      setNotes("");
    }
    setError(null);
  }, [open, editing, scheduleItem, defaults.startsAt, defaults.endsAt]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const startIso = fromLocalInputValue(startsAt);
    const endIso = fromLocalInputValue(endsAt);
    if (!title.trim() || !startIso || !endIso) {
      setError(t("form.required"));
      return;
    }
    startTransition(() => {
      void (async () => {
        try {
          const payload = {
            ...(editing ? { id: editing.id } : {}),
            title: title.trim(),
            startsAt: startIso,
            endsAt: endIso,
            allDay,
            type,
            status,
            projectId: projectId || null,
            workItemId: scheduleItem?.id ?? editing?.workItemId ?? null,
            assigneeUserId: assigneeUserId || null,
            location: location || null,
            notes: notes || null,
          };
          const res = await fetch("/api/appointments", {
            method: editing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await res.json()) as { error?: string };
          if (!res.ok || result.error) {
            setError(result.error || tCommon("error"));
            return;
          }
          onSaved();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {editing
              ? t("form.editTitle")
              : scheduleItem
                ? t("form.scheduleTitle")
                : t("form.createTitle")}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          {scheduleItem ? (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {t("form.schedulingWorkItem", {
                title: scheduleItem.title,
                project: scheduleItem.projectName,
              })}
            </p>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">{t("form.title")}</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isPending}
              className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("form.startsAt")}</span>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                disabled={isPending}
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("form.endsAt")}</span>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                disabled={isPending}
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
                required
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) => setAllDay(event.target.checked)}
              disabled={isPending}
            />
            {t("allDay")}
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("form.project")}</span>
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                disabled={isPending || Boolean(scheduleItem)}
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
              >
                <option value="">{t("form.noProject")}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("form.assignee")}</span>
              <select
                value={assigneeUserId}
                onChange={(event) => setAssigneeUserId(event.target.value)}
                disabled={isPending}
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
              >
                <option value="">{t("noAssignee")}</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("detail.type")}</span>
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as AppointmentType)
                }
                disabled={isPending}
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
              >
                {APPOINTMENT_TYPES.map((entry) => (
                  <option key={entry} value={entry}>
                    {t(`types.${entry}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">{t("detail.status")}</span>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as AppointmentStatus)
                }
                disabled={isPending}
                className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
              >
                {APPOINTMENT_STATUSES.map((entry) => (
                  <option key={entry} value={entry}>
                    {t(`statuses.${entry}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">{t("detail.location")}</span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              disabled={isPending}
              className="border-input bg-background h-9 w-full rounded-lg border px-2.5"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">
              {t("detail.description")}
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isPending}
              rows={3}
              className="border-input bg-background w-full rounded-lg border px-2.5 py-2"
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? tCommon("loading") : tCommon("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { toLocalInputValue };
