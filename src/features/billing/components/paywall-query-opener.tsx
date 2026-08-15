"use client";

import { useEffect } from "react";

import { useOrgAccessOptional } from "@/features/billing/components/org-access-provider";
import { usePathname, useRouter } from "@/i18n/navigation";

/** Opens paywall when landed via `?paywall=1` (e.g. blocked create routes). */
export function PaywallQueryOpener() {
  const orgAccess = useOrgAccessOptional();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("paywall") !== "1") return;
    orgAccess?.openPaywall("newProject");
    params.delete("paywall");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname);
  }, [orgAccess, pathname, router]);

  return null;
}
