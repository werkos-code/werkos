export const INVOICE_VAT_PRESETS = [
  { bps: 2100, label: "21%" },
  { bps: 900, label: "9%" },
  { bps: 0, label: "0%" },
] as const;

export const INVOICE_PAYMENT_TERMS_OPTIONS = [
  0, 7, 14, 30, 45, 60, 90,
] as const;

export type InvoiceSettings = {
  numberPrefix: string;
  numberIncludeYear: boolean;
  numberPad: number;
  fromEmail: string | null;
  defaultPaymentTermsDays: number;
  defaultVatRateBps: number;
  defaultNotes: string | null;
  reminderDaysAfterDue: number | null;
};

export type InvoiceSettingsLetterhead = {
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
  logoUrl: string | null;
};

export const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  numberPrefix: "INV",
  numberIncludeYear: true,
  numberPad: 4,
  fromEmail: null,
  defaultPaymentTermsDays: 30,
  defaultVatRateBps: 2100,
  defaultNotes: null,
  reminderDaysAfterDue: null,
};

export function formatInvoiceNumberPreview(
  settings: Pick<
    InvoiceSettings,
    "numberPrefix" | "numberIncludeYear" | "numberPad"
  >,
  sequence = 1,
  year = new Date().getFullYear(),
) {
  const prefix = settings.numberPrefix.trim().toUpperCase() || "INV";
  const pad = Math.min(8, Math.max(2, settings.numberPad || 4));
  const num = String(Math.max(1, sequence)).padStart(pad, "0");
  if (settings.numberIncludeYear) {
    return `${prefix}-${year}-${num}`;
  }
  return `${prefix}-${num}`;
}

export function normalizeInvoiceNumberPrefix(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}
