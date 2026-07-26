"use server";

import {
  ORGANIZATION_ROLES,
  USER_ROLES,
  type OrganizationRole,
  type UserRole,
} from "@/config/roles";
import { uniqueOrganizationSlug } from "@/features/onboarding/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PlatformUserRow = {
  id: string;
  email: string;
  fullName: string | null;
  platformRole: "super_admin" | null;
  createdAt: string;
  memberships: Array<{
    organizationId: string;
    organizationName: string;
    role: OrganizationRole;
  }>;
};

export type PlatformOrganizationOption = {
  id: string;
  name: string;
};

async function assertCallerIsSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.platform_role !== USER_ROLES.SUPER_ADMIN) {
    return { error: "forbidden" as const };
  }

  return { user };
}

export async function listPlatformUsers(): Promise<{
  users?: PlatformUserRow[];
  error?: string;
}> {
  const gate = await assertCallerIsSuperAdmin();
  if ("error" in gate && gate.error) return { error: gate.error };

  const admin = createAdminClient();

  const [{ data: authData, error: authError }, { data: profiles }, { data: memberships }] =
    await Promise.all([
      admin.auth.admin.listUsers({ perPage: 200 }),
      admin.from("profiles").select("id, full_name, platform_role, created_at"),
      admin
        .from("organization_memberships")
        .select("user_id, role, organization_id, organizations(id, name)"),
    ]);

  if (authError) return { error: authError.message };

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p] as const),
  );

  type MembershipJoin = {
    user_id: string;
    role: OrganizationRole;
    organization_id: string;
    organizations:
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null;
  };

  const membershipsByUser = new Map<string, PlatformUserRow["memberships"]>();
  for (const row of (memberships ?? []) as unknown as MembershipJoin[]) {
    const org = Array.isArray(row.organizations)
      ? row.organizations[0]
      : row.organizations;
    if (!org) continue;
    const list = membershipsByUser.get(row.user_id) ?? [];
    list.push({
      organizationId: org.id,
      organizationName: org.name,
      role: row.role,
    });
    membershipsByUser.set(row.user_id, list);
  }

  const users: PlatformUserRow[] = (authData.users ?? []).map((authUser) => {
    const profile = profileById.get(authUser.id);
    return {
      id: authUser.id,
      email: authUser.email ?? "",
      fullName: profile?.full_name ?? null,
      platformRole: (profile?.platform_role ?? null) as "super_admin" | null,
      createdAt: authUser.created_at,
      memberships: membershipsByUser.get(authUser.id) ?? [],
    };
  });

  users.sort((a, b) => a.email.localeCompare(b.email, "nl"));

  return { users };
}

export async function listOrganizationsForAdmin(): Promise<{
  organizations?: PlatformOrganizationOption[];
  error?: string;
}> {
  const gate = await assertCallerIsSuperAdmin();
  if ("error" in gate && gate.error) return { error: gate.error };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("id, name")
    .order("name");

  if (error) return { error: error.message };
  return { organizations: data ?? [] };
}

export async function createPlatformUser(input: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const gate = await assertCallerIsSuperAdmin();
  if ("error" in gate && gate.error) return { error: gate.error };

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!fullName || !email || password.length < 8) {
    return { error: "invalid_input" };
  }

  const admin = createAdminClient();

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (createError || !created.user) {
    return { error: createError?.message ?? "create_failed" };
  }

  const userId = created.user.id;

  if (input.role === USER_ROLES.SUPER_ADMIN) {
    const { error } = await admin.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      platform_role: USER_ROLES.SUPER_ADMIN,
    });
    if (error) return { error: error.message };
    return { success: true };
  }

  if (!ORGANIZATION_ROLES.includes(input.role as OrganizationRole)) {
    return { error: "invalid_role" };
  }

  const orgRole = input.role as OrganizationRole;

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    platform_role: null,
  });
  if (profileError) return { error: profileError.message };

  let organizationId = input.organizationId?.trim() || "";

  if (orgRole === USER_ROLES.OWNER) {
    const companyName = input.organizationName?.trim();
    if (!companyName) return { error: "organization_name_required" };

    const slug = await uniqueOrganizationSlug(companyName);
    const { data: organization, error: orgError } = await admin
      .from("organizations")
      .insert({
        name: companyName,
        slug,
        created_by: userId,
      })
      .select("id")
      .single();

    if (orgError || !organization) {
      return { error: orgError?.message ?? "org_create_failed" };
    }

    organizationId = organization.id;

    const { error: subError } = await admin.from("subscriptions").insert({
      organization_id: organizationId,
      status: "trialing",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      office_seats: 0,
      field_seats: 0,
    });
    if (subError) return { error: subError.message };
  } else if (!organizationId) {
    return { error: "organization_required" };
  }

  const { error: membershipError } = await admin
    .from("organization_memberships")
    .insert({
      organization_id: organizationId,
      user_id: userId,
      role: orgRole,
    });

  if (membershipError) return { error: membershipError.message };

  return { success: true };
}

export async function deletePlatformUser(
  userId: string,
): Promise<{ error?: string; success?: boolean }> {
  const gate = await assertCallerIsSuperAdmin();
  if ("error" in gate && gate.error) return { error: gate.error };

  if (!userId.trim()) return { error: "invalid_input" };

  if (gate.user.id === userId) {
    return { error: "cannot_delete_self" };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("platform_role")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.platform_role === USER_ROLES.SUPER_ADMIN) {
    return { error: "cannot_delete_super_admin" };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  return { success: true };
}
