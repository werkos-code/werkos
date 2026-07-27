"use client";

import {
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Plus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, Fragment } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HoursField,
  MoneyField,
  QuantityField,
  VatRateField,
} from "@/features/quotes/components/pricing-fields";
import {
  addLineToTree,
  childrenOf,
  deleteLineFromTree,
  formatEuro,
  getRootLines,
  isSectionLine,
  sectionTotalCents,
  updateLineInTree,
} from "@/features/quotes/lib/quote-line";
import { lineNetCents } from "@/features/quotes/lib/quote-status";
import type { QuoteLineRow } from "@/features/quotes/quotes-actions";

export type QuoteLinesWorkspaceProps = {
  lines: QuoteLineRow[];
  onChange: (lines: QuoteLineRow[]) => void;
  editable?: boolean;
  busy?: boolean;
  showToolbarExtras?: boolean;
  emptyMessage?: string;
  onAddLine?: (
    parentId: string | null,
    asSection: boolean,
  ) => void | Promise<void>;
  onDeleteLine?: (lineId: string) => void | Promise<void>;
};

export function QuoteLinesWorkspace({
  lines,
  onChange,
  editable = true,
  busy = false,
  showToolbarExtras = true,
  emptyMessage,
  onAddLine,
  onDeleteLine,
}: QuoteLinesWorkspaceProps) {
  const t = useTranslations("quotes");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const roots = useMemo(() => getRootLines(lines), [lines]);

  function updateLocalLine(id: string, patch: Partial<QuoteLineRow>) {
    onChange(updateLineInTree(lines, id, patch));
  }

  async function handleAddLine(parentId: string | null, asSection = false) {
    if (onAddLine) {
      await onAddLine(parentId, asSection);
      return;
    }
    onChange(addLineToTree(lines, parentId, asSection));
  }

  async function handleDeleteLine(lineId: string) {
    if (!window.confirm(t("deleteLineConfirm"))) return;
    if (onDeleteLine) {
      await onDeleteLine(lineId);
      return;
    }
    onChange(deleteLineFromTree(lines, lineId));
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

    if (showAsSection) {
      const total = sectionTotalCents(lines, line.id);
      return (
        <Fragment key={line.id}>
          <div className="quote-line-section border-b border-border/70">
            <div className="flex items-center gap-2 bg-muted/50 px-3 py-2.5">
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
              <span className="font-mono text-sm tabular-nums text-foreground">
                {formatEuro(total)}
              </span>
              {editable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  disabled={busy}
                  onClick={() => void handleDeleteLine(line.id)}
                >
                  <MoreVertical className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
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
      <Fragment key={line.id}>
        <div className="quote-line-row group">
          <span
            className="hidden text-[11px] tabular-nums text-muted-foreground lg:block"
            style={{ paddingLeft: depth * 12 }}
          >
            {indexLabel}
          </span>
          <div
            className="min-w-0 space-y-1"
            style={{ paddingLeft: depth * 12 }}
          >
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
          </div>
          <Input
            disabled={!editable}
            value={line.unit ?? ""}
            className="h-8 w-full border-border/70 bg-background"
            onChange={(e) =>
              updateLocalLine(line.id, { unit: e.target.value || null })
            }
          />
          <QuantityField
            value={line.quantity}
            disabled={!editable}
            onCommit={(quantity) => updateLocalLine(line.id, { quantity })}
          />
          <HoursField
            minutes={line.estimatedMinutes}
            disabled={!editable}
            onCommit={(estimatedMinutes) =>
              updateLocalLine(line.id, { estimatedMinutes })
            }
          />
          <MoneyField
            cents={line.unitPriceCents}
            disabled={!editable}
            onCommit={(cents) =>
              updateLocalLine(line.id, { unitPriceCents: cents ?? 0 })
            }
          />
          <VatRateField
            bps={line.vatRateBps}
            disabled={!editable}
            onCommit={(vatRateBps) =>
              updateLocalLine(line.id, { vatRateBps })
            }
          />
          <div className="flex h-8 items-center justify-end font-mono text-sm tabular-nums">
            {formatEuro(net)}
          </div>
          <div className="flex h-8 items-center justify-end gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
            {editable ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  disabled={busy}
                  onClick={() => void handleAddLine(line.id)}
                >
                  {t("addChildLine")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  disabled={busy}
                  onClick={() => void handleDeleteLine(line.id)}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
        {kids.map((child, index) =>
          renderLineRow(child, depth + 1, `${indexLabel}.${index + 1}`),
        )}
      </Fragment>
    );
  }

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
              onClick={() => void handleAddLine(null)}
            >
              <Plus className="size-3.5" />
              {t("addLine")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void handleAddLine(null, true)}
            >
              {t("addSection")}
            </Button>
          </>
        ) : null}
        {showToolbarExtras ? (
          <>
            <Button type="button" variant="outline" size="sm" disabled>
              {t("stubs.textLine")}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled>
              {t("stubs.discount")}
            </Button>
          </>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="quote-lines-table min-w-[52rem]">
          <div className="quote-line-header hidden lg:contents">
            <span aria-hidden className="min-w-0" />
            <span className="min-w-0 truncate">{t("fields.lineTitle")}</span>
            <span className="min-w-0 truncate text-center">
              {t("fields.unit")}
            </span>
            <span className="min-w-0 truncate text-right">
              {t("fields.quantity")}
            </span>
            <span className="min-w-0 truncate text-right">
              {t("fields.hours")}
            </span>
            <span className="min-w-0 truncate text-right">
              {t("fields.unitPrice")}
            </span>
            <span className="min-w-0 truncate text-right">
              {t("fields.vat")}
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
            roots.map((line, index) =>
              renderLineRow(line, 0, String(index + 1)),
            )
          )}
        </div>
      </div>
    </div>
  );
}
