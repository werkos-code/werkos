"use client";

import { ListTodo } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import {
  DashboardEmptyCta,
  DashboardSurface,
  DashboardSurfaceHeader,
} from "@/features/dashboard/components/dashboard-surface";
import {
  createUserTodo,
  setUserTodoCompleted,
  updateUserTodoTitle,
  type DashboardPersonalTodo,
} from "@/features/dashboard/dashboard-actions";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function DashboardPrivateTodosCard({
  personalTodos,
}: {
  personalTodos: DashboardPersonalTodo[];
}) {
  const t = useTranslations("dashboard.private.todos");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
              ? t("unavailable")
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

  const openTodos = personalTodos.filter((todo) => !todo.completedAt);
  const showEmpty = personalTodos.length === 0;

  return (
    <DashboardSurface className="flex min-h-72 flex-col">
      <DashboardSurfaceHeader title={t("title")} />
      <div className="flex flex-1 flex-col">
        {showEmpty ? (
          <DashboardEmptyCta
            icon={ListTodo}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            ctaLabel={t("cta")}
            onClick={() => {
              const input = document.getElementById(
                "dashboard-private-todo-input",
              ) as HTMLInputElement | null;
              input?.focus();
            }}
          />
        ) : (
          <ul className="flex-1 divide-y divide-border/60">
            {personalTodos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center gap-3 px-5 py-2.5"
              >
                <input
                  type="checkbox"
                  checked={Boolean(todo.completedAt)}
                  onChange={() => toggleTodo(todo)}
                  disabled={isPending}
                  className="size-4 shrink-0 accent-primary"
                  aria-label={todo.title}
                />
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
                    className={cn(
                      "min-w-0 flex-1 truncate text-left text-sm",
                      todo.completedAt &&
                        "text-muted-foreground line-through",
                    )}
                    onClick={() => {
                      setEditingId(todo.id);
                      setEditTitle(todo.title);
                    }}
                  >
                    {todo.title}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-border/60 px-5 py-3">
          <Input
            id="dashboard-private-todo-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addTodo();
            }}
            placeholder={t("placeholder")}
            disabled={isPending}
            className="h-9"
          />
          {error ? (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          ) : openTodos.length > 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("openCount", { count: openTodos.length })}
            </p>
          ) : null}
        </div>
      </div>
    </DashboardSurface>
  );
}
