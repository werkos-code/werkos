"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { OrgAccess } from "@/features/billing/lib/entitlements";

const TRIAL_EXPIRED_DISMISS_KEY = "werkos.trialExpiredDismissed";

type OrgAccessContextValue = {
  access: OrgAccess;
  openPaywall: (contextKey?: string) => void;
  paywallOpen: boolean;
  paywallContextKey: string | null;
  closePaywall: () => void;
  trialExpiredOpen: boolean;
  dismissTrialExpired: () => void;
};

const OrgAccessContext = createContext<OrgAccessContextValue | null>(null);

export function OrgAccessProvider({
  access,
  children,
}: {
  access: OrgAccess;
  children: React.ReactNode;
}) {
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallContextKey, setPaywallContextKey] = useState<string | null>(
    null,
  );
  const [trialExpiredOpen, setTrialExpiredOpen] = useState(false);

  useEffect(() => {
    if (!access.isTrialExpired || access.canWrite) {
      if (access.canWrite) {
        try {
          window.localStorage.removeItem(TRIAL_EXPIRED_DISMISS_KEY);
        } catch {
          /* ignore */
        }
      }
      return;
    }
    try {
      const dismissed = window.localStorage.getItem(TRIAL_EXPIRED_DISMISS_KEY);
      if (dismissed !== "1") {
        setTrialExpiredOpen(true);
      }
    } catch {
      setTrialExpiredOpen(true);
    }
  }, [access.isTrialExpired, access.canWrite]);

  const openPaywall = useCallback((contextKey?: string) => {
    setPaywallContextKey(contextKey ?? null);
    setPaywallOpen(true);
  }, []);

  const closePaywall = useCallback(() => {
    setPaywallOpen(false);
    setPaywallContextKey(null);
  }, []);

  const dismissTrialExpired = useCallback(() => {
    setTrialExpiredOpen(false);
    try {
      window.localStorage.setItem(TRIAL_EXPIRED_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const original = window.fetch.bind(window);
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await original(...args);
      if (response.status === 402) {
        try {
          const body = (await response.clone().json()) as {
            error?: string;
            code?: string;
          };
          if (
            body.code === "subscription_required" ||
            body.error === "subscription_required"
          ) {
            openPaywall();
          }
        } catch {
          /* ignore non-json */
        }
      }
      return response;
    };
    return () => {
      window.fetch = original;
    };
  }, [openPaywall]);

  useEffect(() => {
    const onEvent = () => openPaywall();
    window.addEventListener("werkos:subscription-required", onEvent);
    return () => {
      window.removeEventListener("werkos:subscription-required", onEvent);
    };
  }, [openPaywall]);

  const value = useMemo(
    () => ({
      access,
      openPaywall,
      paywallOpen,
      paywallContextKey,
      closePaywall,
      trialExpiredOpen,
      dismissTrialExpired,
    }),
    [
      access,
      openPaywall,
      paywallOpen,
      paywallContextKey,
      closePaywall,
      trialExpiredOpen,
      dismissTrialExpired,
    ],
  );

  return (
    <OrgAccessContext.Provider value={value}>
      {children}
    </OrgAccessContext.Provider>
  );
}

export function useOrgAccess() {
  const ctx = useContext(OrgAccessContext);
  if (!ctx) {
    throw new Error("useOrgAccess must be used within OrgAccessProvider");
  }
  return ctx;
}

/** Soft optional hook when provider may be absent (e.g. platform-only). */
export function useOrgAccessOptional() {
  return useContext(OrgAccessContext);
}
