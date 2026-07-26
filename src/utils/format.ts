/**
 * Shared formatting helpers.
 * Domain-specific formatters belong in feature modules.
 */

export function formatDate(
  value: string | Date,
  locale = "nl-NL",
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatCurrency(
  amount: number,
  currency = "EUR",
  locale = "nl-NL",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/** Format integer eurocents as currency with decimals. */
export function formatEuroFromCents(
  cents: number,
  locale = "nl-NL",
): string {
  return formatCurrency(cents / 100, "EUR", locale);
}
