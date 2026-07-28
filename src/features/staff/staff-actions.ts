"use server";

import { USER_ROLES, type OrganizationRole } from "@/config/roles";
import { getStaffOrgContext } from "@/features/shell/lib/staff-org-context";
import { createAdminClient } from "@/lib/supabase/admin";

export type StaffMemberRow = {
  id: string;
  name: string;
  email: string | null;
  role: OrganizationRole;
};

const STAFF_MEMBER_ROLES = [
  USER_ROLES.OWNER,
  USER_ROLES.OFFICE_EMPLOYEE,
  USER_ROLES.FIELD_EMPLOYEE,
] as const;

export async function listOrgStaffMembers(): Promise<{
  members?: StaffMemberRow[];
  error?: string;
}> {
  const ctx = await getStaffOrgContext();
  if ("error" in ctx) return { error: ctx.error };

  const { data: memberships, error } = await ctx.supabase
    .from("organization_memberships")
    .select("user_id, role")
    .eq("organization_id", ctx.organizationId)
    .in("role", [...STAFF_MEMBER_ROLES]);

  if (error) return { error: error.message };

  const rows = memberships ?? [];
  if (rows.length === 0) return { members: [] };

  const userIds = rows.map((m) => m.user_id);
  const [{ data: profiles }, authUsers] = await Promise.all([
    ctx.supabase.from("profiles").select("id, full_name").in("id", userIds),
    createAdminClient().auth.admin.listUsers({ perPage: 200 }),
  ]);

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name?.trim() || "—"] as const),
  );
  const emailById = new Map(
    (authUsers.data.users ?? [])
      .filter((u) => userIds.includes(u.id))
      .map((u) => [u.id, u.email ?? null] as const),
  );

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
      }))
      .sort((a, b) => {
        const rankDiff = (roleRank[a.role] ?? 9) - (roleRank[b.role] ?? 9);
        if (rankDiff !== 0) return rankDiff;
        return a.name.localeCompare(b.name, "nl");
      }),
  };
}
