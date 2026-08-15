"use client";

import {
  Box,
  Clock,
  FolderPlus,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MoneyField,
  QuantityField,
} from "@/features/quotes/components/pricing-fields";
import {
  addLineToTree,
  computeQuoteTotals,
  createQuoteLine,
  deleteLineFromTree,
  formatEuro,
  getRootLines,
  isPricedLineType,
  updateLineInTree,
} from "@/features/quotes/lib/quote-line";
import { lineNetCents } from "@/features/quotes/lib/quote-status";
import type {
  QuoteLineRow,
  QuoteLineType,
} from "@/features/quotes/quotes-actions";
import {
  MetaStatCard,
  PageCard,
} from "@/features/shell/components/page-card";
import { cn } from "@/lib/utils";

const MARGIN_CHIPS = [0, 10, 15, 20, 25] as const;

type AssignmentCalculatorProps = {
  lines: QuoteLineRow[];
  marginPercent: number;
  onChangeLines: (lines: QuoteLineRow[]) => void;
  onChangeMargin: (marginPercent: number) => void;
};

const ADD_TYPES: Array<{
  type: QuoteLineType;
  icon: typeof Box;
  labelKey: "addMaterial" | "addHours" | "addLabor" | "addGroup";
}> = [
  { type: "article", icon: Box, labelKey: "addMaterial" },
  { type: "hours", icon: Clock, labelKey: "addHours" },
  { type: "labor", icon: Wrench, labelKey: "addLabor" },
  { type: "section", icon: FolderPlus, labelKey: "addGroup" },
];

export function AssignmentCalculator({
  lines,
  marginPercent,
  onChangeLines,
  onChangeMargin,
}: AssignmentCalculatorProps) {
  const t = useTranslations("assignment.calculatie");
  const roots = useMemo(() => getRootLines(lines), [lines]);
  const totals = useMemo(
    () => computeQuoteTotals(lines, marginPercent),
    [lines, marginPercent],
  );

  function addLine(lineType: QuoteLineType) {
    if (lineType === "section") {
      onChangeLines(addLineToTree(lines, null, true));
      return;
    }
    const siblings = lines.filter((line) => line.parentId === null);
    const sortOrder =
      siblings.length > 0
        ? Math.max(...siblings.map((line) => line.sortOrder)) + 1
        : 0;
    onChangeLines([
      ...lines,
      createQuoteLine({ parentId: null, sortOrder, lineType }),
    ]);
  }

  function updateLine(id: string, patch: Partial<QuoteLineRow>) {
    onChangeLines(updateLineInTree(lines, id, patch));
  }

  function removeLine(id: string) {
    onChangeLines(deleteLineFromTree(lines, id));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <MetaStatCard
          label={t("kpi.excl")}
          value={formatEuro(totals.net)}
        />
        <MetaStatCard label={t("kpi.vat")} value={formatEuro(totals.vat)} />
        <MetaStatCard
          label={t("kpi.incl")}
          value={formatEuro(totals.gross)}
        />
      </div>

      <PageCard className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
          {ADD_TYPES.map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => addLine(item.type)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            >
              <item.icon className="size-3.5" />
              {t(item.labelKey)}
            </button>
          ))}
        </div>

        {roots.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Plus className="size-5" />
            </div>
            <div className="max-w-sm space-y-1">
              <p className="text-sm font-medium">{t("emptyTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {ADD_TYPES.slice(0, 3).map((item) => (
                <Button
                  key={item.type}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addLine(item.type)}
                >
                  <item.icon className="size-3.5" />
                  {t(item.labelKey)}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border/70">
            {roots.map((line) => (
              <CalculatorLine
                key={line.id}
                line={line}
                lines={lines}
                onUpdate={updateLine}
                onRemove={removeLine}
                onAddChild={() => {
                  onChangeLines(addLineToTree(lines, line.id, false));
                }}
              />
            ))}
          </ul>
        )}
      </PageCard>

      <PageCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("marginLabel")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MARGIN_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onChangeMargin(chip)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs transition-colors",
                    marginPercent === chip
                      ? "bg-primary/10 font-medium text-primary"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {chip}%
                </button>
              ))}
              <div className="flex items-center gap-1.5 pl-1">
                <Input
                  inputMode="decimal"
                  aria-label={t("marginCustom")}
                  value={String(marginPercent)}
                  className="h-7 w-14 rounded-full border-border/70 px-2 text-center font-mono text-xs tabular-nums"
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(",", "."));
                    onChangeMargin(Number.isNaN(n) ? 0 : Math.max(0, n));
                  }}
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>
            {totals.marginCents > 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("marginAmount")}:{" "}
                <span className="font-mono tabular-nums text-foreground">
                  {formatEuro(totals.marginCents)}
                </span>
              </p>
            ) : null}
          </div>

          <div className="min-w-[12rem] space-y-1.5 text-right">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("totalsTitle")}
            </p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {formatEuro(totals.gross)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("kpi.excl")}:{" "}
              <span className="font-mono tabular-nums">
                {formatEuro(totals.net)}
              </span>
            </p>
          </div>
        </div>
      </PageCard>
    </div>
  );
}

function CalculatorLine({
  line,
  lines,
  onUpdate,
  onRemove,
  onAddChild,
}: {
  line: QuoteLineRow;
  lines: QuoteLineRow[];
  onUpdate: (id: string, patch: Partial<QuoteLineRow>) => void;
  onRemove: (id: string) => void;
  onAddChild: () => void;
}) {
  const t = useTranslations("assignment.calculatie");
  const isSection = line.lineType === "section";
  const priced = isPricedLineType(line.lineType);
  const children = lines.filter((row) => row.parentId === line.id);
  const net = lineNetCents({
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    discountCents: line.discountCents,
  });

  if (isSection) {
    const childTotal = children.reduce((sum, child) => {
      return (
        sum +
        lineNetCents({
          quantity: child.quantity,
          unitPriceCents: child.unitPriceCents,
          discountCents: child.discountCents,
        })
      );
    }, 0);

    return (
      <li className="bg-muted/20">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <TypeChip type="section" label={t("types.group")} />
          <Input
            value={line.title}
            placeholder={t("groupPlaceholder")}
            className="h-9 flex-1 border-transparent bg-transparent px-1 text-sm font-semibold shadow-none focus-visible:border-input focus-visible:bg-background focus-visible:px-2"
            onChange={(e) => onUpdate(line.id, { title: e.target.value })}
          />
          <span className="hidden font-mono text-sm tabular-nums sm:inline">
            {formatEuro(childTotal)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(line.id)}
            aria-label={t("removeLine")}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
        <ul className="divide-y divide-border/50 border-t border-border/60">
          {children.map((child) => (
            <li key={child.id} className="bg-card">
              <PricedLineBody
                line={child}
                onUpdate={onUpdate}
                onRemove={onRemove}
                indented
              />
            </li>
          ))}
        </ul>
        <div className="border-t border-dashed border-border/70 px-4 py-2.5 sm:px-5 sm:pl-12">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            onClick={onAddChild}
          >
            <Plus className="size-3.5" />
            {t("addInGroup")}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li>
      <PricedLineBody
        line={line}
        onUpdate={onUpdate}
        onRemove={onRemove}
        showType
        priced={priced}
        net={net}
      />
    </li>
  );
}

function PricedLineBody({
  line,
  onUpdate,
  onRemove,
  indented = false,
  showType = true,
  priced = true,
  net,
}: {
  line: QuoteLineRow;
  onUpdate: (id: string, patch: Partial<QuoteLineRow>) => void;
  onRemove: (id: string) => void;
  indented?: boolean;
  showType?: boolean;
  priced?: boolean;
  net?: number;
}) {
  const t = useTranslations("assignment.calculatie");
  const lineNet =
    net ??
    lineNetCents({
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      discountCents: line.discountCents,
    });
  const typeLabel =
    line.lineType === "hours"
      ? t("types.hours")
      : line.lineType === "labor"
        ? t("types.labor")
        : t("types.material");

  return (
    <div
      className={cn(
        "space-y-3 px-4 py-4 sm:px-5",
        indented && "pl-8 sm:pl-12",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {showType ? (
              <TypeChip type={line.lineType} label={typeLabel} />
            ) : null}
            <Input
              value={line.title}
              placeholder={t("linePlaceholder")}
              className="h-9 min-w-[12rem] flex-1 border-transparent bg-transparent px-1 text-sm font-medium shadow-none focus-visible:border-input focus-visible:bg-background focus-visible:px-2"
              onChange={(e) => onUpdate(line.id, { title: e.target.value })}
            />
          </div>
          {priced ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">
                  {t("columns.qty")}
                </span>
                <QuantityField
                  value={line.quantity}
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
                    onUpdate(line.id, patch);
                  }}
                />
              </div>
              <span className="text-muted-foreground">×</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">
                  {t("columns.price")}
                </span>
                <MoneyField
                  cents={line.unitPriceCents}
                  className="h-9 w-[6.5rem] rounded-lg border-border/60"
                  onCommit={(cents) =>
                    onUpdate(line.id, { unitPriceCents: cents ?? 0 })
                  }
                />
              </div>
              <div className="ml-auto flex items-center gap-3">
                <p className="font-mono text-sm font-medium tabular-nums">
                  {formatEuro(lineNet)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(line.id)}
                  aria-label={t("removeLine")}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
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
        type === "section" && "bg-muted text-muted-foreground",
        type === "text" && "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
