/**
 * Shared analytics event names — keep in sync with werkos.nl marketing site.
 *
 * Marketing site: page_view, cta_start_free, signup_started
 * App: sign_up → company_created → first_project_created → first_quote_created → subscription_started
 */
export const ANALYTICS_EVENTS = {
  pageView: "page_view",
  ctaStartFree: "cta_start_free",
  signupStarted: "signup_started",
  signUp: "sign_up",
  companyCreated: "company_created",
  firstProjectCreated: "first_project_created",
  firstQuoteCreated: "first_quote_created",
  subscriptionStarted: "subscription_started",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** App-owned business conversions (must come from successful DB/backend actions). */
export const APP_BUSINESS_EVENTS = [
  ANALYTICS_EVENTS.signUp,
  ANALYTICS_EVENTS.companyCreated,
  ANALYTICS_EVENTS.firstProjectCreated,
  ANALYTICS_EVENTS.firstQuoteCreated,
  ANALYTICS_EVENTS.subscriptionStarted,
] as const;

export type AppBusinessEventName = (typeof APP_BUSINESS_EVENTS)[number];
