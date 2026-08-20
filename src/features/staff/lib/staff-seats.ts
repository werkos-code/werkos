import { USER_ROLES } from "@/config/roles";
import type { StaffAssignableRole } from "@/features/staff/lib/staff-roles";
import type { SubscriptionStatus } from "@/types/database";

export type StaffSeatKind = "office" | "field";

export type StaffSeatUsage = {
  status: SubscriptionStatus | "missing";
  officeSeats: number;
  fieldSeats: number;
  officeUsed: number;
  fieldUsed: number;
  officeRemaining: number;
  fieldRemaining: number;
  hasStripeSubscription: boolean;
  isTrialing: boolean;
  isPaid: boolean;
};

export function seatKindForRole(role: StaffAssignableRole): StaffSeatKind {
  return role === USER_ROLES.OFFICE_EMPLOYEE ? "office" : "field";
}

export function remainingForKind(usage: StaffSeatUsage, kind: StaffSeatKind) {
  return kind === "office" ? usage.officeRemaining : usage.fieldRemaining;
}

export function buildStaffSeatUsage(input: {
  status: SubscriptionStatus | "missing" | null | undefined;
  officeSeats: number;
  fieldSeats: number;
  officeUsed: number;
  fieldUsed: number;
  stripeSubscriptionId?: string | null;
}): StaffSeatUsage {
  const officeSeats = Math.max(0, input.officeSeats);
  const fieldSeats = Math.max(0, input.fieldSeats);
  const officeUsed = Math.max(0, input.officeUsed);
  const fieldUsed = Math.max(0, input.fieldUsed);
  const status = input.status ?? "missing";

  return {
    status,
    officeSeats,
    fieldSeats,
    officeUsed,
    fieldUsed,
    officeRemaining: Math.max(0, officeSeats - officeUsed),
    fieldRemaining: Math.max(0, fieldSeats - fieldUsed),
    hasStripeSubscription: Boolean(input.stripeSubscriptionId),
    isTrialing: status === "trialing",
    isPaid: status === "active" || status === "past_due",
  };
}
