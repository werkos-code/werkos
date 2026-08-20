export {
  ANALYTICS_EVENTS,
  APP_BUSINESS_EVENTS,
  type AnalyticsEventName,
  type AppBusinessEventName,
} from "@/lib/analytics/events";

export {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_COOKIE_MAX_AGE_SECONDS,
  ATTRIBUTION_PARAMS,
  deriveAcquisitionSource,
  hasAttributionSignal,
  mergeFirstTouchAttribution,
  parseAttributionCookie,
  parseAttributionFromSearchParams,
  serializeAttributionCookie,
  type AttributionPayload,
  type AttributionParam,
} from "@/lib/analytics/attribution";

export {
  trackBusinessEvent,
  readAttributionFromCookies,
  claimAnalyticsEvent,
} from "@/lib/analytics/track-business-event";

export {
  persistFirstTouchAttribution,
  markProfileTimestamp,
} from "@/lib/analytics/persist-attribution";

export {
  maybeTrackFirstProjectCreated,
  maybeTrackFirstQuoteCreated,
  maybeTrackSubscriptionStarted,
} from "@/lib/analytics/first-conversions";
