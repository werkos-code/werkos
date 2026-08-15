export type InvoiceLineRow = {
  id: string;
  parentId: string | null;
  sortOrder: number;
  title: string;
  description: string | null;
  quantity: number;
  unit: string | null;
  unitPriceCents: number;
  vatRateBps: number;
  discountCents: number;
  isGroup: boolean;
};

export type BillableSourceKind = "hours" | "material" | "work_item";

export type BillableSourceLine = {
  key: string;
  source: BillableSourceKind;
  title: string;
  description: string | null;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  vatRateBps: number;
};
