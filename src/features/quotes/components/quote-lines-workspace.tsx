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
  Box,
  Calculator,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  FolderPlus,
  GripVertical,
  Plus,
  Trash2,
  Type,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  Fragment,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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

const VAT_PRESETS = [
  { bps: 2100, label: "21%" },
  { bps: 900, label: "9%" },
  { bps: 0, label: "0%" },
] as const;

const selectClass =
  "border-input bg-background h-8 rounded-lg border px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const ADD_CHIPS: Array<{
  type: QuoteLineType;
  icon: typeof Box;
  asSection?: boolean;
  labelKey:
    | "addArticle"
    | "addHours"
    | "addLabor"
    | "addText"
    | "addSection";
}> = [
  { type: "article", icon: Box, labelKey: "addArticle" },
  { type: "hours", icon: Clock, labelKey: "addHours" },
  { type: "labor", icon: Wrench, labelKey: "addLabor" },
  { type: "text", icon: Type, labelKey: "addText" },
  {
    type: "section",
    icon: FolderPlus,
    asSection: true,
    labelKey: "addSection",
  },
];

type DragHandleContextValue = {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
  disabled?: boolean;
} | null;

const DragHandleContext = createContext<DragHandleContextValue>(null);

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
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(
    new Set(),
  );

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

  function toggleDetails(id: string) {
    setExpandedDetails((prev) => {
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
    if (
      !window.confirm(t("recalculateConfirm", { count: linkedArticleCount }))
    ) {
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
      updateLineInTree(lines, lineId, applyArticleToLine(line, article)),
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

  function renderLine(line: QuoteLineRow, depth: number) {
    const kids = childrenOf(lines, line.id);
    const showAsSection = isSectionLine(line, lines);
    const isCollapsed = collapsed[line.id];
    const detailsOpen = expandedDetails.has(line.id);
    const priced = isPricedLineType(line.lineType);
    const net = lineNetCents({
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      discountCents: line.discountCents,
    });

    if (showAsSection) {
      const total = sectionTotalCents(lines, line.id);
      const sectionBody = (
        <div className="flex items-center gap-2 px-4 py-3 sm:px-5">
          {editable ? (
            <>
              <DragHandleButton />
              <input
                type="checkbox"
                checked={selected.has(line.id)}
                onChange={() => toggleSelected(line.id)}
                className="size-3.5 accent-primary"
              />
            </>
          ) : null}
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
          <TypeChip type="section" label={t("lineTypes.section")} />
          <Input
            value={line.title}
            disabled={!editable}
            placeholder={t("placeholders.section")}
            className="h-9 flex-1 border-transparent bg-transparent px-1 text-sm font-semibold shadow-none focus-visible:border-input focus-visible:bg-background focus-visible:px-2"
            onChange={(e) =>
              updateLocalLine(line.id, { title: e.target.value })
            }
          />
          <span className="hidden font-mono text-sm tabular-nums sm:inline">
            {formatEuro(total)}
          </span>
          {editable ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              disabled={busy}
              onClick={() => void handleDeleteLine(line.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      );

      return (
        <Fragment key={line.id}>
          {depth === 0 ? (
            <SortableRow
              id={line.id}
              disabled={!editable || busy}
              selected={selected.has(line.id)}
              className="bg-muted/25"
            >
              {sectionBody}
            </SortableRow>
          ) : (
            <div
              className={cn(
                "border-b border-border/70 bg-muted/25",
                selected.has(line.id) && "bg-primary/5",
              )}
            >
              {sectionBody}
            </div>
          )}
          {!isCollapsed
            ? kids.map((child) => renderLine(child, depth + 1))
            : null}
          {!isCollapsed && editable ? (
            <div className="border-b border-border/70 bg-card px-4 py-2.5 sm:pl-14">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                disabled={busy}
                onClick={() => void handleAddLine(line.id)}
              >
                <Plus className="size-3.5" />
                {t("addChildLine")}
              </button>
            </div>
          ) : null}
        </Fragment>
      );
    }

    const body = (
      <div
        className={cn(
          "space-y-3 px-4 py-4 sm:px-5",
          depth > 0 && "pl-8 sm:pl-12",
        )}
      >
        <div className="flex items-start gap-2">
          {editable && depth === 0 ? <DragHandleButton className="mt-2.5" /> : null}
          {editable ? (
            <input
              type="checkbox"
              checked={selected.has(line.id)}
              onChange={() => toggleSelected(line.id)}
              className="mt-2.5 size-3.5 accent-primary"
            />
          ) : null}
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {editable ? (
                <select
                  className={cn(selectClass, "w-auto")}
                  value={line.lineType}
                  disabled={busy}
                  onChange={(e) => {
                    const lineType = e.target.value as QuoteLineType;
                    updateLocalLine(line.id, {
                      ...defaultsForLineType(lineType),
                      title: line.title,
                      description: line.description,
                      articleId:
                        lineType === "article" ? line.articleId : null,
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
                <TypeChip
                  type={line.lineType}
                  label={t(`lineTypes.${line.lineType}`)}
                />
              )}
              <Input
                value={line.title}
                disabled={!editable}
                placeholder={t("placeholders.line")}
                className="h-9 min-w-[12rem] flex-1 border-transparent bg-transparent px-1 text-sm font-medium shadow-none focus-visible:border-input focus-visible:bg-background focus-visible:px-2"
                onChange={(e) =>
                  updateLocalLine(line.id, { title: e.target.value })
                }
              />
              {priced ? (
                <p className="ml-auto font-mono text-sm font-medium tabular-nums">
                  {formatEuro(net)}
                </p>
              ) : null}
              {editable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={busy}
                  onClick={() => void handleDeleteLine(line.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </div>

            {line.lineType === "article" && activeArticles.length > 0 ? (
              <select
                className={cn(
                  selectClass,
                  "w-full max-w-md text-muted-foreground",
                )}
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

            {priced ? (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    {t("fields.quantity")}
                  </span>
                  <QuantityField
                    value={line.quantity}
                    disabled={!editable}
                    className="h-9 w-[4.5rem] rounded-lg border-border/60"
                    onCommit={(quantity) => {
                      const patch: Partial<QuoteLineRow> = { quantity };
                      if (
                        (line.lineType === "hours" ||
                          line.lineType === "labor") &&
                        quantity != null
                      ) {
                        patch.estimatedMinutes = Math.round(quantity * 60);
                      }
                      updateLocalLine(line.id, patch);
                    }}
                  />
                </div>
                <span className="text-muted-foreground">×</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    {t("fields.unit")}
                  </span>
                  <Input
                    disabled={!editable}
                    value={line.unit ?? ""}
                    className="h-9 w-16 rounded-lg border-border/60"
                    onChange={(e) =>
                      updateLocalLine(line.id, {
                        unit: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    {t("fields.unitPrice")}
                  </span>
                  <MoneyField
                    cents={line.unitPriceCents}
                    disabled={!editable}
                    className="h-9 w-[6.5rem] rounded-lg border-border/60"
                    onCommit={(cents) =>
                      updateLocalLine(line.id, {
                        unitPriceCents: cents ?? 0,
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-1">
                  {VAT_PRESETS.map((preset) => (
                    <button
                      key={preset.bps}
                      type="button"
                      disabled={!editable || busy}
                      onClick={() =>
                        updateLocalLine(line.id, { vatRateBps: preset.bps })
                      }
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] transition-colors",
                        line.vatRateBps === preset.bps
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => toggleDetails(line.id)}
              >
                {detailsOpen ? t("hideDetails") : t("showDetails")}
              </button>
              {line.discountCents > 0 ? (
                <span className="text-xs text-emerald-700">
                  − {formatEuro(line.discountCents)}{" "}
                  {t("fields.discount").toLowerCase()}
                </span>
              ) : null}
            </div>

            {detailsOpen ? (
              <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {t("fields.description")}
                  </label>
                  <textarea
                    rows={line.lineType === "text" ? 3 : 2}
                    value={line.description ?? ""}
                    disabled={!editable}
                    placeholder={t("placeholders.description")}
                    className="w-full resize-y rounded-lg border border-border/60 bg-background px-2.5 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    onChange={(e) =>
                      updateLocalLine(line.id, {
                        description: e.target.value || null,
                      })
                    }
                  />
                </div>
                {priced ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {t("fields.discount")}
                    </label>
                    <MoneyField
                      cents={line.discountCents}
                      disabled={!editable}
                      className="h-9 rounded-lg border-border/60"
                      onCommit={(cents) =>
                        updateLocalLine(line.id, {
                          discountCents: cents ?? 0,
                        })
                      }
                    />
                  </div>
                ) : null}
                {line.lineType === "article" ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {t("fields.costPrice")}
                    </label>
                    <MoneyField
                      cents={line.costPriceCents}
                      disabled={!editable}
                      className="h-9 rounded-lg border-border/60"
                      onCommit={(cents) =>
                        updateLocalLine(line.id, {
                          costPriceCents: cents,
                        })
                      }
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );

    if (depth === 0) {
      return (
        <SortableRow
          key={line.id}
          id={line.id}
          disabled={!editable || busy}
          selected={selected.has(line.id)}
        >
          {body}
        </SortableRow>
      );
    }

    return (
      <div
        key={line.id}
        className={cn(
          "border-b border-border/70 bg-card",
          selected.has(line.id) && "bg-primary/5",
        )}
      >
        {body}
      </div>
    );
  }

  const rootIds = roots.map((line) => line.id);

  return (
    <div className="space-y-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
        {editable ? (
          <>
            {ADD_CHIPS.map((chip) => (
              <button
                key={chip.labelKey}
                type="button"
                disabled={busy}
                onClick={() =>
                  void handleAddLine(null, {
                    asSection: chip.asSection,
                    lineType: chip.asSection ? undefined : chip.type,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
              >
                <chip.icon className="size-3.5" />
                {t(chip.labelKey)}
              </button>
            ))}
            {selected.size > 0 ? (
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-xs text-muted-foreground">
                  {t("selectionCount", { count: selected.size })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleCopySelected()}
                >
                  <Copy className="size-3.5" />
                  {t("toolbar.copy")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleDeleteSelected()}
                >
                  <Trash2 className="size-3.5" />
                  {t("toolbar.delete")}
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
        {showToolbarExtras && editable ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "text-muted-foreground",
              selected.size === 0 && "ml-auto",
            )}
            disabled={busy || linkedArticleCount === 0}
            onClick={handleRecalculatePrices}
          >
            <Calculator className="size-3.5" />
            {t("toolbar.recalculate")}
          </Button>
        ) : null}
      </div>

      {roots.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Plus className="size-5" />
          </div>
          <div className="max-w-sm space-y-1">
            <p className="text-sm font-medium">{t("emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {emptyMessage ?? t("noLines")}
            </p>
          </div>
          {editable ? (
            <div className="flex flex-wrap justify-center gap-2">
              {ADD_CHIPS.slice(0, 3).map((chip) => (
                <Button
                  key={chip.labelKey}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    void handleAddLine(null, { lineType: chip.type })
                  }
                >
                  <chip.icon className="size-3.5" />
                  {t(chip.labelKey)}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
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
            <div>{roots.map((line) => renderLine(line, 0))}</div>
          </SortableContext>
        </DndContext>
      )}

      <div className="flex flex-wrap items-center justify-end gap-6 border-t border-border bg-muted/20 px-4 py-3 text-sm sm:px-5">
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

function TypeChip({
  type,
  label,
}: {
  type: QuoteLineType;
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
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

function DragHandleButton({ className }: { className?: string }) {
  const ctx = useContext(DragHandleContext);
  if (!ctx || ctx.disabled) {
    return (
      <span className={cn("text-muted-foreground/40", className)}>
        <GripVertical className="size-4" />
      </span>
    );
  }
  return (
    <button
      type="button"
      className={cn(
        "cursor-grab text-muted-foreground active:cursor-grabbing",
        className,
      )}
      {...ctx.attributes}
      {...ctx.listeners}
    >
      <GripVertical className="size-4" />
    </button>
  );
}

function SortableRow({
  id,
  disabled,
  selected,
  className,
  children,
}: {
  id: string;
  disabled?: boolean;
  selected: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });

  return (
    <DragHandleContext.Provider
      value={{ attributes, listeners, disabled }}
    >
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
        }}
        className={cn(
          "border-b border-border/70 bg-card",
          isDragging && "opacity-70",
          selected && "bg-primary/5",
          className,
        )}
      >
        {children}
      </div>
    </DragHandleContext.Provider>
  );
}
