"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageCard } from "@/features/shell/components/page-card";
import type { StaffOption } from "@/features/projects/projects-actions";
import {
  AppointmentDialog,
  toLocalInputValue,
} from "@/features/planning/components/appointment-dialog";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  PLANNING_DAY_END_HOUR,
  PLANNING_DAY_START_HOUR,
  PLANNING_HOUR_HEIGHT,
  addDays,
  durationMinutes,
  formatDurationHours,
  formatHourLabel,
  formatTimeRange,
  isSameDay,
  minutesSinceDayStart,
  parseIsoDate,
  planningColorForKey,
  startOfWeek,
  toDateKey,
  type AppointmentRow,
  type PlanningProjectOption,
  type UnplannedWorkItem,
} from "@/features/planning/lib/planning";
import { formatEstimatedHours } from "@/features/projects/lib/work-item";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week" | "month" | "agenda";

type PlanningWorkspaceProps = {
  appointments: AppointmentRow[];
  unplanned: UnplannedWorkItem[];
  projects: PlanningProjectOption[];
  staff: StaffOption[];
  initialWeekStart: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PlanningWorkspace({
  appointments,
  unplanned,
  projects,
  staff,
  initialWeekStart,
}: PlanningWorkspaceProps) {
  const t = useTranslations("planning");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => new Date(initialWeekStart));
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [personFilter, setPersonFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentRow | null>(null);
  const [scheduleItem, setScheduleItem] = useState<UnplannedWorkItem | null>(null);
  const [draftDefaults, setDraftDefaults] = useState<{
    startsAt?: string;
    endsAt?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const weekStart = startOfWeek(anchor, 1);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const filteredAppointments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments.filter((item) => {
      if (projectFilter !== "all" && item.projectId !== projectFilter) return false;
      if (personFilter !== "all" && item.assigneeUserId !== personFilter) return false;
      if (typeFilter !== "all" && item.type !== typeFilter) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.projectName ?? "").toLowerCase().includes(q) ||
        (item.assigneeName ?? "").toLowerCase().includes(q) ||
        (item.workItemTitle ?? "").toLowerCase().includes(q)
      );
    });
  }, [appointments, query, projectFilter, personFilter, typeFilter, statusFilter]);

  const filteredUnplanned = useMemo(() => {
    const q = query.trim().toLowerCase();
    return unplanned.filter((item) => {
      if (projectFilter !== "all" && item.projectId !== projectFilter) return false;
      if (personFilter !== "all" && item.assigneeUserId !== personFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.projectName.toLowerCase().includes(q) ||
        (item.assigneeName ?? "").toLowerCase().includes(q)
      );
    });
  }, [unplanned, query, projectFilter, personFilter]);

  const selected =
    filteredAppointments.find((item) => item.id === selectedId) ??
    appointments.find((item) => item.id === selectedId) ??
    null;

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6);
    const fmt = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const short = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
    });
    return `${short.format(weekStart)} – ${fmt.format(end)}`;
  }, [weekStart, locale]);

  const hours = useMemo(
    () =>
      Array.from(
        { length: PLANNING_DAY_END_HOUR - PLANNING_DAY_START_HOUR },
        (_, index) => PLANNING_DAY_START_HOUR + index,
      ),
    [],
  );
  const gridHeight =
    (PLANNING_DAY_END_HOUR - PLANNING_DAY_START_HOUR) * PLANNING_HOUR_HEIGHT;

  function openCreate(defaults?: {
    startsAt?: string;
    endsAt?: string;
    workItem?: UnplannedWorkItem | null;
  }) {
    setEditing(null);
    setScheduleItem(defaults?.workItem ?? null);
    setDraftDefaults({
      startsAt: defaults?.startsAt,
      endsAt: defaults?.endsAt,
    });
    setDialogOpen(true);
  }

  function openEdit(item: AppointmentRow) {
    if (item.id.startsWith("work:")) {
      setScheduleItem({
        id: item.workItemId!,
        title: item.title,
        projectId: item.projectId!,
        projectName: item.projectName ?? "—",
        status: "open",
        estimatedMinutes: null,
        assigneeUserId: item.assigneeUserId,
        assigneeName: item.assigneeName,
        category: null,
      });
      setEditing(null);
      setDraftDefaults({
        startsAt: toLocalInputValue(item.startsAt),
        endsAt: toLocalInputValue(item.endsAt),
      });
      setDialogOpen(true);
      return;
    }
    setScheduleItem(null);
    setEditing(item);
    setDraftDefaults({});
    setDialogOpen(true);
  }

  function deleteAppointment(id: string) {
    if (id.startsWith("work:")) return;
    if (!window.confirm(t("deleteConfirm"))) return;
    startTransition(() => {
      void (async () => {
        const res = await fetch("/api/appointments", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!res.ok) {
          setError(tCommon("error"));
          return;
        }
        setSelectedId(null);
        router.refresh();
      })();
    });
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {(["day", "week", "month", "agenda"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={cn(
                  "px-3 py-1.5 text-sm transition-colors",
                  view === mode
                    ? "border-b-2 border-primary font-medium text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`views.${mode}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            {t("today")}
          </Button>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setAnchor(addDays(weekStart, -7))} aria-label={t("prev")}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[10rem] text-center text-sm font-medium">{weekLabel}</span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setAnchor(addDays(weekStart, 7))} aria-label={t("next")}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button type="button" variant="outline" size="icon-sm" disabled>
            <CalendarIcon className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" disabled>
            <Filter className="size-3.5" />
            {t("filtersButton")}
          </Button>
          <Button type="button" variant="outline" size="icon-sm" disabled>
            <Settings className="size-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const start = new Date();
              start.setMinutes(0, 0, 0);
              if (start.getHours() < PLANNING_DAY_START_HOUR) start.setHours(PLANNING_DAY_START_HOUR);
              const end = new Date(start);
              end.setHours(start.getHours() + 2);
              openCreate({
                startsAt: toLocalInputValue(start.toISOString()),
                endsAt: toLocalInputValue(end.toISOString()),
              });
            }}
          >
            <Plus className="size-3.5" />
            {t("newAppointment")}
          </Button>
        </div>
      </div>

      <PageCard className="p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="border-input bg-background h-9 w-full rounded-lg border pr-3 pl-9 text-sm outline-none"
            />
          </div>
          <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm">
            <option value="all">{t("filters.allProjects")}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm">
            <option value="all">{t("filters.allPeople")}</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm">
            <option value="all">{t("filters.allTypes")}</option>
            {APPOINTMENT_TYPES.map((type) => (
              <option key={type} value={type}>{t(`types.${type}`)}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm">
            <option value="all">{t("filters.allStatuses")}</option>
            {APPOINTMENT_STATUSES.map((status) => (
              <option key={status} value={status}>{t(`statuses.${status}`)}</option>
            ))}
          </select>
        </div>
      </PageCard>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {view !== "week" ? (
        <PageCard className="p-8 text-center">
          <h3 className="text-sm font-medium">{t(`views.${view}`)}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("viewComingSoon")}</p>
          <Button type="button" size="sm" className="mt-4" onClick={() => setView("week")}>
            {t("backToWeek")}
          </Button>
        </PageCard>
      ) : (
        <div className="flex gap-4">
          <PageCard className="min-w-0 flex-1 overflow-hidden p-0">
            <div className="flex min-h-[36rem]">
              <aside className="w-52 shrink-0 border-r border-border bg-muted/20">
                <div className="border-b border-border px-3 py-2.5">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t("unplanned")}
                  </h3>
                </div>
                <ul className="max-h-[40rem] space-y-2 overflow-y-auto p-2">
                  {filteredUnplanned.length === 0 ? (
                    <li className="px-1 py-3 text-xs text-muted-foreground">{t("unplannedEmpty")}</li>
                  ) : (
                    filteredUnplanned.map((item) => {
                      const color = planningColorForKey(item.projectId);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            className={cn("w-full rounded-lg border px-2.5 py-2 text-left transition-colors hover:bg-card", color.bg, color.border, color.text)}
                            onClick={() => {
                              const start = new Date(weekStart);
                              start.setHours(9, 0, 0, 0);
                              const end = new Date(weekStart);
                              end.setHours(11, 0, 0, 0);
                              openCreate({
                                workItem: item,
                                startsAt: toLocalInputValue(start.toISOString()),
                                endsAt: toLocalInputValue(end.toISOString()),
                              });
                            }}
                          >
                            <p className="truncate text-sm font-medium">{item.title}</p>
                            <p className="truncate text-[11px] opacity-80">{item.projectName}</p>
                            <div className="mt-1.5 flex items-center justify-between gap-1">
                              <span className="text-[11px] opacity-70">{formatEstimatedHours(item.estimatedMinutes)}</span>
                              {item.assigneeName ? (
                                <span className="bg-background/70 flex size-5 items-center justify-center rounded-full text-[9px] font-medium">
                                  {initials(item.assigneeName)}
                                </span>
                              ) : null}
                            </div>
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </aside>

              <div className="min-w-0 flex-1 overflow-x-auto">
                <div className="min-w-[52rem]">
                  <div className="grid border-b border-border" style={{ gridTemplateColumns: "3.5rem repeat(7, minmax(0, 1fr))" }}>
                    <div className="border-r border-border" />
                    {days.map((day) => {
                      const today = isSameDay(day, now);
                      return (
                        <div key={toDateKey(day)} className="border-r border-border px-2 py-2 text-center last:border-r-0">
                          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                            {new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day)}
                          </p>
                          <p className={cn("mx-auto mt-1 flex size-8 items-center justify-center rounded-full text-sm font-semibold", today && "bg-primary text-primary-foreground")}>
                            {day.getDate()}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid border-b border-border" style={{ gridTemplateColumns: "3.5rem repeat(7, minmax(0, 1fr))" }}>
                    <div className="border-r border-border px-1 py-2 text-[10px] text-muted-foreground">{t("allDay")}</div>
                    {days.map((day) => {
                      const key = toDateKey(day);
                      const items = filteredAppointments.filter((item) => {
                        if (!item.allDay) return false;
                        const start = parseIsoDate(item.startsAt);
                        const end = parseIsoDate(item.endsAt);
                        const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
                        const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
                        return start <= dayEnd && end >= dayStart;
                      });
                      return (
                        <div key={`allday-${key}`} className="min-h-12 space-y-1 border-r border-border p-1 last:border-r-0">
                          {items.map((item) => {
                            const color = planningColorForKey(item.projectId ?? item.id);
                            return (
                              <button
                                key={`${item.id}-${key}`}
                                type="button"
                                onClick={() => setSelectedId(item.id)}
                                className={cn("block w-full truncate rounded-md border px-1.5 py-1 text-left text-[11px] font-medium", color.bg, color.border, color.text, selectedId === item.id && "ring-2 ring-primary/40")}
                              >
                                {item.title}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: "3.5rem repeat(7, minmax(0, 1fr))" }}>
                    <div className="relative border-r border-border">
                      {hours.map((hour) => (
                        <div key={hour} className="border-b border-border/70 pr-1 text-right text-[10px] text-muted-foreground" style={{ height: PLANNING_HOUR_HEIGHT }}>
                          <span className="-translate-y-1.5 inline-block">{formatHourLabel(hour)}</span>
                        </div>
                      ))}
                    </div>

                    {days.map((day) => {
                      const key = toDateKey(day);
                      const dayEvents = filteredAppointments.filter((item) => !item.allDay && isSameDay(parseIsoDate(item.startsAt), day));
                      const showNow = isSameDay(day, now);
                      const nowTop = minutesSinceDayStart(now) * (PLANNING_HOUR_HEIGHT / 60);
                      return (
                        <div
                          key={`grid-${key}`}
                          className="relative border-r border-border last:border-r-0"
                          style={{ height: gridHeight }}
                          onDoubleClick={(event) => {
                            const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                            const y = event.clientY - rect.top;
                            const minutesFromStart = Math.max(0, Math.floor(y / (PLANNING_HOUR_HEIGHT / 60) / 30) * 30);
                            const start = new Date(day);
                            start.setHours(PLANNING_DAY_START_HOUR, 0, 0, 0);
                            start.setMinutes(start.getMinutes() + minutesFromStart);
                            const end = new Date(start);
                            end.setHours(end.getHours() + 1);
                            openCreate({
                              startsAt: toLocalInputValue(start.toISOString()),
                              endsAt: toLocalInputValue(end.toISOString()),
                            });
                          }}
                        >
                          {hours.map((hour) => (
                            <div key={`${key}-${hour}`} className="border-b border-border/60" style={{ height: PLANNING_HOUR_HEIGHT }} />
                          ))}
                          {showNow && nowTop >= 0 && nowTop <= gridHeight ? (
                            <div className="pointer-events-none absolute right-0 left-0 z-20" style={{ top: nowTop }}>
                              <div className="relative border-t-2 border-red-500">
                                <span className="absolute -top-2.5 -left-1 rounded bg-red-500 px-1 text-[9px] font-medium text-white">
                                  {new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(now)}
                                </span>
                              </div>
                            </div>
                          ) : null}
                          {dayEvents.map((item) => {
                            const start = parseIsoDate(item.startsAt);
                            const mins = minutesSinceDayStart(start);
                            const dur = Math.max(30, durationMinutes(item.startsAt, item.endsAt));
                            const top = (mins / 60) * PLANNING_HOUR_HEIGHT;
                            const height = (dur / 60) * PLANNING_HOUR_HEIGHT;
                            const color = planningColorForKey(item.projectId ?? item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelectedId(item.id)}
                                onDoubleClick={(event) => {
                                  event.stopPropagation();
                                  openEdit(item);
                                }}
                                className={cn("absolute right-1 left-1 z-10 overflow-hidden rounded-lg border px-2 py-1 text-left shadow-sm transition-shadow hover:shadow-md", color.bg, color.border, color.text, selectedId === item.id && "ring-2 ring-primary/50")}
                                style={{ top: Math.max(0, top), height: Math.max(28, height - 2) }}
                              >
                                <p className="truncate text-[10px] font-medium opacity-80">{formatTimeRange(item.startsAt, item.endsAt, locale)}</p>
                                {item.projectName ? <p className="truncate text-[10px] opacity-70">{item.projectName}</p> : null}
                                <p className="truncate text-xs font-semibold">
                                  {item.workItemTitle && item.workItemTitle !== item.title ? item.workItemTitle : item.title}
                                </p>
                                {item.assigneeName ? <p className="mt-0.5 truncate text-[10px] opacity-80">{item.assigneeName}</p> : null}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </PageCard>

          {selected ? (
            <PageCard className="hidden w-[22rem] shrink-0 flex-col p-0 xl:flex">
              <div className="flex items-start justify-between gap-2 border-b border-border p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold">{selected.projectName ?? selected.title}</h3>
                    <Badge variant="secondary">{t(`statuses.${selected.status}`)}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{selected.workItemTitle ?? selected.title}</p>
                </div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setSelectedId(null)} aria-label={tCommon("close")}>
                  <X className="size-4" />
                </Button>
              </div>
              <div className="space-y-3 border-b border-border p-4 text-sm">
                <p className="inline-flex items-center gap-2 text-muted-foreground">
                  <CalendarIcon className="size-3.5" />
                  {new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(parseIsoDate(selected.startsAt))}
                </p>
                <p className="inline-flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-3.5" />
                  {selected.allDay ? t("allDay") : `${formatTimeRange(selected.startsAt, selected.endsAt, locale)} (${formatDurationHours(durationMinutes(selected.startsAt, selected.endsAt))})`}
                </p>
                <p className="inline-flex items-center gap-2 text-muted-foreground">
                  <Users className="size-3.5" />
                  {selected.assigneeName ?? t("noAssignee")}
                </p>
                {selected.projectId ? (
                  <Link href={`/werk/projecten/${selected.projectId}`} className="text-primary inline-flex items-center gap-2 hover:underline">
                    <MapPin className="size-3.5" />
                    {selected.projectName}
                  </Link>
                ) : null}
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <div>
                  <h4 className="text-sm font-medium">{t("detail.description")}</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selected.notes?.trim() || t("detail.descriptionEmpty")}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">{t("detail.location")}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{selected.location?.trim() || "—"}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("detail.type")}</p>
                    <p className="mt-0.5 font-medium">{t(`types.${selected.type}`)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("detail.status")}</p>
                    <Badge className="mt-0.5" variant="secondary">{t(`statuses.${selected.status}`)}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" className="flex-1" size="sm" disabled={isPending} onClick={() => openEdit(selected)}>
                    <Pencil className="size-3.5" />
                    {t("edit")}
                  </Button>
                  <Button type="button" variant="outline" size="icon-sm" disabled={isPending || selected.id.startsWith("work:")} onClick={() => deleteAppointment(selected.id)} aria-label={t("delete")}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium">{t("detail.participants")}</h4>
                  {selected.assigneeName ? (
                    <div className="flex items-center gap-3">
                      <span className="bg-muted flex size-8 items-center justify-center rounded-full text-xs font-medium">{initials(selected.assigneeName)}</span>
                      <div>
                        <p className="text-sm font-medium">{selected.assigneeName}</p>
                        <p className="text-xs text-muted-foreground">{t("detail.assigneeRole")}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("noAssignee")}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">{t("detail.multiParticipantSoon")}</p>
                </div>
              </div>
            </PageCard>
          ) : null}
        </div>
      )}

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        scheduleItem={scheduleItem}
        defaults={draftDefaults}
        projects={projects}
        staff={staff}
        onSaved={() => {
          setDialogOpen(false);
          setEditing(null);
          setScheduleItem(null);
          router.refresh();
        }}
      />
    </div>
  );
}
