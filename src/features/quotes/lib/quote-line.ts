import {
  lineNetCents,
  lineVatCents,
} from "@/features/quotes/lib/quote-status";
import type {
  QuoteLineRow,
  QuoteLineType,
} from "@/features/quotes/quotes-actions";

export type { QuoteLineRow, QuoteLineType };
export { QUOTE_LINE_TYPES } from "@/features/quotes/quotes-actions";

export function formatEuro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function formatHours(minutes: number) {
  const hours = minutes / 60;
  return `${hours.toLocaleString("nl-NL", {
    maximumFractionDigits: 2,
  })} uur`;
}

export function defaultsForLineType(
  lineType: QuoteLineType,
): Partial<QuoteLineRow> {
  switch (lineType) {
    case "section":
      return {
        lineType: "section",
        quantity: null,
        unit: null,
        unitPriceCents: null,
        discountCents: 0,
        estimatedMinutes: null,
      };
    case "text":
      return {
        lineType: "text",
        quantity: null,
        unit: null,
        unitPriceCents: null,
        discountCents: 0,
        estimatedMinutes: null,
        vatRateBps: 0,
      };
    case "hours":
      return {
        lineType: "hours",
        quantity: 1,
        unit: "uur",
        unitPriceCents: 0,
        estimatedMinutes: 60,
      };
    case "labor":
      return {
        lineType: "labor",
        quantity: 1,
        unit: "uur",
        unitPriceCents: 0,
        estimatedMinutes: 60,
      };
    case "article":
    default:
      return {
        lineType: "article",
        quantity: 1,
        unit: "st",
        unitPriceCents: 0,
        estimatedMinutes: null,
      };
  }
}

export function createQuoteLine(
  partial?: Partial<QuoteLineRow>,
): QuoteLineRow {
  const lineType = partial?.lineType ?? "article";
  const defaults = defaultsForLineType(lineType);
  return {
    id: partial?.id ?? crypto.randomUUID(),
    parentId: partial?.parentId ?? null,
    sortOrder: partial?.sortOrder ?? 0,
    title: partial?.title ?? "",
    description: partial?.description ?? null,
    lineType,
    quantity:
      partial?.quantity !== undefined
        ? partial.quantity
        : (defaults.quantity ?? null),
    unit: partial?.unit !== undefined ? partial.unit : (defaults.unit ?? null),
    unitPriceCents:
      partial?.unitPriceCents !== undefined
        ? partial.unitPriceCents
        : (defaults.unitPriceCents ?? null),
    vatRateBps: partial?.vatRateBps ?? defaults.vatRateBps ?? 2100,
    discountCents: partial?.discountCents ?? defaults.discountCents ?? 0,
    estimatedMinutes:
      partial?.estimatedMinutes !== undefined
        ? partial.estimatedMinutes
        : (defaults.estimatedMinutes ?? null),
  };
}

export function createSectionLine(
  partial?: Partial<QuoteLineRow>,
): QuoteLineRow {
  return createQuoteLine({
    lineType: "section",
    ...partial,
  });
}

export function isPricedLineType(lineType: QuoteLineType) {
  return lineType === "article" || lineType === "hours" || lineType === "labor";
}

export function aggregateQuoteLineStats(lines: QuoteLineRow[]) {
  let totalMinutes = 0;
  let materialCents = 0;
  let laborCents = 0;

  for (const line of getLeafLines(lines)) {
    if (line.lineType === "text" || line.lineType === "section") continue;
    const net = lineNetCents({
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      discountCents: line.discountCents,
    });
    if (line.lineType === "article") {
      materialCents += net;
    } else {
      laborCents += net;
      if (line.estimatedMinutes) totalMinutes += line.estimatedMinutes;
      else if (line.quantity && line.unit === "uur") {
        totalMinutes += Math.round(line.quantity * 60);
      }
    }
  }

  return { totalMinutes, materialCents, laborCents };
}

export function collectDescendants(
  lines: QuoteLineRow[],
  rootId: string,
): string[] {
  const ids = [rootId];
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const line of lines) {
      if (line.parentId === current) {
        ids.push(line.id);
        queue.push(line.id);
      }
    }
  }
  return ids;
}

export function getRootLines(lines: QuoteLineRow[]) {
  return [...lines]
    .filter((line) => !line.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function childrenOf(lines: QuoteLineRow[], parentId: string) {
  return lines
    .filter((line) => line.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function isSectionLine(line: QuoteLineRow, lines: QuoteLineRow[]) {
  if (line.lineType === "section") return true;
  const kids = childrenOf(lines, line.id);
  return (
    kids.length > 0 ||
    (line.quantity === null && line.unitPriceCents === null)
  );
}

export function getLeafLines(lines: QuoteLineRow[]) {
  const parentIds = new Set(
    lines.map((line) => line.parentId).filter(Boolean) as string[],
  );
  return lines.filter(
    (line) =>
      !parentIds.has(line.id) &&
      line.lineType !== "section" &&
      line.lineType !== "text" &&
      !(line.quantity === null && line.unitPriceCents === null),
  );
}

export function sectionTotalCents(
  lines: QuoteLineRow[],
  sectionId: string,
): number {
  const leafIds = new Set(getLeafLines(lines).map((line) => line.id));
  const descendants = collectDescendants(lines, sectionId).filter(
    (id) => id !== sectionId && leafIds.has(id),
  );
  return descendants.reduce((sum, id) => {
    const line = lines.find((entry) => entry.id === id);
    if (!line) return sum;
    return (
      sum +
      lineNetCents({
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        discountCents: line.discountCents,
      })
    );
  }, 0);
}

export type QuoteTotals = {
  subtotal: number;
  discount: number;
  net: number;
  marginCents: number;
  vat: number;
  gross: number;
};

export function computeQuoteTotals(
  lines: QuoteLineRow[],
  marginPercent = 0,
): QuoteTotals {
  const leafLines = getLeafLines(lines);
  let net = 0;
  let vat = 0;
  let discount = 0;

  for (const line of leafLines) {
    discount += line.discountCents || 0;
    const lineNet = lineNetCents({
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      discountCents: line.discountCents,
    });
    net += lineNet;
    vat += lineVatCents(lineNet, line.vatRateBps);
  }

  const marginCents =
    marginPercent > 0 ? Math.round((net * marginPercent) / 100) : 0;
  const marginVat =
    marginCents > 0 ? Math.round((marginCents * 2100) / 10_000) : 0;

  const grossBeforeDiscount = net + discount;
  return {
    subtotal: grossBeforeDiscount,
    discount,
    net: net + marginCents,
    marginCents,
    vat: vat + marginVat,
    gross: net + marginCents + vat + marginVat,
  };
}

export function updateLineInTree(
  lines: QuoteLineRow[],
  lineId: string,
  patch: Partial<QuoteLineRow>,
) {
  return lines.map((line) =>
    line.id === lineId ? { ...line, ...patch } : line,
  );
}

export function deleteLineFromTree(lines: QuoteLineRow[], lineId: string) {
  const removeIds = new Set(collectDescendants(lines, lineId));
  return lines.filter((line) => !removeIds.has(line.id));
}

export function addLineToTree(
  lines: QuoteLineRow[],
  parentId: string | null,
  asSection = false,
) {
  const siblings = lines.filter((line) => line.parentId === parentId);
  const sortOrder =
    siblings.length > 0
      ? Math.max(...siblings.map((line) => line.sortOrder)) + 1
      : 0;
  const line = asSection
    ? createSectionLine({ parentId, sortOrder })
    : createQuoteLine({ parentId, sortOrder });
  return [...lines, line];
}

export function billableLines(lines: QuoteLineRow[]) {
  return lines.filter((line) => {
    if (line.lineType === "section" || isSectionLine(line, lines)) {
      return childrenOf(lines, line.id).length > 0 || line.title.trim().length > 0;
    }
    if (line.lineType === "text") {
      return line.title.trim().length > 0 || Boolean(line.description?.trim());
    }
    return line.title.trim().length > 0;
  });
}

export function reorderSiblings(
  lines: QuoteLineRow[],
  parentId: string | null,
  orderedIds: string[],
): QuoteLineRow[] {
  const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
  return lines.map((line) => {
    if (line.parentId !== parentId) return line;
    const next = orderMap.get(line.id);
    return next === undefined ? line : { ...line, sortOrder: next };
  });
}

export function duplicateLineInTree(
  lines: QuoteLineRow[],
  lineId: string,
): QuoteLineRow[] {
  const source = lines.find((line) => line.id === lineId);
  if (!source) return lines;
  const siblings = lines.filter((line) => line.parentId === source.parentId);
  const sortOrder =
    siblings.length > 0
      ? Math.max(...siblings.map((line) => line.sortOrder)) + 1
      : 0;
  const copy: QuoteLineRow = {
    ...source,
    id: crypto.randomUUID(),
    title: source.title ? `${source.title} (kopie)` : "",
    sortOrder,
  };
  return [...lines, copy];
}
