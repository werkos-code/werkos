"use client";

import {
  CalendarPlus,
  Clock3,
  FileText,
  FolderPlus,
  Receipt,
  UserPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useOrgAccessOptional } from "@/features/billing/components/org-access-provider";
import { WriteGateLink } from "@/features/billing/components/write-gate-link";
import { hoursInputToMinutes } from "@/features/time/lib/time-entry";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { toDateTimeLocalValue } from "@/features/dashboard/lib/dates";
import type {
  DashboardProjectOption,
  DashboardWorkItemOption,
} from "@/features/dashboard/dashboard-actions";

type QuickActionId =
  | "project"
  | "quote"
  | "customer"
  | "hours"
  | "invoice"
  | "schedule";

type DialogId = "quote" | "hours" | "invoice" | "schedule";

type DashboardQuickActionsProps = {
  projects: DashboardProjectOption[];
  workItems: DashboardWorkItemOption[];
  currentUserId: string;
  cardClassName?: string;
};

function nextHourRange() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return { start, end };
}

export function DashboardQuickActions({
  projects,
  workItems,
  currentUserId,
  cardClassName,
}: DashboardQuickActionsProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tQuotes = useTranslations("quotes");
  const router = useRouter();
  const orgAccess = useOrgAccessOptional();
  const canWrite = orgAccess?.access.canWrite ?? true;
  const [dialog, setDialog] = useState<DialogId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [projectId, setProjectId] = useState("");
  const [workItemId, setWorkItemId] = useState("");
  const [title, setTitle] = useState("");
  const [hours, setHours] = useState("1");
  const [workDate, setWorkDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [kind, setKind] = useState<"task" | "appointment">("task");
  const [startsAt, setStartsAt] = useState(() =>
    toDateTimeLocalValue(nextHourRange().start),
  );
  const [endsAt, setEndsAt] = useState(() =>
    toDateTimeLocalValue(nextHourRange().end),
  );

  const projectWorkItems = useMemo(
    () => workItems.filter((item) => item.projectId === projectId),
    [workItems, projectId],
  );

  const actions: Array<{
    id: QuickActionId;
    href?: string;
    dialog?: DialogId;
    icon: typeof FolderPlus;
    iconBg: string;
  }> = [
    {
      id: "project",
      href: "/opdrachten/nieuw",
      icon: FolderPlus,
      iconBg: "bg-[#2563EB]",
    },
    {
      id: "quote",
      dialog: "quote",
      icon: FileText,
      iconBg: "bg-[#0D9488]",
    },
    {
      id: "customer",
      href: "/klanten/nieuw",
      icon: UserPlus,
      iconBg: "bg-[#EA580C]",
    },
    {
      id: "hours",
      dialog: "hours",
      icon: Clock3,
      iconBg: "bg-[#0284C7]",
    },
    {
      id: "invoice",
      dialog: "invoice",
      icon: Receipt,
      iconBg: "bg-[#059669]",
    },
    {
      id: "schedule",
      dialog: "schedule",
      icon: CalendarPlus,
      iconBg: "bg-[#DB2777]",
    },
  ];

  function openDialog(id: DialogId) {
    if (!canWrite) {
      orgAccess?.openPaywall();
      return;
    }
    setError(null);
    setProjectId(projects[0]?.id ?? "");
    setWorkItemId("");
    setTitle("");
    setHours("1");
    setWorkDate(new Date().toISOString().slice(0, 10));
    setKind("task");
    const range = nextHourRange();
    setStartsAt(toDateTimeLocalValue(range.start));
    setEndsAt(toDateTimeLocalValue(range.end));
    setDialog(id);
  }

  function closeDialog() {
    if (isPending) return;
    setDialog(null);
    setError(null);
  }

  function submitQuote() {
    if (!projectId) {
      setError(t("dialogs.projectRequired"));
      return;
    }
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/quotes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId,
              title: tQuotes("defaultTitle"),
            }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as {
            error?: string;
            quoteId?: string;
          };
          if (!response.ok || !result.quoteId) {
            setError(result.error || tCommon("error"));
            return;
          }
          setDialog(null);
          router.push(`/projecten/${projectId}/offertes/${result.quoteId}`);
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  function submitInvoice() {
    if (!projectId || !title.trim()) {
      setError(t("dialogs.invoiceRequired"));
      return;
    }
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/invoices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              projectId,
              status: "draft",
              issueDate: new Date().toISOString().slice(0, 10),
              editorMode: true,
            }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as {
            error?: string;
            invoiceId?: string;
          };
          if (!response.ok || !result.invoiceId) {
            setError(result.error || tCommon("error"));
            return;
          }
          setDialog(null);
          router.push(`/facturen/${result.invoiceId}`);
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  function submitHours() {
    const minutes = hoursInputToMinutes(hours);
    if (!workItemId || minutes == null || minutes <= 0) {
      setError(t("dialogs.hoursRequired"));
      return;
    }
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/time-entries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workItemId,
              minutes,
              workDate,
            }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as { error?: string };
          if (!response.ok || result.error) {
            setError(result.error || tCommon("error"));
            return;
          }
          setDialog(null);
          router.refresh();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  function submitSchedule() {
    if (!title.trim()) {
      setError(t("dialogs.titleRequired"));
      return;
    }
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          if (kind === "task") {
            if (!projectId) {
              setError(t("dialogs.projectRequired"));
              return;
            }
            const response = await fetch("/api/work-items", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                projectId,
                title: title.trim(),
                assigneeUserId: currentUserId,
              }),
              signal: AbortSignal.timeout(20_000),
            });
            const result = (await response.json()) as {
              error?: string;
            };
            if (!response.ok || result.error) {
              setError(result.error || tCommon("error"));
              return;
            }
            setDialog(null);
            router.push(`/projecten/${projectId}?tab=work`);
            return;
          }
          const response = await fetch("/api/appointments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              startsAt: new Date(startsAt).toISOString(),
              endsAt: new Date(endsAt).toISOString(),
              projectId: projectId || null,
              assigneeUserId: currentUserId,
            }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as { error?: string };
          if (!response.ok || result.error) {
            setError(result.error || tCommon("error"));
            return;
          }
          setDialog(null);
          router.push("/planning");
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  return (
    <>
      <div className={cn("space-y-3", cardClassName)}>
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              {t("quickActions.title")}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("quickActions.subtitle")}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            const body = (
              <>
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-white",
                    action.iconBg,
                  )}
                >
                  <Icon className="size-4" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold transition-colors group-hover:text-primary">
                  {t(`quickActions.${action.id}.title`)}
                </span>
              </>
            );
            const className =
              "group flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.04]";
            if (action.href) {
              return (
                <WriteGateLink
                  key={action.id}
                  href={action.href}
                  className={className}
                  paywallContext={
                    action.id === "project" ? "newProject" : "generic"
                  }
                >
                  {body}
                </WriteGateLink>
              );
            }
            return (
              <button
                key={action.id}
                type="button"
                className={className}
                onClick={() => openDialog(action.dialog!)}
              >
                {body}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>
              {dialog ? t(`dialogs.${dialog}.title`) : ""}
            </DialogTitle>
          </DialogHeader>

          {dialog === "quote" ? (
            <div className="space-y-3">
              <ProjectSelect
                value={projectId}
                onChange={setProjectId}
                projects={projects}
                disabled={isPending}
              />
            </div>
          ) : null}

          {dialog === "invoice" ? (
            <div className="space-y-3">
              <Field label={t("dialogs.invoiceTitle")}>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={isPending}
                />
              </Field>
              <ProjectSelect
                value={projectId}
                onChange={setProjectId}
                projects={projects}
                disabled={isPending}
              />
            </div>
          ) : null}

          {dialog === "hours" ? (
            <div className="space-y-3">
              <ProjectSelect
                value={projectId}
                onChange={(value) => {
                  setProjectId(value);
                  setWorkItemId("");
                }}
                projects={projects}
                disabled={isPending}
              />
              <Field label={t("dialogs.workItem")}>
                <select
                  value={workItemId}
                  onChange={(event) => setWorkItemId(event.target.value)}
                  disabled={isPending || projectWorkItems.length === 0}
                  className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
                >
                  <option value="">{t("dialogs.selectWorkItem")}</option>
                  {projectWorkItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </Field>
              {projectId && projectWorkItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("dialogs.noWorkItems")}
                </p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("dialogs.hoursAmount")}>
                  <Input
                    value={hours}
                    onChange={(event) => setHours(event.target.value)}
                    disabled={isPending}
                    inputMode="decimal"
                  />
                </Field>
                <Field label={t("dialogs.date")}>
                  <Input
                    type="date"
                    value={workDate}
                    onChange={(event) => setWorkDate(event.target.value)}
                    disabled={isPending}
                  />
                </Field>
              </div>
            </div>
          ) : null}

          {dialog === "schedule" ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card p-0.5">
                <div className="grid grid-cols-2 gap-0.5">
                  {(["task", "appointment"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setKind(value)}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-sm transition-colors",
                        kind === value
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t(`dialogs.kind.${value}`)}
                    </button>
                  ))}
                </div>
              </div>
              <Field label={t("dialogs.titleLabel")}>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={isPending}
                />
              </Field>
              <ProjectSelect
                value={projectId}
                onChange={setProjectId}
                projects={projects}
                disabled={isPending}
                optional={kind === "appointment"}
              />
              {kind === "appointment" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("dialogs.startsAt")}>
                    <Input
                      type="datetime-local"
                      value={startsAt}
                      onChange={(event) => setStartsAt(event.target.value)}
                      disabled={isPending}
                    />
                  </Field>
                  <Field label={t("dialogs.endsAt")}>
                    <Input
                      type="datetime-local"
                      value={endsAt}
                      onChange={(event) => setEndsAt(event.target.value)}
                      disabled={isPending}
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={isPending}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (dialog === "quote") submitQuote();
                if (dialog === "invoice") submitInvoice();
                if (dialog === "hours") submitHours();
                if (dialog === "schedule") submitSchedule();
              }}
            >
              {isPending ? tCommon("loading") : t("dialogs.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ProjectSelect({
  value,
  onChange,
  projects,
  disabled,
  optional = false,
}: {
  value: string;
  onChange: (value: string) => void;
  projects: DashboardProjectOption[];
  disabled?: boolean;
  optional?: boolean;
}) {
  const t = useTranslations("dashboard");
  return (
    <Field label={t("dialogs.project")}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="border-input bg-background h-9 w-full rounded-lg border px-2.5 text-sm"
      >
        <option value="">
          {optional ? t("dialogs.projectOptional") : t("dialogs.selectProject")}
        </option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
