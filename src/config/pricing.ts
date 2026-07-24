/**
 * Subscription pricing (amounts in euro cents).
 * Keep in sync with Stripe Prices and messages/pricing.
 */
export const PRICING = {
  currency: "eur",
  baseMonthlyCents: 5900,
  officeSeatMonthlyCents: 2500,
  fieldSeatMonthlyCents: 1500,
  trialDays: 14,
} as const;

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

export function formatEurFromCents(cents: number, locale = "nl-NL"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
