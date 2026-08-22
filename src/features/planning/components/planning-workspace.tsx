"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageCard } from "@/features/shell/components/page-card";
import type { StaffOption } from "@/features/projects/projects-actions";
import {
  AppointmentDialog,
  toLocalInputValue,
} from "@/features/planning/components/appointment-dialog";
import { PlanningAgendaView } from "@/features/planning/components/planning-agenda-view";
import { PlanningConflictDialog } from "@/features/planning/components/planning-conflict-dialog";
import { PlanningDayView } from "@/features/planning/components/planning-day-view";
import {
  PlanningActiveFilterChip,
  PlanningFilterCombobox,
} from "@/features/planning/components/planning-filter-combobox";
import { PlanningMonthView } from "@/features/planning/components/planning-month-view";
import {
  PlanningUnplannedRail,
  UnplannedDragOverlayCard,
} from "@/features/planning/components/planning-unplanned-rail";
import { PlanningResourceGrid } from "@/features/planning/components/planning-resource-grid";
import {
  CalendarEventOverlay,
  PlanningWeekGrid,
} from "@/features/planning/components/planning-week-grid";
import { PlanningSetupWizard } from "@/features/planning/components/planning-setup-wizard";
import { hoursForSettings } from "@/features/planning/lib/planning-display";
import {
  computeEndAcrossWorkDays,
  type PlanningSettings,
} from "@/features/planning/lib/planning-settings";
import {
  createAppointment,
  updateAppointment,
} from "@/features/planning/lib/planning-client";
import { planningDropTargetFromId } from "@/features/planning/lib/planning-drop-target";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_TYPES,
  PLANNING_HOUR_HEIGHT,
  addDays,
  addMonths,
  dropMinutesFromPointer,
  durationMinutes,
  findAssigneeConflicts,
  formatDurationHours,
  formatTimeRange,
  isSameDay,
  minutesToDateOnDay,
  parseDateKey,
  parseIsoDate,
  startOfMonth,
  startOfWeek,
  toDateKey,
  type AppointmentRow,
  type CalendarDragData,
  type PlanningProjectOption,
  type UnplannedWorkItem,
} from "@/features/planning/lib/planning";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week" | "month" | "agenda";
type WeekLayout = "days" | "people";

type PlanningWorkspaceProps = {
  appointments: AppointmentRow[];
  unplanned: UnplannedWorkItem[];
  projects: PlanningProjectOption[];
  staff: StaffOption[];
  initialWeekStart: string;
  planningSettings: PlanningSettings;
};

type PendingMove = {
  assigneeUserId: string | null;
  assigneeName: string | null;
  startsAt: string;
  endsAt: string;
  conflicts: AppointmentRow[];
  apply: () => Promise<void>;
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
  appointments: initialAppointments,
  unplanned: initialUnplanned,
  projects,
  staff,
  initialWeekStart,
  planningSettings: initialPlanningSettings,
}: PlanningWorkspaceProps) {
  const t = useTranslations("planning");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [view, setView] = useState<ViewMode>("week");
  const [weekLayout, setWeekLayout] = useState<WeekLayout>("days");
  const [anchor, setAnchor] = useState(() => new Date(initialWeekStart));
  const [resourceDay, setResourceDay] = useState(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return today;
  });
  const [query, setQuery] = useState("");
  const [unplannedQuery, setUnplannedQuery] = useState("");
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
    assigneeUserId?: string | null;
  }>({});
  const [planningSettings, setPlanningSettings] = useState(initialPlanningSettings);
  const [showSetupWizard, setShowSetupWizard] = useState(
    !initialPlanningSettings.setupCompleted,
  );
  const [localAppointments, setLocalAppointments] = useState(initialAppointments);
  const [localUnplanned, setLocalUnplanned] = useState(initialUnplanned);
  const [activeDrag, setActiveDrag] = useState<CalendarDragData | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<string | null>(null);
  const [dropPreviewMinutes, setDropPreviewMinutes] = useState<number | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => new Date());

  const columnRefs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    setPlanningSettings(initialPlanningSettings);
    setShowSetupWizard(!initialPlanningSettings.setupCompleted);
  }, [initialPlanningSettings]);

  useEffect(() => {
    setLocalAppointments(initialAppointments);
    setLocalUnplanned(initialUnplanned);
  }, [initialAppointments, initialUnplanned]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 10 },
    }),
  );

  const weekStart = startOfWeek(anchor, 1);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const filteredAppointments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return localAppointments.filter((item) => {
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
  }, [
    localAppointments,
    query,
    projectFilter,
    personFilter,
    typeFilter,
    statusFilter,
  ]);

  const filteredUnplanned = useMemo(() => {
    const q = unplannedQuery.trim().toLowerCase();
    return localUnplanned.filter((item) => {
      if (projectFilter !== "all" && item.projectId !== projectFilter) return false;
      if (personFilter !== "all" && item.assigneeUserId !== personFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.projectName.toLowerCase().includes(q) ||
        (item.assigneeName ?? "").toLowerCase().includes(q)
      );
    });
  }, [localUnplanned, unplannedQuery, projectFilter, personFilter]);

  const selected =
    filteredAppointments.find((item) => item.id === selectedId) ??
    localAppointments.find((item) => item.id === selectedId) ??
    null;

  const periodLabel = useMemo(() => {
    if (view === "day") {
      return new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(anchor);
    }
    if (view === "month") {
      return new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
      }).format(anchor);
    }
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
  }, [anchor, locale, view, weekStart]);

  const hours = useMemo(
    () => hoursForSettings(planningSettings),
    [planningSettings],
  );
  const gridHeight =
    (planningSettings.dayEndHour - planningSettings.dayStartHour) *
    PLANNING_HOUR_HEIGHT;

  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        value: project.id,
        label: project.name,
        hint: project.customerName ?? null,
      })),
    [projects],
  );

  const staffOptions = useMemo(
    () =>
      staff.map((member) => ({
        value: member.id,
        label: member.name,
        initials: initials(member.name),
      })),
    [staff],
  );

  const resourceStaff = useMemo(() => {
    if (personFilter !== "all") {
      return staff.filter((member) => member.id === personFilter);
    }
    return staff;
  }, [staff, personFilter]);

  function staffNameById(id: string | null | undefined) {
    if (!id) return null;
    return staff.find((member) => member.id === id)?.name ?? null;
  }

  const hasActiveFilters =
    projectFilter !== "all" ||
    personFilter !== "all" ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    query.trim().length > 0;

  useEffect(() => {
    const inWeek = days.some((day) => isSameDay(day, resourceDay));
    if (!inWeek) {
      const today = new Date();
      const inCurrentWeek = days.some((day) => isSameDay(day, today));
      setResourceDay(inCurrentWeek ? today : days[0]!);
    }
  }, [days, resourceDay]);

  const onColumnRef = useCallback((key: string, node: HTMLDivElement | null) => {
    if (node) columnRefs.current.set(key, node);
    else columnRefs.current.delete(key);
  }, []);

  function openCreate(defaults?: {
    startsAt?: string;
    endsAt?: string;
    workItem?: UnplannedWorkItem | null;
    assigneeUserId?: string | null;
  }) {
    setEditing(null);
    setScheduleItem(defaults?.workItem ?? null);
    setDraftDefaults({
      startsAt: defaults?.startsAt,
      endsAt: defaults?.endsAt,
      assigneeUserId: defaults?.assigneeUserId,
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

  function handleSlotClick(
    day: Date,
    minutesFromStart: number,
    assigneeUserId?: string | null,
  ) {
    const start = minutesToDateOnDay(
      day,
      minutesFromStart,
      planningSettings.dayStartHour,
    );
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 60);
    openCreate({
      startsAt: toLocalInputValue(start.toISOString()),
      endsAt: toLocalInputValue(end.toISOString()),
      assigneeUserId,
    });
  }

  function navigatePrev() {
    if (view === "day") setAnchor(addDays(anchor, -1));
    else if (view === "month") setAnchor(addMonths(anchor, -1));
    else setAnchor(addDays(weekStart, -7));
  }

  function navigateNext() {
    if (view === "day") setAnchor(addDays(anchor, 1));
    else if (view === "month") setAnchor(addMonths(anchor, 1));
    else setAnchor(addDays(weekStart, 7));
  }

  function clearFilters() {
    setQuery("");
    setProjectFilter("all");
    setPersonFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
  }

  async function persistMove(
    payload: {
      kind: "create" | "update";
      appointmentId?: string;
      title: string;
      startsAt: string;
      endsAt: string;
      projectId?: string | null;
      workItemId?: string | null;
      assigneeUserId?: string | null;
      type?: AppointmentRow["type"];
      status?: AppointmentRow["status"];
      allDay?: boolean;
    },
    rollback: () => void,
  ) {
    try {
      if (payload.kind === "create") {
        const id = await createAppointment({
          title: payload.title,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          projectId: payload.projectId,
          workItemId: payload.workItemId,
          assigneeUserId: payload.assigneeUserId,
          type: payload.type ?? "work",
          status: payload.status ?? "planned",
        });
        setLocalAppointments((current) =>
          current.map((item) =>
            item.id.startsWith("temp:") &&
            item.startsAt === payload.startsAt &&
            item.title === payload.title
              ? { ...item, id }
              : item,
          ),
        );
      } else if (payload.appointmentId) {
        await updateAppointment({
          id: payload.appointmentId,
          title: payload.title,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          assigneeUserId: payload.assigneeUserId,
          allDay: payload.allDay,
        });
      }
      router.refresh();
    } catch {
      rollback();
      toast.error(t("saveFailed"));
    }
  }

  function applyOptimisticMove(
    nextAppointments: AppointmentRow[],
    nextUnplanned?: UnplannedWorkItem[],
  ) {
    const prevAppointments = localAppointments;
    const prevUnplanned = localUnplanned;
    setLocalAppointments(nextAppointments);
    if (nextUnplanned) setLocalUnplanned(nextUnplanned);
    return () => {
      setLocalAppointments(prevAppointments);
      if (nextUnplanned) setLocalUnplanned(prevUnplanned);
    };
  }

  function scheduleWithConflictCheck(
    assigneeUserId: string | null,
    assigneeName: string | null,
    startsAt: string,
    endsAt: string,
    excludeId: string | undefined,
    apply: () => Promise<void>,
  ) {
    const conflicts = findAssigneeConflicts(
      localAppointments,
      assigneeUserId,
      startsAt,
      endsAt,
      excludeId,
    );
    if (conflicts.length > 0 && assigneeUserId) {
      setPendingMove({
        assigneeUserId,
        assigneeName,
        startsAt,
        endsAt,
        conflicts,
        apply,
      });
      return;
    }
    void apply();
  }

  function onDragStart(event: DragStartEvent) {
    const data = event.active.data.current as CalendarDragData | undefined;
    if (data) setActiveDrag(data);
  }

  function onDragMove(event: DragMoveEvent) {
    const overId = event.over?.id ? String(event.over.id) : null;
    const target = overId ? planningDropTargetFromId(overId) : null;
    if (!target) {
      setActiveDropColumn(null);
      setDropPreviewMinutes(null);
      return;
    }
    const column = columnRefs.current.get(target.columnKey);
    if (!column) return;
    const rect = column.getBoundingClientRect();
    const translated = event.active.rect.current.translated;
    const dropY = (translated?.top ?? 0) + (translated?.height ?? 0) / 2;
    const minutes = dropMinutesFromPointer(
      dropY,
      rect.top,
      planningSettings.dayStartHour,
      planningSettings.dayEndHour,
    );
    setActiveDropColumn(target.columnKey);
    setDropPreviewMinutes(minutes);
  }

  function resolveDropRange(start: Date, durationMinutes: number) {
    const endsAt = computeEndAcrossWorkDays(
      start,
      durationMinutes,
      planningSettings,
    );
    return { startsAt: start.toISOString(), endsAt: endsAt.toISOString() };
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    setActiveDropColumn(null);
    setDropPreviewMinutes(null);

    const data = event.active.data.current as CalendarDragData | undefined;
    const overId = event.over?.id ? String(event.over.id) : null;
    const target = overId ? planningDropTargetFromId(overId) : null;
    if (!data || !target) return;

    const day = parseDateKey(target.dateKey);
    const column = columnRefs.current.get(target.columnKey);
    if (!column) return;

    const rect = column.getBoundingClientRect();
    const translated = event.active.rect.current.translated;
    const dropY = (translated?.top ?? 0) + (translated?.height ?? 0) / 2;
    const minutes = dropMinutesFromPointer(
      dropY,
      rect.top,
      planningSettings.dayStartHour,
      planningSettings.dayEndHour,
    );
    const start = minutesToDateOnDay(
      day,
      minutes,
      planningSettings.dayStartHour,
    );
    const { startsAt, endsAt } = resolveDropRange(start, data.durationMinutes);

    const assigneeOverride =
      target.kind === "resource" ? target.assigneeUserId : undefined;

    if (data.kind === "unplanned") {
      const item = data.item;
      const nextAssigneeId =
        assigneeOverride !== undefined ? assigneeOverride : item.assigneeUserId;
      const nextAssigneeName = staffNameById(nextAssigneeId) ?? item.assigneeName;

      const optimistic: AppointmentRow = {
        id: `temp:${item.id}`,
        title: item.title,
        startsAt,
        endsAt,
        allDay: false,
        status: "planned",
        type: "work",
        projectId: item.projectId,
        projectName: item.projectName,
        workItemId: item.id,
        workItemTitle: item.title,
        assigneeUserId: nextAssigneeId,
        assigneeName: nextAssigneeName,
        location: null,
        notes: null,
      };

      const rollback = applyOptimisticMove(
        [...localAppointments, optimistic],
        localUnplanned.filter((entry) => entry.id !== item.id),
      );

      scheduleWithConflictCheck(
        nextAssigneeId,
        nextAssigneeName,
        startsAt,
        endsAt,
        undefined,
        () =>
          persistMove(
            {
              kind: "create",
              title: item.title,
              startsAt,
              endsAt,
              projectId: item.projectId,
              workItemId: item.id,
              assigneeUserId: nextAssigneeId,
            },
            rollback,
          ),
      );
      return;
    }

    const item = data.item;
    const nextAssigneeId =
      assigneeOverride !== undefined ? assigneeOverride : item.assigneeUserId;
    const nextAssigneeName =
      assigneeOverride !== undefined
        ? staffNameById(nextAssigneeId)
        : item.assigneeName;

    if (item.id.startsWith("work:")) {
      openCreate({
        workItem: {
          id: item.workItemId!,
          title: item.title,
          projectId: item.projectId!,
          projectName: item.projectName ?? "—",
          status: "open",
          estimatedMinutes: null,
          assigneeUserId: nextAssigneeId,
          assigneeName: nextAssigneeName,
          category: null,
        },
        startsAt: toLocalInputValue(startsAt),
        endsAt: toLocalInputValue(endsAt),
        assigneeUserId: nextAssigneeId,
      });
      return;
    }

    const nextItem: AppointmentRow = {
      ...item,
      startsAt,
      endsAt,
      assigneeUserId: nextAssigneeId,
      assigneeName: nextAssigneeName,
    };
    const rollback = applyOptimisticMove(
      localAppointments.map((entry) => (entry.id === item.id ? nextItem : entry)),
    );

    scheduleWithConflictCheck(
      nextAssigneeId,
      nextAssigneeName,
      startsAt,
      endsAt,
      item.id,
      () =>
        persistMove(
          {
            kind: "update",
            appointmentId: item.id,
            title: item.title,
            startsAt,
            endsAt,
            assigneeUserId: nextAssigneeId,
            allDay: item.allDay,
          },
          rollback,
        ),
    );
  }

  function handleEventResize(item: AppointmentRow, newEndIso: string) {
    if (item.id.startsWith("work:")) return;
    const nextItem = { ...item, endsAt: newEndIso };
    const rollback = applyOptimisticMove(
      localAppointments.map((entry) => (entry.id === item.id ? nextItem : entry)),
    );

    scheduleWithConflictCheck(
      item.assigneeUserId,
      item.assigneeName,
      item.startsAt,
      newEndIso,
      item.id,
      () =>
        persistMove(
          {
            kind: "update",
            appointmentId: item.id,
            title: item.title,
            startsAt: item.startsAt,
            endsAt: newEndIso,
            assigneeUserId: item.assigneeUserId,
            allDay: item.allDay,
          },
          rollback,
        ),
    );
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
          toast.error(tCommon("error"));
          return;
        }
        setSelectedId(null);
        setLocalAppointments((current) => current.filter((item) => item.id !== id));
        router.refresh();
      })();
    });
  }

  const timedEvents = filteredAppointments.filter((item) => !item.allDay);
  const allDayEvents = filteredAppointments.filter((item) => item.allDay);

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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setAnchor(new Date());
              if (view === "month") setView("week");
            }}
          >
            {t("today")}
          </Button>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={navigatePrev}
              aria-label={t("prev")}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[10rem] text-center text-sm font-medium">
              {periodLabel}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={navigateNext}
              aria-label={t("next")}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const start = new Date();
              start.setMinutes(0, 0, 0);
              if (start.getHours() < planningSettings.dayStartHour) {
                start.setHours(planningSettings.dayStartHour);
              }
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
        <div className="flex flex-col gap-2">
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
            <PlanningFilterCombobox
              label={t("filters.projectLabel")}
              placeholder={t("filters.allProjects")}
              searchPlaceholder={t("filters.projectSearch")}
              emptyLabel={t("filters.noResults")}
              allLabel={t("filters.allProjects")}
              value={projectFilter}
              options={projectOptions}
              onChange={setProjectFilter}
            />
            <PlanningFilterCombobox
              label={t("filters.personLabel")}
              placeholder={t("filters.allPeople")}
              searchPlaceholder={t("filters.personSearch")}
              emptyLabel={t("filters.noResults")}
              allLabel={t("filters.allPeople")}
              value={personFilter}
              options={staffOptions}
              onChange={setPersonFilter}
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm"
            >
              <option value="all">{t("filters.allTypes")}</option>
              {APPOINTMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`types.${type}`)}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border-input bg-background h-9 rounded-lg border px-2.5 text-sm"
            >
              <option value="all">{t("filters.allStatuses")}</option>
              {APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(`statuses.${status}`)}
                </option>
              ))}
            </select>
          </div>

          {hasActiveFilters ? (
            <div className="flex flex-wrap items-center gap-2">
              {projectFilter !== "all" ? (
                <PlanningActiveFilterChip
                  label={`${t("filters.projectLabel")}: ${projects.find((p) => p.id === projectFilter)?.name ?? "—"}`}
                  onClear={() => setProjectFilter("all")}
                />
              ) : null}
              {personFilter !== "all" ? (
                <PlanningActiveFilterChip
                  label={`${t("filters.personLabel")}: ${staff.find((s) => s.id === personFilter)?.name ?? "—"}`}
                  onClear={() => setPersonFilter("all")}
                />
              ) : null}
              {typeFilter !== "all" ? (
                <PlanningActiveFilterChip
                  label={`${t("detail.type")}: ${t(`types.${typeFilter}`)}`}
                  onClear={() => setTypeFilter("all")}
                />
              ) : null}
              {statusFilter !== "all" ? (
                <PlanningActiveFilterChip
                  label={`${t("detail.status")}: ${t(`statuses.${statusFilter}`)}`}
                  onClear={() => setStatusFilter("all")}
                />
              ) : null}
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                {t("filters.clear")}
              </Button>
            </div>
          ) : null}
        </div>
      </PageCard>

      <DndContext
        sensors={sensors}
        collisionDetection={(args) => {
          const pointerCollisions = pointerWithin(args);
          if (pointerCollisions.length > 0) return pointerCollisions;
          return closestCenter(args);
        }}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4">
          {view === "week" ? (
            <PageCard className="min-w-0 flex-1 overflow-hidden p-0">
              <div className="flex min-h-[36rem] flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                  <div className="bg-muted/40 inline-flex rounded-lg p-0.5">
                    {(["days", "people"] as WeekLayout[]).map((layout) => (
                      <button
                        key={layout}
                        type="button"
                        onClick={() => setWeekLayout(layout)}
                        className={cn(
                          "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                          weekLayout === layout
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {t(`weekLayout.${layout}`)}
                      </button>
                    ))}
                  </div>
                  {weekLayout === "people" ? (
                    <div className="flex flex-wrap gap-1">
                      {days.map((day) => {
                        const key = toDateKey(day);
                        const active = isSameDay(day, resourceDay);
                        const today = isSameDay(day, now);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setResourceDay(day)}
                            className={cn(
                              "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                              active
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                              today && !active && "ring-1 ring-primary/30",
                            )}
                          >
                            {new Intl.DateTimeFormat(locale, {
                              weekday: "short",
                              day: "numeric",
                            }).format(day)}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="flex min-h-0 flex-1">
                  <PlanningUnplannedRail
                    items={filteredUnplanned}
                    query={unplannedQuery}
                    onQueryChange={setUnplannedQuery}
                  />
                  <div className="min-w-0 flex-1 overflow-x-auto overflow-y-auto">
                    {filteredAppointments.length === 0 &&
                    filteredUnplanned.length === 0 ? (
                      <div className="flex min-h-[20rem] items-center justify-center p-8 text-center text-sm text-muted-foreground">
                        {hasActiveFilters ? t("emptyFiltered") : t("emptyCalendar")}
                      </div>
                    ) : weekLayout === "people" ? (
                      resourceStaff.length === 0 ? (
                        <div className="flex min-h-[20rem] items-center justify-center p-8 text-center text-sm text-muted-foreground">
                          {t("resourceEmptyStaff")}
                        </div>
                      ) : (
                        <PlanningResourceGrid
                          day={resourceDay}
                          locale={locale}
                          now={now}
                          staff={resourceStaff}
                          includeUnassigned={personFilter === "all"}
                          hours={hours}
                          gridHeight={gridHeight}
                          settings={planningSettings}
                          timedEvents={timedEvents}
                          allDayEvents={allDayEvents}
                          selectedId={selectedId}
                          activeDropColumn={activeDropColumn}
                          dropPreviewMinutes={dropPreviewMinutes}
                          dropPreviewDurationMinutes={
                            activeDrag?.durationMinutes ?? 60
                          }
                          unassignedLabel={t("noAssignee")}
                          onColumnRef={onColumnRef}
                          onSlotClick={handleSlotClick}
                          onEventClick={(item) => setSelectedId(item.id)}
                          onEventDoubleClick={openEdit}
                          onAllDayClick={(item) => setSelectedId(item.id)}
                          onEventResize={handleEventResize}
                        />
                      )
                    ) : (
                      <PlanningWeekGrid
                        days={days}
                        hours={hours}
                        gridHeight={gridHeight}
                        locale={locale}
                        now={now}
                        settings={planningSettings}
                        allDayLabel={t("allDay")}
                        timedEvents={timedEvents}
                        allDayEvents={allDayEvents}
                        selectedId={selectedId}
                        activeDropColumn={activeDropColumn}
                        dropPreviewMinutes={dropPreviewMinutes}
                        dropPreviewDurationMinutes={
                          activeDrag?.durationMinutes ?? 60
                        }
                        onColumnRef={onColumnRef}
                        onSlotClick={handleSlotClick}
                        onEventClick={(item) => setSelectedId(item.id)}
                        onEventDoubleClick={openEdit}
                        onAllDayClick={(item) => setSelectedId(item.id)}
                        onEventResize={handleEventResize}
                      />
                    )}
                  </div>
                </div>
              </div>
            </PageCard>
          ) : (
            <PageCard className="min-w-0 flex-1 overflow-hidden p-0">
              {view === "day" ? (
                <PlanningDayView
                  day={anchor}
                  locale={locale}
                  now={now}
                  events={filteredAppointments}
                  selectedId={selectedId}
                  onSlotClick={handleSlotClick}
                  onEventClick={(item) => {
                    setSelectedId(item.id);
                    openEdit(item);
                  }}
                />
              ) : null}
              {view === "month" ? (
                <PlanningMonthView
                  month={startOfMonth(anchor)}
                  locale={locale}
                  now={now}
                  events={filteredAppointments}
                  selectedId={selectedId}
                  onDayClick={(day) => {
                    setAnchor(day);
                    setView("day");
                  }}
                  onEventClick={(item) => {
                    setSelectedId(item.id);
                    openEdit(item);
                  }}
                />
              ) : null}
              {view === "agenda" ? (
                <PlanningAgendaView
                  rangeStart={weekStart}
                  rangeEnd={addDays(weekStart, 13)}
                  locale={locale}
                  events={filteredAppointments}
                  selectedId={selectedId}
                  onEventClick={(item) => {
                    setSelectedId(item.id);
                    openEdit(item);
                  }}
                />
              ) : null}
            </PageCard>
          )}

          {selected ? (
            <PageCard className="hidden w-[22rem] shrink-0 flex-col p-0 xl:flex">
              <div className="flex items-start justify-between gap-2 border-b border-border p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold">
                      {selected.projectName ?? selected.title}
                    </h3>
                    <Badge variant="secondary">{t(`statuses.${selected.status}`)}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {selected.workItemTitle ?? selected.title}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSelectedId(null)}
                  aria-label={tCommon("close")}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <div className="space-y-3 border-b border-border p-4 text-sm">
                <p className="inline-flex items-center gap-2 text-muted-foreground">
                  <CalendarIcon className="size-3.5" />
                  {new Intl.DateTimeFormat(locale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(parseIsoDate(selected.startsAt))}
                </p>
                <p className="inline-flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-3.5" />
                  {selected.allDay
                    ? t("allDay")
                    : `${formatTimeRange(selected.startsAt, selected.endsAt, locale)} (${formatDurationHours(durationMinutes(selected.startsAt, selected.endsAt))})`}
                </p>
                <p className="inline-flex items-center gap-2 text-muted-foreground">
                  <Users className="size-3.5" />
                  {selected.assigneeName ?? t("noAssignee")}
                </p>
                {selected.projectId ? (
                  <Link
                    href={`/projecten/${selected.projectId}`}
                    className="text-primary inline-flex items-center gap-2 hover:underline"
                  >
                    <MapPin className="size-3.5" />
                    {selected.projectName}
                  </Link>
                ) : null}
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                <div>
                  <h4 className="text-sm font-medium">{t("detail.description")}</h4>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {selected.notes?.trim() || t("detail.descriptionEmpty")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    size="sm"
                    disabled={isPending}
                    onClick={() => openEdit(selected)}
                  >
                    <Pencil className="size-3.5" />
                    {t("edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={isPending || selected.id.startsWith("work:")}
                    onClick={() => deleteAppointment(selected.id)}
                    aria-label={t("delete")}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </div>
              </div>
            </PageCard>
          ) : null}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDrag?.kind === "unplanned" ? (
            <UnplannedDragOverlayCard item={activeDrag.item} />
          ) : null}
          {activeDrag?.kind === "event" ? (
            <CalendarEventOverlay item={activeDrag.item} locale={locale} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <PlanningConflictDialog
        open={pendingMove !== null}
        assigneeName={pendingMove?.assigneeName ?? t("noAssignee")}
        conflicts={pendingMove?.conflicts ?? []}
        locale={locale}
        onCancel={() => setPendingMove(null)}
        onConfirm={() => {
          const move = pendingMove;
          setPendingMove(null);
          if (move) void move.apply();
        }}
      />

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

      <PlanningSetupWizard
        open={showSetupWizard}
        initial={planningSettings}
        onComplete={(settings) => {
          setPlanningSettings(settings);
          setShowSetupWizard(false);
          router.refresh();
        }}
      />
    </div>
  );
}
