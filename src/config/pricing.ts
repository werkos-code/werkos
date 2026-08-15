/**
 * Subscription pricing (amounts in euro cents).
 * Keep in sync with Stripe Prices and messages/pricing.
 */
export const PRICING = {
  currency: "eur",
  baseMonthlyCents: 5900,
  officeSeatMonthlyCents: 2500,
  fieldSeatMonthlyCents: 1500,
  /** Yearly prepaid amounts (recurring yearly in Stripe). */
  baseYearlyCents: 58800,
  officeSeatYearlyCents: 24000,
  fieldSeatYearlyCents: 12000,
  /** Marketing discount vs monthly when paying yearly (~17%). */
  yearlyDiscountPercent: 17,
  trialDays: 14,
} as const;

export type BillingInterval = "month" | "year";

export function calculateMonthlyTotalCents(
  officeSeats: number,
  fieldSeats: number,
): number {
  return (
    PRICING.baseMonthlyCents +
    officeSeats * PRICING.officeSeatMonthlyCents +
    fieldSeats * PRICING.fieldSeatMonthlyCents
  );
}

export function calculateYearlyTotalCents(
  officeSeats: number,
  fieldSeats: number,
): number {
  return (
    PRICING.baseYearlyCents +
    officeSeats * PRICING.officeSeatYearlyCents +
    fieldSeats * PRICING.fieldSeatYearlyCents
  );
}

/** Effective monthly rate when paying yearly (for display). */
export function calculateYearlyMonthlyEquivalentCents(
  officeSeats: number,
  fieldSeats: number,
): number {
  return Math.round(calculateYearlyTotalCents(officeSeats, fieldSeats) / 12);
}

export function calculateTotalCents(
  interval: BillingInterval,
  officeSeats: number,
  fieldSeats: number,
): number {
  return interval === "year"
    ? calculateYearlyTotalCents(officeSeats, fieldSeats)
    : calculateMonthlyTotalCents(officeSeats, fieldSeats);
}

export function formatEurFromCents(cents: number, locale = "nl-NL"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
