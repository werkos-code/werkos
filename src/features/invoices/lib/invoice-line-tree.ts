import type { InvoiceLineRow } from "@/features/invoices/lib/invoice-lines";
import {
  lineNetCents,
  lineVatCents,
} from "@/features/invoices/lib/invoice-pricing";

export function isPricedInvoiceLine(line: InvoiceLineRow) {
  return !line.isGroup;
}

export function sortInvoiceLines(lines: InvoiceLineRow[]) {
  return [...lines].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function rootInvoiceLines(lines: InvoiceLineRow[]) {
  return sortInvoiceLines(lines.filter((line) => !line.parentId));
}

export function childrenOfInvoiceLine(
  lines: InvoiceLineRow[],
  parentId: string,
) {
  return sortInvoiceLines(lines.filter((line) => line.parentId === parentId));
}

export function groupSubtotalCents(
  lines: InvoiceLineRow[],
  groupId: string,
): number {
  return childrenOfInvoiceLine(lines, groupId).reduce(
    (sum, line) =>
      sum +
      lineNetCents({
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        discountCents: line.discountCents,
      }),
    0,
  );
}

export function groupVatCents(lines: InvoiceLineRow[], groupId: string): number {
  return childrenOfInvoiceLine(lines, groupId).reduce((sum, line) => {
    const net = lineNetCents({
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      discountCents: line.discountCents,
    });
    return sum + lineVatCents(net, line.vatRateBps);
  }, 0);
}

/** Reorder siblings that share the same parentId (null = roots). */
export function reorderInvoiceSiblings(
  lines: InvoiceLineRow[],
  parentId: string | null,
  activeId: string,
  overId: string,
): InvoiceLineRow[] {
  const siblings = sortInvoiceLines(
    lines.filter((line) => (line.parentId ?? null) === parentId),
  );
  const from = siblings.findIndex((line) => line.id === activeId);
  const to = siblings.findIndex((line) => line.id === overId);
  if (from < 0 || to < 0 || from === to) return lines;

  const nextSiblings = [...siblings];
  const [moved] = nextSiblings.splice(from, 1);
  if (!moved) return lines;
  nextSiblings.splice(to, 0, moved);

  const orderById = new Map(
    nextSiblings.map((line, index) => [line.id, index] as const),
  );

  return lines.map((line) => {
    const nextOrder = orderById.get(line.id);
    if (nextOrder === undefined) return line;
    return { ...line, sortOrder: nextOrder };
  });
}
