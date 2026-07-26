"use client";

import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkItemRow } from "@/features/projects/lib/work-item";
import { PageCard } from "@/features/shell/components/page-card";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type ProjectWorkItemsPanelProps = {
  projectId: string;
  workItems: WorkItemRow[];
  compact?: boolean;
};

export function ProjectWorkItemsPanel({
  projectId,
  workItems,
  compact = false,
}: ProjectWorkItemsPanelProps) {
  const t = useTranslations("projects");
  const tQuotes = useTranslations("quotes");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  function refresh() {
    router.refresh();
  }

  function createItem() {
    const title = draft.trim();
    if (!title) {
      setError(t("detail.taskTitleRequired"));
      return;
    }
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/work-items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId, title }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as { error?: string };
          if (!response.ok || result.error) {
            setError(result.error || tCommon("error"));
            return;
          }
          setDraft("");
          refresh();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  function patchItem(id: string, payload: { title?: string; status?: string }) {
    setError(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/work-items", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...payload }),
            signal: AbortSignal.timeout(20_000),
          });
          const result = (await response.json()) as { error?: string };
          if (!response.ok || result.error) {
            setError(result.error || tCommon("error"));
            return;
          }
          setEditingId(null);
          refresh();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  function deleteItem(id: string) {
    if (!window.confirm(t("detail.taskDeleteConfirm"))) return;
    startTransition(() => {
      void (async () => {
        try {
          await fetch("/api/work-items", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
            signal: AbortSignal.timeout(20_000),
          });
          refresh();
        } catch {
          setError(tCommon("error"));
        }
      })();
    });
  }

  const items = compact ? workItems.slice(0, 6) : workItems;

  return (
    <PageCard className="p-5">
      {!compact ? (
        <h3 className="mb-4 text-sm font-medium">{t("sections.workItems")}</h3>
      ) : null}

      <div className="mb-4 flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              createItem();
            }
          }}
          placeholder={t("detail.taskPlaceholder")}
          disabled={isPending}
        />
        <Button
          type="button"
          size="sm"
          disabled={isPending || !draft.trim()}
          onClick={createItem}
        >
          <Plus className="size-3.5" />
          {t("detail.addTask")}
        </Button>
      </div>

      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      {workItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tQuotes("noWorkItems")}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const done = item.status === "done";
            const editing = editingId === item.id;
            return (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-border/80 px-2 py-2"
              >
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    patchItem(item.id, {
                      status: done ? "open" : "done",
                    })
                  }
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                  )}
                  aria-label={
                    done ? t("detail.reopenTask") : t("detail.completeTask")
                  }
                >
                  <Check className="size-3.5" />
                </button>

                {editing ? (
                  <Input
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        patchItem(item.id, { title: editTitle });
                      }
                      if (event.key === "Escape") setEditingId(null);
                    }}
                    disabled={isPending}
                    className="h-8 flex-1"
                  />
                ) : (
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm",
                      done && "text-muted-foreground line-through",
                    )}
                  >
                    {item.title}
                  </span>
                )}

                {!compact ? (
                  <Badge variant="secondary" className="shrink-0">
                    {done ? t("detail.done") : t("detail.open")}
                  </Badge>
                ) : null}

                {editing ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending}
                    onClick={() => patchItem(item.id, { title: editTitle })}
                  >
                    {tCommon("save")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending}
                    onClick={() => {
                      setEditingId(item.id);
                      setEditTitle(item.title);
                    }}
                    aria-label={t("detail.editTask")}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                )}

                {!compact ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={isPending}
                    onClick={() => deleteItem(item.id)}
                    aria-label={t("detail.deleteTask")}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </PageCard>
  );
}
