"use server";

import {
  ORGANIZATION_ROLES,
  USER_ROLES,
  type OrganizationRole,
} from "@/config/roles";
import { assertCallerIsSuperAdmin } from "@/features/platform/lib/platform-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/types/database";

export type PlatformAccountSubscription = {
  status: SubscriptionStatus | null;
  officeSeats: number;
  fieldSeats: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type PlatformAccountOwner = {
  id: string;
  email: string;
  fullName: string | null;
};

export type PlatformAccountRow = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  subscriptionStartedAt: string | null;
  subscription: PlatformAccountSubscription | null;
  memberCounts: Record<OrganizationRole, number>;
  totalMembers: number;
  owner: PlatformAccountOwner | null;
};

export type PlatformAccountMember = {
  userId: string;
  email: string;
  fullName: string | null;
  role: OrganizationRole;
  joinedAt: string;
};

export type PlatformOwnerAttribution = {
  gclid: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  signupAt: string | null;
  firstTouchAt: string | null;
};

export type PlatformAccountDetail = PlatformAccountRow & {
  members: PlatformAccountMember[];
  ownerAttribution: PlatformOwnerAttribution | null;
};

function emptyMemberCounts(): Record<OrganizationRole, number> {
  return {
    [USER_ROLES.OWNER]: 0,
    [USER_ROLES.OFFICE_EMPLOYEE]: 0,
    [USER_ROLES.FIELD_EMPLOYEE]: 0,
    [USER_ROLES.CUSTOMER]: 0,
  };
}

type MembershipRow = {
  organization_id: string;
  user_id: string;
  role: OrganizationRole;
  created_at: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  subscription_started_at: string | null;
};

type SubscriptionRow = {
  organization_id: string;
  status: SubscriptionStatus;
  office_seats: number;
  field_seats: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
};

function mapSubscription(
  row: SubscriptionRow | undefined,
): PlatformAccountSubscription | null {
  if (!row) return null;
  return {
    status: row.status,
    officeSeats: row.office_seats,
    fieldSeats: row.field_seats,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    trialEndsAt: row.trial_ends_at,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
  };
}

async function loadAuthEmailMap(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<Map<string, string>> {
  const emails = new Map<string, string>();
  if (userIds.length === 0) return emails;

  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error || !data.users) return emails;

  const wanted = new Set(userIds);
  for (const user of data.users) {
    if (wanted.has(user.id)) {
      emails.set(user.id, user.email ?? "");
    }
  }
  return emails;
}

function buildAccountRows(
  organizations: OrganizationRow[],
  subscriptions: SubscriptionRow[],
  memberships: MembershipRow[],
  profiles: Array<{ id: string; full_name: string | null }>,
  authEmails: Map<string, string>,
): PlatformAccountRow[] {
  const subscriptionByOrg = new Map(
    subscriptions.map((row) => [row.organization_id, row] as const),
  );
  const profileById = new Map(profiles.map((p) => [p.id, p] as const));

  const membershipsByOrg = new Map<string, MembershipRow[]>();
  for (const membership of memberships) {
    const list = membershipsByOrg.get(membership.organization_id) ?? [];
    list.push(membership);
    membershipsByOrg.set(membership.organization_id, list);
  }

  return organizations
    .map((org) => {
      const orgMemberships = membershipsByOrg.get(org.id) ?? [];
      const memberCounts = emptyMemberCounts();
      let owner: PlatformAccountOwner | null = null;

      for (const membership of orgMemberships) {
        memberCounts[membership.role] += 1;
        if (membership.role === USER_ROLES.OWNER) {
          const profile = profileById.get(membership.user_id);
          owner = {
            id: membership.user_id,
            email: authEmails.get(membership.user_id) ?? "",
            fullName: profile?.full_name ?? null,
          };
        }
      }

      const totalMembers = orgMemberships.length;

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: org.created_at,
        subscriptionStartedAt: org.subscription_started_at,
        subscription: mapSubscription(subscriptionByOrg.get(org.id)),
        memberCounts,
        totalMembers,
        owner,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

export async function loadPlatformAccountsPage(): Promise<{
  accounts?: PlatformAccountRow[];
  error?: string;
}> {
  const gate = await assertCallerIsSuperAdmin();
  if ("error" in gate && gate.error) return { error: gate.error };

  const admin = createAdminClient();
  const [
    { data: organizations, error: orgError },
    { data: subscriptions, error: subError },
    { data: memberships, error: membershipError },
    { data: profiles, error: profileError },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name, slug, created_at, subscription_started_at")
      .order("name"),
    admin.from("subscriptions").select(
      "organization_id, status, office_seats, field_seats, stripe_customer_id, stripe_subscription_id, trial_ends_at, current_period_end, cancel_at_period_end",
    ),
    admin
      .from("organization_memberships")
      .select("organization_id, user_id, role, created_at"),
    admin.from("profiles").select("id, full_name"),
  ]);

  if (orgError) return { error: orgError.message };
  if (subError) return { error: subError.message };
  if (membershipError) return { error: membershipError.message };
  if (profileError) return { error: profileError.message };

  const ownerIds = (memberships ?? [])
    .filter((m) => m.role === USER_ROLES.OWNER)
    .map((m) => m.user_id);
  const authEmails = await loadAuthEmailMap(admin, ownerIds);

  return {
    accounts: buildAccountRows(
      (organizations ?? []) as OrganizationRow[],
      (subscriptions ?? []) as SubscriptionRow[],
      (memberships ?? []) as MembershipRow[],
      profiles ?? [],
      authEmails,
    ),
  };
}

export async function loadPlatformAccountDetail(
  organizationId: string,
): Promise<{ account?: PlatformAccountDetail; error?: string }> {
  const gate = await assertCallerIsSuperAdmin();
  if ("error" in gate && gate.error) return { error: gate.error };

  const trimmedId = organizationId.trim();
  if (!trimmedId) return { error: "invalid_input" };

  const admin = createAdminClient();

  const [
    { data: organization, error: orgError },
    { data: subscription, error: subError },
    { data: memberships, error: membershipError },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name, slug, created_at, subscription_started_at")
      .eq("id", trimmedId)
      .maybeSingle(),
    admin
      .from("subscriptions")
      .select(
        "organization_id, status, office_seats, field_seats, stripe_customer_id, stripe_subscription_id, trial_ends_at, current_period_end, cancel_at_period_end",
      )
      .eq("organization_id", trimmedId)
      .maybeSingle(),
    admin
      .from("organization_memberships")
      .select("organization_id, user_id, role, created_at")
      .eq("organization_id", trimmedId),
  ]);

  if (orgError) return { error: orgError.message };
  if (subError) return { error: subError.message };
  if (membershipError) return { error: membershipError.message };
  if (!organization) return { error: "not_found" };

  const memberUserIds = (memberships ?? []).map((m) => m.user_id);
  const ownerMembership = (memberships ?? []).find(
    (m) => m.role === USER_ROLES.OWNER,
  );

  const [
    authEmails,
    profilesResult,
    { data: ownerProfile, error: ownerProfileError },
  ] = await Promise.all([
    loadAuthEmailMap(admin, memberUserIds),
    memberUserIds.length > 0
      ? admin.from("profiles").select("id, full_name").in("id", memberUserIds)
      : Promise.resolve({ data: [], error: null }),
    ownerMembership
      ? admin
          .from("profiles")
          .select(
            "gclid, utm_source, utm_medium, utm_campaign, signup_at, first_touch_at",
          )
          .eq("id", ownerMembership.user_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const { data: profiles, error: profileError } = profilesResult;

  if (profileError) return { error: profileError.message };
  if (ownerProfileError) return { error: ownerProfileError.message };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p] as const));
  const memberCounts = emptyMemberCounts();

  const members: PlatformAccountMember[] = (memberships ?? [])
    .map((membership) => {
      memberCounts[membership.role as OrganizationRole] += 1;
      const profile = profileById.get(membership.user_id);
      return {
        userId: membership.user_id,
        email: authEmails.get(membership.user_id) ?? "",
        fullName: profile?.full_name ?? null,
        role: membership.role as OrganizationRole,
        joinedAt: membership.created_at,
      };
    })
    .sort((a, b) => {
      const roleIndex = (role: OrganizationRole) =>
        ORGANIZATION_ROLES.indexOf(role);
      const byRole = roleIndex(a.role) - roleIndex(b.role);
      if (byRole !== 0) return byRole;
      return (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email, "nl");
    });

  const ownerProfileRow = ownerMembership
    ? profileById.get(ownerMembership.user_id)
    : null;

  const owner: PlatformAccountOwner | null = ownerMembership
    ? {
        id: ownerMembership.user_id,
        email: authEmails.get(ownerMembership.user_id) ?? "",
        fullName: ownerProfileRow?.full_name ?? null,
      }
    : null;

  const ownerAttribution: PlatformOwnerAttribution | null = ownerProfile
    ? {
        gclid: ownerProfile.gclid,
        utmSource: ownerProfile.utm_source,
        utmMedium: ownerProfile.utm_medium,
        utmCampaign: ownerProfile.utm_campaign,
        signupAt: ownerProfile.signup_at,
        firstTouchAt: ownerProfile.first_touch_at,
      }
    : null;

  const account: PlatformAccountDetail = {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    createdAt: organization.created_at,
    subscriptionStartedAt: organization.subscription_started_at,
    subscription: mapSubscription(
      subscription ? (subscription as SubscriptionRow) : undefined,
    ),
    memberCounts,
    totalMembers: members.length,
    owner,
    members,
    ownerAttribution,
  };

  return { account };
}
