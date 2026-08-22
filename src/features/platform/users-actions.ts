"use server";

import { PRICING } from "@/config/pricing";
import {
  ORGANIZATION_ROLES,
  USER_ROLES,
  type OrganizationRole,
  type UserRole,
} from "@/config/roles";
import { uniqueOrganizationSlug } from "@/features/onboarding/lib/slug";
import { assertCallerIsSuperAdmin } from "@/features/platform/lib/platform-auth";
import { createAdminClient } from "@/lib/supabase/admin";

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

export type PlatformUserDetail = PlatformUserRow & {
  signupAt: string | null;
  companyCreatedAt: string | null;
  firstProjectAt: string | null;
  firstQuoteAt: string | null;
  subscriptionStartedAt: string | null;
  firstTouchAt: string | null;
  gclid: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

export type PlatformOrganizationOption = {
  id: string;
  name: string;
};

function mapPlatformUsers(
  authUsers: Array<{ id: string; email?: string; created_at: string }>,
  profiles: Array<{
    id: string;
    full_name: string | null;
    platform_role: "super_admin" | null;
  }> | null,
  memberships: unknown,
): PlatformUserRow[] {
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p] as const));

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
  for (const row of (memberships ?? []) as MembershipJoin[]) {
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

  const users: PlatformUserRow[] = authUsers.map((authUser) => {
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
  return users;
}

/** Single gate + parallel load for the platform users page. */
export async function loadPlatformUsersPage(): Promise<{
  users?: PlatformUserRow[];
  organizations?: PlatformOrganizationOption[];
  error?: string;
}> {
  const gate = await assertCallerIsSuperAdmin();
  if ("error" in gate && gate.error) return { error: gate.error };

  const admin = createAdminClient();
  const [
    { data: authData, error: authError },
    { data: profiles },
    { data: memberships },
    { data: organizations, error: orgsError },
  ] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 200 }),
    admin.from("profiles").select("id, full_name, platform_role, created_at"),
    admin
      .from("organization_memberships")
      .select("user_id, role, organization_id, organizations(id, name)"),
    admin.from("organizations").select("id, name").order("name"),
  ]);

  if (authError) return { error: authError.message };
  if (orgsError) return { error: orgsError.message };

  return {
    users: mapPlatformUsers(authData.users ?? [], profiles, memberships),
    organizations: organizations ?? [],
  };
}

export async function listPlatformUsers(): Promise<{
  users?: PlatformUserRow[];
  error?: string;
}> {
  const result = await loadPlatformUsersPage();
  if (result.error) return { error: result.error };
  return { users: result.users };
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
      trial_ends_at: new Date(
        Date.now() + PRICING.trialDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
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

export async function loadPlatformUserDetail(
  userId: string,
): Promise<{ user?: PlatformUserDetail; error?: string }> {
  const gate = await assertCallerIsSuperAdmin();
  if ("error" in gate && gate.error) return { error: gate.error };

  const trimmedId = userId.trim();
  if (!trimmedId) return { error: "invalid_input" };

  const admin = createAdminClient();

  const [
    authUserResult,
    { data: profile, error: profileError },
    { data: memberships, error: membershipError },
  ] = await Promise.all([
    admin.auth.admin.getUserById(trimmedId),
    admin
      .from("profiles")
      .select(
        "id, full_name, platform_role, signup_at, company_created_at, first_project_at, first_quote_at, subscription_started_at, first_touch_at, gclid, utm_source, utm_medium, utm_campaign",
      )
      .eq("id", trimmedId)
      .maybeSingle(),
    admin
      .from("organization_memberships")
      .select("organization_id, role")
      .eq("user_id", trimmedId),
  ]);

  if (authUserResult.error || !authUserResult.data.user) {
    return { error: "not_found" };
  }
  if (profileError) return { error: profileError.message };
  if (membershipError) return { error: membershipError.message };

  const organizationIds = [
    ...new Set((memberships ?? []).map((row) => row.organization_id)),
  ];
  const { data: organizations, error: orgError } =
    organizationIds.length > 0
      ? await admin.from("organizations").select("id, name").in("id", organizationIds)
      : { data: [], error: null };

  if (orgError) return { error: orgError.message };

  const orgNameById = new Map(
    (organizations ?? []).map((org) => [org.id, org.name] as const),
  );

  const mappedMemberships: PlatformUserRow["memberships"] = (memberships ?? [])
    .map((row) => {
      const organizationName = orgNameById.get(row.organization_id);
      if (!organizationName) return null;
      return {
        organizationId: row.organization_id,
        organizationName,
        role: row.role as OrganizationRole,
      };
    })
    .filter((row): row is PlatformUserRow["memberships"][number] => row !== null);

  mappedMemberships.sort((a, b) =>
    a.organizationName.localeCompare(b.organizationName, "nl"),
  );

  const authUser = authUserResult.data.user;

  return {
    user: {
      id: authUser.id,
      email: authUser.email ?? "",
      fullName: profile?.full_name ?? null,
      platformRole: (profile?.platform_role ?? null) as "super_admin" | null,
      createdAt: authUser.created_at,
      memberships: mappedMemberships,
      signupAt: profile?.signup_at ?? null,
      companyCreatedAt: profile?.company_created_at ?? null,
      firstProjectAt: profile?.first_project_at ?? null,
      firstQuoteAt: profile?.first_quote_at ?? null,
      subscriptionStartedAt: profile?.subscription_started_at ?? null,
      firstTouchAt: profile?.first_touch_at ?? null,
      gclid: profile?.gclid ?? null,
      utmSource: profile?.utm_source ?? null,
      utmMedium: profile?.utm_medium ?? null,
      utmCampaign: profile?.utm_campaign ?? null,
    },
  };
}
