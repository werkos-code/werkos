import type { SubscriptionStatus } from "@/types/database";

export type OrgAccessMode = "full" | "read_only";

export type OrgAccess = {
  mode: OrgAccessMode;
  status: SubscriptionStatus | "missing";
  trialEndsAt: string | null;
  /** Whole days remaining in trial (≥0). Null when not in an active trial window. */
  trialDaysRemaining: number | null;
  isTrialing: boolean;
  isTrialExpired: boolean;
  canWrite: boolean;
};

export function resolveOrgAccess(input: {
  status: SubscriptionStatus | null | undefined;
  trialEndsAt: string | null | undefined;
}): OrgAccess {
  const status = input.status ?? "missing";
  const trialEndsAt = input.trialEndsAt ?? null;
  const now = Date.now();
  const trialEndMs = trialEndsAt ? Date.parse(trialEndsAt) : NaN;
  const hasValidTrialEnd = Number.isFinite(trialEndMs);
  const trialActive =
    status === "trialing" &&
    (!hasValidTrialEnd || trialEndMs > now);
  const trialExpired =
    status === "trialing" && hasValidTrialEnd && trialEndMs <= now;

  let trialDaysRemaining: number | null = null;
  if (status === "trialing" && hasValidTrialEnd && trialEndMs > now) {
    trialDaysRemaining = Math.max(
      0,
      Math.ceil((trialEndMs - now) / (24 * 60 * 60 * 1000)),
    );
  }

  const isPaid =
    status === "active" ||
    status === "past_due"; /* grace: keep writing while Stripe collects */

  const canWrite = isPaid || trialActive;
  const mode: OrgAccessMode = canWrite ? "full" : "read_only";

  return {
    mode,
    status,
    trialEndsAt,
    trialDaysRemaining,
    isTrialing: status === "trialing" && !trialExpired,
    isTrialExpired: trialExpired || !canWrite,
    canWrite,
  };
}
