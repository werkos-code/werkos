"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import {
  createUserTodo,
  setUserTodoCompleted,
  updateUserTodoTitle,
  type DashboardAssignedTask,
  type DashboardPersonalTodo,
} from "@/features/dashboard/dashboard-actions";
import { dayDelta, formatShortDate } from "@/features/dashboard/lib/dates";
import { PageCard } from "@/features/shell/components/page-card";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type DashboardTasksCardProps = {
  personalTodos: DashboardPersonalTodo[];
  assignedTasks: DashboardAssignedTask[];
  locale: string;
};

function DueMeta({
  iso,
  locale,
  overdue,
}: {
  iso: string | null;
  locale: string;
  overdue?: boolean;
}) {
  const t = useTranslations("dashboard");
  if (!iso) return <span className="text-xs text-muted-foreground">—</span>;
  const delta = dayDelta(iso);
  let label = formatShortDate(iso, locale);
  if (delta === 0) label = t("relative.today");
  else if (delta === -1) label = t("relative.yesterday");
  else if (delta != null && delta < -1 && delta >= -14) {
    label = t("relative.daysAgo", { count: Math.abs(delta) });
  }
  return (
    <span
      className={cn(
        "shrink-0 text-xs",
        overdue || (delta != null && delta < 0)
          ? "text-destructive"
          : "text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export function DashboardTasksCard({
  personalTodos,
  assignedTasks,
  locale,
}: DashboardTasksCardProps) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const empty = personalTodos.length === 0 && assignedTasks.length === 0;

  function refresh() {
    router.refresh();
  }

  function addTodo() {
    const title = draft.trim();
    if (!title) return;
    setError(null);
    startTransition(() => {
      void (async () => {
        const result = await createUserTodo(title);
        if (result.error) {
          setError(
            result.error === "todos_unavailable"
              ? t("tasks.todosUnavailable")
              : tCommon("error"),
          );
          return;
        }
        setDraft("");
        refresh();
      })();
    });
  }

  function toggleTodo(todo: DashboardPersonalTodo) {
    startTransition(() => {
      void (async () => {
        const result = await setUserTodoCompleted(todo.id, !todo.completedAt);
        if (result.error) {
          setError(tCommon("error"));
          return;
        }
        refresh();
      })();
    });
  }

  function saveTodoTitle(id: string) {
    const title = editTitle.trim();
    if (!title) {
      setEditingId(null);
      return;
    }
    startTransition(() => {
      void (async () => {
        const result = await updateUserTodoTitle(id, title);
        if (result.error) {
          setError(tCommon("error"));
          return;
        }
        setEditingId(null);
        refresh();
      })();
    });
  }

  function toggleWorkItem(task: DashboardAssignedTask) {
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/work-items", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: task.id,
              status: task.status === "done" ? "open" : "done",
            }),
            signal: AbortSignal.timeout(20_000),
          });
          if (!response.ok) {
            setError(tCommon("error"));
            return;
          }
          refresh();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  return (
    <PageCard className="flex min-h-64 flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">{t("tasks.title")}</h2>
      </div>
      <div className="flex-1">
        {empty ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            {t("tasks.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {personalTodos.map((todo) => (
              <li key={todo.id} className="flex items-center gap-3 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={Boolean(todo.completedAt)}
                  onChange={() => toggleTodo(todo)}
                  disabled={isPending}
                  className="size-4 shrink-0 accent-primary"
                  aria-label={todo.title}
                />
                <div className="min-w-0 flex-1">
                  {editingId === todo.id ? (
                    <Input
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      onBlur={() => saveTodoTitle(todo.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") saveTodoTitle(todo.id);
                        if (event.key === "Escape") setEditingId(null);
                      }}
                      className="h-8"
                      autoFocus
                      disabled={isPending}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(todo.id);
                        setEditTitle(todo.title);
                      }}
                      className={cn(
                        "block w-full truncate text-left text-sm font-medium",
                        todo.completedAt && "text-muted-foreground line-through",
                      )}
                    >
                      {todo.title}
                    </button>
                  )}
                </div>
                <DueMeta iso={todo.dueDate} locale={locale} />
              </li>
            ))}
            {assignedTasks.map((task) => (
              <li key={task.id} className="flex items-center gap-3 px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={task.status === "done"}
                  onChange={() => toggleWorkItem(task)}
                  disabled={isPending}
                  className="size-4 shrink-0 accent-primary"
                  aria-label={task.title}
                />
                <Link
                  href={`/projecten/${task.projectId}?tab=work`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {task.projectName}
                  </p>
                </Link>
                <DueMeta
                  iso={task.plannedEnd}
                  locale={locale}
                  overdue={task.overdue}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="border-t border-border px-4 py-2.5">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            addTodo();
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("tasks.addPlaceholder")}
            className="h-8"
            disabled={isPending}
          />
        </form>
        {error ? (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        ) : null}
        <Link
          href="/werkzaamheden"
          className="mt-2 inline-flex text-sm text-primary hover:underline"
        >
          {t("tasks.viewAll")}
        </Link>
      </div>
    </PageCard>
  );
}
