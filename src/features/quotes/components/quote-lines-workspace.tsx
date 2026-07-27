"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MoneyField,
  QuantityField,
} from "@/features/quotes/components/pricing-fields";
import {
  addLineToTree,
  aggregateQuoteLineStats,
  applyArticleToLine,
  childrenOf,
  createQuoteLine,
  defaultsForLineType,
  deleteLineFromTree,
  duplicateLineInTree,
  formatEuro,
  formatHours,
  getRootLines,
  isPricedLineType,
  isSectionLine,
  recalculateLinesFromArticles,
  reorderSiblings,
  sectionTotalCents,
  updateLineInTree,
} from "@/features/quotes/lib/quote-line";
import { lineNetCents } from "@/features/quotes/lib/quote-status";
import type {
  QuoteLineRow,
  QuoteLineType,
} from "@/features/quotes/quotes-actions";
import type { ArticleRow } from "@/features/materials/lib/materials";
import { cn } from "@/lib/utils";

const selectClass =
  "border-input bg-background h-8 w-full rounded-lg border px-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type QuoteLinesWorkspaceProps = {
  lines: QuoteLineRow[];
  onChange: (lines: QuoteLineRow[]) => void;
  editable?: boolean;
  busy?: boolean;
  showToolbarExtras?: boolean;
  emptyMessage?: string;
  articles?: ArticleRow[];
  onAddLine?: (
    parentId: string | null,
    options?: { asSection?: boolean; lineType?: QuoteLineType },
  ) => void | Promise<void>;
  onDeleteLine?: (lineId: string) => void | Promise<void>;
  onDeleteLines?: (lineIds: string[]) => void | Promise<void>;
  onDuplicateLine?: (lineId: string) => void | Promise<void>;
  onReorder?: (
    items: Array<{ id: string; sortOrder: number; parentId: string | null }>,
  ) => void | Promise<void>;
};

export function QuoteLinesWorkspace({
  lines,
  onChange,
  editable = true,
  busy = false,
  showToolbarExtras = true,
  emptyMessage,
  articles = [],
  onAddLine,
  onDeleteLine,
  onDeleteLines,
  onDuplicateLine,
  onReorder,
}: QuoteLinesWorkspaceProps) {
  const t = useTranslations("quotes");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const roots = useMemo(() => getRootLines(lines), [lines]);
  const stats = useMemo(() => aggregateQuoteLineStats(lines), [lines]);
  const activeArticles = useMemo(
    () => articles.filter((article) => article.isActive),
    [articles],
  );
  const linkedArticleCount = useMemo(
    () => lines.filter((line) => Boolean(line.articleId)).length,
    [lines],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  function updateLocalLine(id: string, patch: Partial<QuoteLineRow>) {
    onChange(updateLineInTree(lines, id, patch));
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddLine(
    parentId: string | null,
    options?: { asSection?: boolean; lineType?: QuoteLineType },
  ) {
    if (onAddLine) {
      await onAddLine(parentId, options);
      return;
    }
    const asSection = options?.asSection || options?.lineType === "section";
    if (asSection) {
      onChange(addLineToTree(lines, parentId, true));
      return;
    }
    const siblings = lines.filter((line) => line.parentId === parentId);
    const sortOrder =
      siblings.length > 0
        ? Math.max(...siblings.map((line) => line.sortOrder)) + 1
        : 0;
    onChange([
      ...lines,
      createQuoteLine({
        parentId,
        sortOrder,
        lineType: options?.lineType ?? "article",
      }),
    ]);
  }

  async function handleDeleteLine(lineId: string) {
    if (!window.confirm(t("deleteLineConfirm"))) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(lineId);
      return next;
    });
    if (onDeleteLine) {
      await onDeleteLine(lineId);
      return;
    }
    onChange(deleteLineFromTree(lines, lineId));
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    if (!window.confirm(t("deleteSelectedConfirm", { count: selected.size }))) {
      return;
    }
    const ids = [...selected];
    setSelected(new Set());
    if (onDeleteLines) {
      await onDeleteLines(ids);
      return;
    }
    let next = lines;
    for (const id of ids) {
      next = deleteLineFromTree(next, id);
    }
    onChange(next);
  }

  async function handleCopySelected() {
    if (selected.size === 0) return;
    const ids = [...selected];
    if (onDuplicateLine) {
      for (const id of ids) await onDuplicateLine(id);
      return;
    }
    let next = lines;
    for (const id of ids) {
      next = duplicateLineInTree(next, id);
    }
    onChange(next);
  }

  function handleRecalculatePrices() {
    if (linkedArticleCount === 0) return;
    if (!window.confirm(t("recalculateConfirm", { count: linkedArticleCount }))) {
      return;
    }
    const onlyLineIds =
      selected.size > 0
        ? new Set(
            [...selected].filter((id) =>
              lines.some((line) => line.id === id && line.articleId),
            ),
          )
        : undefined;
    const { lines: next, updatedCount } = recalculateLinesFromArticles(
      lines,
      activeArticles,
      onlyLineIds && onlyLineIds.size > 0 ? { onlyLineIds } : undefined,
    );
    if (updatedCount === 0) {
      window.alert(t("recalculateNone"));
      return;
    }
    onChange(next);
  }

  function pickArticle(lineId: string, articleId: string) {
    if (!articleId) {
      updateLocalLine(lineId, { articleId: null });
      return;
    }
    const article = activeArticles.find((row) => row.id === articleId);
    if (!article) return;
    const line = lines.find((row) => row.id === lineId);
    if (!line) return;
    onChange(
      updateLineInTree(
        lines,
        lineId,
        applyArticleToLine(line, article),
      ),
    );
  }

  async function onDragEnd(event: DragEndEvent, parentId: string | null) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const siblings = (
      parentId === null ? getRootLines(lines) : childrenOf(lines, parentId)
    ).map((line) => line.id);
    const oldIndex = siblings.indexOf(String(active.id));
    const newIndex = siblings.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const orderedIds = arrayMove(siblings, oldIndex, newIndex);
    const next = reorderSiblings(lines, parentId, orderedIds);
    onChange(next);
    if (onReorder) {
      await onReorder(
        orderedIds.map((id, sortOrder) => ({ id, sortOrder, parentId })),
      );
    }
  }

  function renderLineRow(
    line: QuoteLineRow,
    depth: number,
    indexLabel: string,
  ) {
    const kids = childrenOf(lines, line.id);
    const showAsSection = isSectionLine(line, lines);
    const net = lineNetCents({
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      discountCents: line.discountCents,
    });
    const isCollapsed = collapsed[line.id];
    const priced = isPricedLineType(line.lineType);

    if (showAsSection) {
      const total = sectionTotalCents(lines, line.id);
      return (
        <Fragment key={line.id}>
          <SortableSection
            id={line.id}
            disabled={!editable || busy}
            selected={selected.has(line.id)}
            onToggleSelect={() => toggleSelected(line.id)}
          >
            <div className="flex flex-1 items-center gap-2">
              <button
                type="button"
                className="text-muted-foreground"
                onClick={() =>
                  setCollapsed((prev) => ({
                    ...prev,
                    [line.id]: !prev[line.id],
                  }))
                }
              >
                {isCollapsed ? (
                  <ChevronRight className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
              <span className="w-6 text-xs tabular-nums text-muted-foreground">
                {indexLabel}
              </span>
              <Input
                value={line.title}
                disabled={!editable}
                placeholder={t("placeholders.section")}
                className="h-8 flex-1 border-transparent bg-transparent font-medium shadow-none focus-visible:border-input focus-visible:bg-background"
                onChange={(e) =>
                  updateLocalLine(line.id, { title: e.target.value })
                }
              />
              <LineTypeBadge type="section" label={t("lineTypes.section")} />
              <span className="font-mono text-sm tabular-nums text-foreground">
                {formatEuro(total)}
              </span>
              {editable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  disabled={busy}
                  onClick={() => void handleDeleteLine(line.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>
          </SortableSection>
          {!isCollapsed
            ? kids.map((child, index) =>
                renderLineRow(
                  child,
                  depth + 1,
                  `${indexLabel}.${index + 1}`,
                ),
              )
            : null}
          {!isCollapsed && editable ? (
            <div className="quote-line-section bg-card px-3 py-2 pl-12">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                disabled={busy}
                onClick={() => void handleAddLine(line.id)}
              >
                <Plus className="size-3.5" />
                {t("addLine")}
              </button>
            </div>
          ) : null}
        </Fragment>
      );
    }

    return (
      <LineRowFrame
        key={line.id}
        id={line.id}
        indexLabel={indexLabel}
        depth={depth}
        sortable={depth === 0}
        disabled={!editable || busy}
        selected={selected.has(line.id)}
        onToggleSelect={() => toggleSelected(line.id)}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 lg:block">
            <span className="w-6 shrink-0 text-[11px] tabular-nums text-muted-foreground lg:hidden">
              {indexLabel}
            </span>
            <Input
              value={line.title}
              disabled={!editable}
              placeholder={t("placeholders.line")}
              className="h-8 w-full border-transparent bg-transparent px-0 font-medium shadow-none focus-visible:border-input focus-visible:bg-background focus-visible:px-2"
              onChange={(e) =>
                updateLocalLine(line.id, { title: e.target.value })
              }
            />
          </div>
          {line.lineType === "article" && activeArticles.length > 0 ? (
            <select
              className={cn(selectClass, "text-muted-foreground")}
              value={line.articleId ?? ""}
              disabled={!editable || busy}
              onChange={(e) => pickArticle(line.id, e.target.value)}
            >
              <option value="">{t("articlePick")}</option>
              {activeArticles.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.code ? `${article.code} · ` : ""}
                  {article.name}
                </option>
              ))}
            </select>
          ) : null}
          {line.lineType !== "text" ? (
            <textarea
              rows={1}
              value={line.description ?? ""}
              disabled={!editable}
              placeholder={t("placeholders.description")}
              className="text-muted-foreground placeholder:text-muted-foreground/70 focus-visible:border-input w-full resize-y rounded-lg border border-transparent bg-transparent px-0 py-1 text-xs outline-none focus-visible:bg-background focus-visible:px-2"
              onChange={(e) =>
                updateLocalLine(line.id, {
                  description: e.target.value || null,
                })
              }
            />
          ) : null}
        </div>

        {editable ? (
          <select
            className={selectClass}
            value={line.lineType}
            disabled={busy}
            onChange={(e) => {
              const lineType = e.target.value as QuoteLineType;
              updateLocalLine(line.id, {
                ...defaultsForLineType(lineType),
                title: line.title,
                description: line.description,
                articleId: lineType === "article" ? line.articleId : null,
                costPriceCents:
                  lineType === "article" ? line.costPriceCents : null,
              });
            }}
          >
            <option value="article">{t("lineTypes.article")}</option>
            <option value="hours">{t("lineTypes.hours")}</option>
            <option value="labor">{t("lineTypes.labor")}</option>
            <option value="text">{t("lineTypes.text")}</option>
          </select>
        ) : (
          <LineTypeBadge
            type={line.lineType}
            label={t(`lineTypes.${line.lineType}`)}
          />
        )}

        {priced ? (
          <>
            <QuantityField
              value={line.quantity}
              disabled={!editable}
              onCommit={(quantity) => {
                const patch: Partial<QuoteLineRow> = { quantity };
                if (
                  (line.lineType === "hours" || line.lineType === "labor") &&
                  quantity != null
                ) {
                  patch.estimatedMinutes = Math.round(quantity * 60);
                }
                updateLocalLine(line.id, patch);
              }}
            />
            <Input
              disabled={!editable}
              value={line.unit ?? ""}
              className="h-8 w-full border-border/70 bg-background"
              onChange={(e) =>
                updateLocalLine(line.id, { unit: e.target.value || null })
              }
            />
            <MoneyField
              cents={line.unitPriceCents}
              disabled={!editable}
              onCommit={(cents) =>
                updateLocalLine(line.id, { unitPriceCents: cents ?? 0 })
              }
            />
            <MoneyField
              cents={line.discountCents}
              disabled={!editable}
              onCommit={(cents) =>
                updateLocalLine(line.id, { discountCents: cents ?? 0 })
              }
            />
            <div className="flex h-8 items-center justify-end font-mono text-sm tabular-nums">
              {formatEuro(net)}
            </div>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">—</span>
            <span className="text-muted-foreground">—</span>
            <span className="text-muted-foreground">—</span>
            <span className="text-muted-foreground">—</span>
            <span className="text-muted-foreground">—</span>
          </>
        )}

        <div className="flex h-8 items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
          {editable ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive"
              disabled={busy}
              onClick={() => void handleDeleteLine(line.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </LineRowFrame>
    );
  }

  const rootIds = roots.map((line) => line.id);

  return (
    <div className="space-y-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        {editable ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-primary/30 text-primary"
              disabled={busy}
              onClick={() => void handleAddLine(null, { lineType: "article" })}
            >
              <Plus className="size-3.5" />
              {t("addLine")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void handleAddLine(null, { asSection: true })}
            >
              <Plus className="size-3.5" />
              {t("addSection")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || selected.size === 0}
              onClick={() => void handleCopySelected()}
            >
              <Copy className="size-3.5" />
              {t("toolbar.copy")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || selected.size === 0}
              onClick={() => void handleDeleteSelected()}
            >
              <Trash2 className="size-3.5" />
              {t("toolbar.delete")}
            </Button>
          </>
        ) : null}
        {showToolbarExtras ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || !editable || linkedArticleCount === 0}
            onClick={handleRecalculatePrices}
          >
            <Calculator className="size-3.5" />
            {t("toolbar.recalculate")}
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="quote-lines-table min-w-[56rem]">
          <div className="quote-line-header hidden lg:contents">
            <span aria-hidden className="min-w-0" />
            <span className="min-w-0 truncate">{t("fields.lineTitle")}</span>
            <span className="min-w-0 truncate">{t("fields.type")}</span>
            <span className="min-w-0 truncate text-right">
              {t("fields.quantity")}
            </span>
            <span className="min-w-0 truncate text-center">
              {t("fields.unit")}
            </span>
            <span className="min-w-0 truncate text-right">
              {t("fields.unitPrice")}
            </span>
            <span className="min-w-0 truncate text-right">
              {t("fields.discount")}
            </span>
            <span className="min-w-0 truncate text-right">
              {t("fields.lineTotal")}
            </span>
            <span aria-hidden className="min-w-0" />
          </div>

          {roots.length === 0 ? (
            <p className="px-4 py-10 text-sm text-muted-foreground">
              {emptyMessage ?? t("noLines")}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => void onDragEnd(event, null)}
            >
              <SortableContext
                items={rootIds}
                strategy={verticalListSortingStrategy}
              >
                {roots.map((line, index) =>
                  renderLineRow(line, 0, String(index + 1)),
                )}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-6 border-t border-border bg-muted/20 px-4 py-3 text-sm">
        <div>
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {t("footer.totalHours")}
          </span>
          <p className="font-mono tabular-nums">
            {stats.totalMinutes > 0 ? formatHours(stats.totalMinutes) : "—"}
          </p>
        </div>
        <div>
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {t("footer.totalMaterial")}
          </span>
          <p className="font-mono tabular-nums">
            {formatEuro(stats.materialCents)}
          </p>
        </div>
      </div>
    </div>
  );
}

function LineTypeBadge({
  type,
  label,
}: {
  type: QuoteLineType;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
        type === "article" && "bg-primary/10 text-primary",
        type === "hours" && "bg-emerald-500/10 text-emerald-700",
        type === "labor" && "bg-amber-500/10 text-amber-800",
        type === "text" && "bg-muted text-muted-foreground",
        type === "section" && "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function SortableSection({
  id,
  disabled,
  selected,
  onToggleSelect,
  children,
}: {
  id: string;
  disabled?: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "quote-line-section border-b border-border/70 bg-muted/50",
        isDragging && "opacity-70",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        {!disabled ? (
          <>
            <button
              type="button"
              className="cursor-grab text-muted-foreground active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="size-3.5 accent-primary"
            />
          </>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function LineRowFrame({
  id,
  indexLabel,
  depth,
  sortable,
  disabled,
  selected,
  onToggleSelect,
  children,
}: {
  id: string;
  indexLabel: string;
  depth: number;
  sortable: boolean;
  disabled?: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  children: React.ReactNode;
}) {
  if (sortable) {
    return (
      <SortableLineRow
        id={id}
        indexLabel={indexLabel}
        depth={depth}
        disabled={disabled}
        selected={selected}
        onToggleSelect={onToggleSelect}
      >
        {children}
      </SortableLineRow>
    );
  }

  return (
    <div
      style={{ paddingLeft: 12 + depth * 8 }}
      className={cn("quote-line-row group", selected && "bg-primary/5")}
    >
      <div className="flex items-center gap-1">
        {!disabled ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="size-3.5 accent-primary"
            aria-label={indexLabel}
          />
        ) : (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {indexLabel}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SortableLineRow({
  id,
  indexLabel,
  depth,
  disabled,
  selected,
  onToggleSelect,
  children,
}: {
  id: string;
  indexLabel: string;
  depth: number;
  disabled?: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        paddingLeft: 12 + depth * 8,
      }}
      className={cn(
        "quote-line-row group",
        isDragging && "opacity-70",
        selected && "bg-primary/5",
      )}
    >
      <div className="flex items-center gap-1">
        {!disabled ? (
          <>
            <button
              type="button"
              className="cursor-grab text-muted-foreground active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="size-3.5 accent-primary"
              aria-label={indexLabel}
            />
          </>
        ) : (
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {indexLabel}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
