"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: Record<string, unknown>[];
  }
}

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Bind GA4 to the authenticated Supabase user id (UUID only — never email/name).
 * See docs/ANALYTICS_ATTRIBUTION.md for the privacy rationale.
 */
export function GaUserIdLinker() {
  useEffect(() => {
    if (!measurementId) return;

    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user || typeof window.gtag !== "function") return;

      window.gtag("config", measurementId, {
        user_id: user.id,
        send_page_view: false,
      });
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (typeof window.gtag !== "function") return;
      if (session?.user?.id) {
        window.gtag("config", measurementId, {
          user_id: session.user.id,
          send_page_view: false,
        });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
