import {
  lineNetCents,
  lineVatCents,
} from "@/features/quotes/lib/quote-status";
import type { QuoteLineRow } from "@/features/quotes/quotes-actions";

export type { QuoteLineRow };

export function formatEuro(cents: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function createQuoteLine(
  partial?: Partial<QuoteLineRow>,
): QuoteLineRow {
  return {
    id: crypto.randomUUID(),
    parentId: null,
    sortOrder: partial?.sortOrder ?? 0,
    title: "",
    description: null,
    quantity: 1,
    unit: "st",
    unitPriceCents: 0,
    vatRateBps: 2100,
    discountCents: 0,
    estimatedMinutes: null,
    ...partial,
  };
}

export function createSectionLine(
  partial?: Partial<QuoteLineRow>,
): QuoteLineRow {
  return createQuoteLine({
    title: "",
    quantity: null,
    unit: null,
    unitPriceCents: null,
    estimatedMinutes: null,
    ...partial,
  });
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

/** Lines to persist — sections with children, or leaves with a title. */
export function billableLines(lines: QuoteLineRow[]) {
  return lines.filter((line) => {
    if (isSectionLine(line, lines)) {
      return childrenOf(lines, line.id).length > 0 || line.title.trim().length > 0;
    }
    return line.title.trim().length > 0;
  });
}
