"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Client page_view for SPA route changes (marketing site owns top-of-funnel page_view).
 * Useful for in-app path analysis; business conversions are server-side.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const search = searchParams?.toString();
    const pagePath = search ? `${pathname}?${search}` : pathname;

    const props = {
      page_path: pagePath,
      page_title: document.title,
      page_location: window.location.href,
    };

    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event: ANALYTICS_EVENTS.pageView, ...props });

    if (typeof window.gtag === "function") {
      window.gtag("event", ANALYTICS_EVENTS.pageView, props);
    }
  }, [pathname, searchParams]);

  return null;
}
