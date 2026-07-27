import type { QuoteStatus } from "@/types/database";

export type QuoteLineType =
  | "article"
  | "hours"
  | "labor"
  | "text"
  | "section";

export const QUOTE_LINE_TYPES: QuoteLineType[] = [
  "article",
  "hours",
  "labor",
  "text",
  "section",
];

export type QuoteLineRow = {
  id: string;
  parentId: string | null;
  sortOrder: number;
  title: string;
  description: string | null;
  lineType: QuoteLineType;
  articleId: string | null;
  quantity: number | null;
  unit: string | null;
  unitPriceCents: number | null;
  costPriceCents: number | null;
  vatRateBps: number;
  discountCents: number;
  estimatedMinutes: number | null;
};

export type QuoteListItem = {
  id: string;
  title: string;
  status: QuoteStatus;
  projectId: string;
  projectName: string;
  updatedAt: string;
  validUntil: string | null;
};

export type QuoteDetail = {
  id: string;
  title: string;
  status: QuoteStatus;
  quoteNumber: string | null;
  projectId: string;
  projectName: string;
  organizationName: string | null;
  organization: {
    name: string;
    address: string | null;
    postalCode: string | null;
    city: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
    kvkNumber: string | null;
    vatNumber: string | null;
    iban: string | null;
  } | null;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  validUntil: string | null;
  paymentTermsDays: number | null;
  paymentConditions: string | null;
  internalNotes: string | null;
  externalNotes: string | null;
  createdAt: string;
  lines: QuoteLineRow[];
};
