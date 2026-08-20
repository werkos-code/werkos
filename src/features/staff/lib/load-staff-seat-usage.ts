import { createAdminClient } from "@/lib/supabase/admin";
import { USER_ROLES } from "@/config/roles";
import {
  buildStaffSeatUsage,
  type StaffSeatUsage,
} from "@/features/staff/lib/staff-seats";
import type { StaffAssignableRole } from "@/features/staff/lib/staff-roles";

export async function loadStaffSeatUsage(
  organizationId: string,
): Promise<{ usage?: StaffSeatUsage; error?: string }> {
  const admin = createAdminClient();

  const [subResult, membersResult] = await Promise.all([
    admin
      .from("subscriptions")
      .select(
        "status, office_seats, field_seats, stripe_subscription_id",
      )
      .eq("organization_id", organizationId)
      .maybeSingle(),
    admin
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", organizationId)
      .in("role", [
        USER_ROLES.OFFICE_EMPLOYEE,
        USER_ROLES.FIELD_EMPLOYEE,
      ]),
  ]);

  if (subResult.error) return { error: subResult.error.message };
  if (membersResult.error) return { error: membersResult.error.message };

  const officeUsed = (membersResult.data ?? []).filter(
    (row) => row.role === USER_ROLES.OFFICE_EMPLOYEE,
  ).length;
  const fieldUsed = (membersResult.data ?? []).filter(
    (row) => row.role === USER_ROLES.FIELD_EMPLOYEE,
  ).length;

  return {
    usage: buildStaffSeatUsage({
      status: subResult.data?.status,
      officeSeats: subResult.data?.office_seats ?? 0,
      fieldSeats: subResult.data?.field_seats ?? 0,
      officeUsed,
      fieldUsed,
      stripeSubscriptionId: subResult.data?.stripe_subscription_id,
    }),
  };
}

export async function countRoleMembers(
  organizationId: string,
  role: StaffAssignableRole,
): Promise<{ count?: number; error?: string }> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("organization_memberships")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("role", role);

  if (error) return { error: error.message };
  return { count: count ?? 0 };
}
