"use client";

import type { ComponentProps } from "react";

import { useOrgAccessOptional } from "@/features/billing/components/org-access-provider";
import { Link } from "@/i18n/navigation";

type WriteGateLinkProps = ComponentProps<typeof Link> & {
  /** i18n context key under billing.paywall.contexts */
  paywallContext?: string;
};

/**
 * Link that opens the subscription paywall when the org is read-only.
 */
export function WriteGateLink({
  paywallContext = "generic",
  onClick,
  href,
  children,
  ...props
}: WriteGateLinkProps) {
  const orgAccess = useOrgAccessOptional();
  const canWrite = orgAccess?.access.canWrite ?? true;

  if (canWrite) {
    return (
      <Link href={href} onClick={onClick} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <a
      href={typeof href === "string" ? href : "#"}
      {...props}
      onClick={(event) => {
        event.preventDefault();
        orgAccess?.openPaywall(paywallContext);
        onClick?.(event as never);
      }}
    >
      {children}
    </a>
  );
}
