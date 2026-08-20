"use client";

import { Suspense } from "react";

import { GaUserIdLinker } from "@/components/analytics/ga-user-id-linker";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";

export function AnalyticsProvider() {
  return (
    <>
      <GoogleAnalytics />
      <GaUserIdLinker />
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
    </>
  );
}
