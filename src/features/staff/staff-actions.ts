"use server";

import { USER_ROLES, type OrganizationRole } from "@/config/roles";
import { loadStaffSeatUsage } from "@/features/staff/lib/load-staff-seat-usage";
import type { StaffSeatUsage } from "@/features/staff/lib/staff-seats";
import { getAppSession } from "@/features/shell/lib/require-organization";
import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import { createAdminClient } from "@/lib/supabase/admin";

export type StaffMemberRow = {
  id: string;
  name: string;
  email: string | null;
  role: OrganizationRole;
  createdAt: string;
};

const STAFF_MEMBER_ROLES = [
  USER_ROLES.OWNER,
  USER_ROLES.OFFICE_EMPLOYEE,
  USER_ROLES.FIELD_EMPLOYEE,
] as const;

export async function listOrgStaffMembers(): Promise<{
  members?: StaffMemberRow[];
  canManage?: boolean;
  currentUserId?: string;
  seats?: StaffSeatUsage;
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const session = await getAppSession();
  const canManage = session?.role === USER_ROLES.OWNER;

  const [membershipsResult, seatsResult] = await Promise.all([
    ctx.supabase
      .from("organization_memberships")
      .select("user_id, role, created_at")
      .eq("organization_id", ctx.organizationId)
      .in("role", [...STAFF_MEMBER_ROLES]),
    loadStaffSeatUsage(ctx.organizationId),
  ]);

  if (membershipsResult.error) {
    return { error: membershipsResult.error.message };
  }
  if (seatsResult.error) return { error: seatsResult.error };

  const rows = membershipsResult.data ?? [];
  if (rows.length === 0) {
    return {
      members: [],
      canManage,
      currentUserId: ctx.userId,
      seats: seatsResult.usage,
    };
  }

  const userIds = rows.map((m) => m.user_id);
  const admin = createAdminClient();
  const [{ data: profiles }, authLookups] = await Promise.all([
    ctx.supabase.from("profiles").select("id, full_name").in("id", userIds),
    Promise.all(
      userIds.map(async (id) => {
        const { data, error: authError } = await admin.auth.admin.getUserById(id);
        if (authError || !data.user) return [id, null] as const;
        return [id, data.user.email ?? null] as const;
      }),
    ),
  ]);

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name?.trim() || "—"] as const),
  );
  const emailById = new Map(authLookups);

  const roleRank: Record<string, number> = {
    [USER_ROLES.OWNER]: 0,
    [USER_ROLES.OFFICE_EMPLOYEE]: 1,
    [USER_ROLES.FIELD_EMPLOYEE]: 2,
  };

  return {
    members: rows
      .map((row) => ({
        id: row.user_id,
        name: nameById.get(row.user_id) ?? "—",
        email: emailById.get(row.user_id) ?? null,
        role: row.role as OrganizationRole,
        createdAt: row.created_at,
      }))
      .sort((a, b) => {
        const rankDiff = (roleRank[a.role] ?? 9) - (roleRank[b.role] ?? 9);
        if (rankDiff !== 0) return rankDiff;
        return a.name.localeCompare(b.name, "nl");
      }),
    canManage,
    currentUserId: ctx.userId,
    seats: seatsResult.usage,
  };
}

export async function getOrgStaffMember(memberId: string): Promise<{
  member?: StaffMemberRow;
  canManage?: boolean;
  currentUserId?: string;
  seats?: StaffSeatUsage;
  error?: string;
}> {
  const result = await listOrgStaffMembers();
  if (result.error) return { error: result.error };
  const member = (result.members ?? []).find((row) => row.id === memberId);
  if (!member) return { error: "not_found" };
  return {
    member,
    canManage: result.canManage,
    currentUserId: result.currentUserId,
    seats: result.seats,
  };
}
